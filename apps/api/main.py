"""Arête indicative pricing service. Run: uvicorn apps.api.main:app --reload"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

from .pricing import ALL, MODEL_VERSION, MONTHS, TICKET, atm_vol, fwd, market_by_id, price

logger = logging.getLogger("arete.api")
app = FastAPI(
    title="Arête Pricing API",
    version="1.0.0",
    description="Indicative commodity protection quotes. Curves and volatility are illustrative, not live market data.",
)

origins = [origin.strip() for origin in os.getenv("ARETE_CORS_ORIGINS", "").split(",") if origin.strip()]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Idempotency-Key"])

STARTED_AT = datetime.now(timezone.utc)
SNAPSHOTS: dict[str, dict] = {}
IDEMPOTENCY: dict[str, tuple[str, dict]] = {}
IDEMPOTENCY_LOCK = threading.Lock()


class QuoteRequest(BaseModel):
    market: str
    side: Literal["ceiling", "floor"] = "ceiling"
    structure: Literal["paid"] = "paid"
    limit: float
    cap: float | None = None
    volume_per_month: float = Field(gt=0)
    start_month: int = Field(default=1, ge=1, le=12)
    months: int = Field(default=1, ge=1, le=12)

    @model_validator(mode="after")
    def valid_strip(self):
        if self.start_month + self.months - 1 > 12:
            raise ValueError("start_month + months - 1 must not exceed 12")
        return self


def currency(symbol: str) -> str:
    return {"$": "USD", "€": "EUR", "£": "GBP"}[symbol]


def curve_points(u: dict) -> list[dict]:
    return [{
        "month": mo["label"],
        "forward": round(fwd(u, mo), u["dp"]),
        "atm_vol": round(atm_vol(u, (mo["t1"] + mo["t2"]) / 2), 4),
    } for mo in MONTHS]


def snapshot_for(u: dict) -> tuple[str, dict]:
    points = curve_points(u)
    canonical = json.dumps({"market": u["id"], "model_version": MODEL_VERSION, "points": points}, sort_keys=True)
    snapshot_id = "cs_" + hashlib.sha256(canonical.encode()).hexdigest()[:16]
    snapshot = {"id": snapshot_id, "market": u["id"], "as_of": STARTED_AT.isoformat(), "source": "illustrative", "model_version": MODEL_VERSION, "points": points}
    SNAPSHOTS[snapshot_id] = snapshot
    return snapshot_id, snapshot


@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION}


@app.get("/v1/markets")
def markets():
    return {
        "data": [{
            "id": u["id"], "name": u["name"], "benchmark": u["src"],
            "currency": currency(u["ccy"]), "unit": u["unit"],
            "model": u.get("model", "lognormal"),
            "front": round(fwd(u, MONTHS[0]), u["dp"]),
            "max_volume_per_month": u["usage"] * 100,
        } for u in ALL],
        "as_of": STARTED_AT.isoformat(),
        "data_status": "illustrative",
    }


@app.get("/v1/markets/{market_id}/curve")
def curve(market_id: str):
    u = market_by_id(market_id)
    if not u:
        raise HTTPException(404, f"Unknown market '{market_id}'")
    snapshot_id, snapshot = snapshot_for(u)
    return {"market": u["id"], "snapshot_id": snapshot_id, **snapshot}


@app.post("/v1/quotes", status_code=201)
def quote(request: QuoteRequest, idempotency_key: str = Header(min_length=8, max_length=128, alias="Idempotency-Key")):
    fingerprint = request.model_dump_json()
    with IDEMPOTENCY_LOCK:
        cached = IDEMPOTENCY.get(idempotency_key)
        if cached:
            if cached[0] != fingerprint:
                raise HTTPException(409, "Idempotency key was already used with a different request")
            return cached[1]

    u = market_by_id(request.market)
    if not u:
        raise HTTPException(422, f"Unknown market '{request.market}'")
    if u.get("model") != "normal" and request.limit <= 0:
        raise HTTPException(422, "limit must be positive for a lognormal market")
    if request.volume_per_month > u["usage"] * 100:
        raise HTTPException(422, f"volume_per_month exceeds the {u['usage'] * 100:g} limit for {u['id']}")
    if request.cap is not None:
        if request.side == "ceiling" and request.cap <= request.limit:
            raise HTTPException(422, "cap must be above limit for a ceiling")
        if request.side == "floor" and request.cap >= request.limit:
            raise HTTPException(422, "cap must be below limit for a floor")

    start = request.start_month - 1
    months = MONTHS[start:start + request.months]
    base = {
        "u": u, "dir": "up" if request.side == "ceiling" else "down",
        "q": request.volume_per_month, "ms": months, "K1": request.limit,
        "K2": request.cap, "shock": 0,
    }
    p = price(base)

    snapshot_id, _ = snapshot_for(u)
    quote_id = "qt_" + uuid.uuid4().hex[:12]
    response = {
        "id": quote_id, "object": "quote", "market": u["id"], "side": request.side,
        "structure": "paid", "limit": request.limit, "cap": request.cap,
        "volume_per_month": request.volume_per_month, "payment_timing": "upfront",
        "currency": currency(u["ccy"]), "premium": round(p["total"], 2),
        "breakdown": {"mid": round(p["mid"], 2), "spread": round(p["spread"], 2), "fees": p["fee"]},
        "payout_probability": round(p["chance"], 6),
        "months": [{"month": row["mo"]["label"], "forward": round(row["F"], u["dp"]), "premium": round(row["cost"], 2)} for row in p["per"]],
        "snapshot_id": snapshot_id, "model_version": MODEL_VERSION,
        "curve_as_of": STARTED_AT.isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat(),
        "data_status": "illustrative",
    }
    with IDEMPOTENCY_LOCK:
        IDEMPOTENCY[idempotency_key] = (fingerprint, response)
    logger.info(json.dumps({"event": "quote.created", "quote_id": quote_id, "snapshot_id": snapshot_id, "market": u["id"]}))
    return response
