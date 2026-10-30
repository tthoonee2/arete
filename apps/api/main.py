"""Arête quote API. Illustrative curves; in-memory prototype quote snapshots."""
from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

from .pricing import ALL, MODEL_VERSION, TICKET, U, month_list, price, solve_collar

app = FastAPI(title="Arête Quote API", version="0.1.0", description="Prototype commodity protection pricing. All curves are illustrative.")
origins = [origin.strip() for origin in os.getenv("ARETE_CORS_ORIGINS", "").split(",") if origin.strip()]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Idempotency-Key"])

SNAPSHOTS, IDEMPOTENCY = {}, {}
STORE_LOCK = Lock()
QUOTE_SECONDS = 60


class QuoteRequest(BaseModel):
    market_id: str
    side: Literal["buy", "sell"] = "buy"
    structure: Literal["protection", "cap", "zero_cost_collar"] = "protection"
    limit: float = Field(gt=0)
    cap: float | None = None
    volume: float = Field(gt=0)
    start_month: int = Field(default=0, ge=0, le=11)
    months: int = Field(default=12, ge=1, le=12)

    @model_validator(mode="after")
    def valid_structure(self):
        market = next((u for u in ALL if u["id"] == self.market_id), None)
        if not market:
            raise ValueError("Unknown market_id")
        if self.start_month + self.months > 12:
            raise ValueError("The requested strip exceeds the available 12-month curve")
        if self.volume > market["usage"] * 100:
            raise ValueError("Volume exceeds the prototype per-market limit")
        if market.get("model") != "normal" and self.limit <= 0:
            raise ValueError("Lognormal strikes must be positive")
        if self.structure == "cap":
            if self.cap is None:
                raise ValueError("cap is required for a capped structure")
            if self.side == "buy" and self.cap <= self.limit or self.side == "sell" and self.cap >= self.limit:
                raise ValueError("cap must be beyond the protected limit")
        return self


def canonical_request(request):
    return request.model_dump_json()


def market_public(u):
    return {key: value for key, value in u.items() if key not in {"dvol", "skew", "curv"}}


@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION, "data_status": "illustrative"}


@app.get("/v1/markets")
def markets():
    return {"markets": [market_public(u) for u in ALL], "categories": [{"id": key, "markets": [u["id"] for u in value]} for key, value in U.items()]}


@app.get("/v1/markets/{market_id}/curve")
def curve(market_id: str):
    u = next((item for item in ALL if item["id"] == market_id), None)
    if not u:
        raise HTTPException(404, "Unknown market")
    months = month_list()
    from .pricing import fwd
    return {"market_id": market_id, "as_of": datetime.now(timezone.utc), "data_status": "illustrative", "points": [{"month": mo["label"], "forward": fwd(u, mo, months)} for mo in months]}


@app.post("/v1/quotes", status_code=201)
def quote(request: QuoteRequest, idempotency_key: str = Header(min_length=8, max_length=128, alias="Idempotency-Key")):
    canonical = canonical_request(request)
    fingerprint = hashlib.sha256(canonical.encode()).hexdigest()
    with STORE_LOCK:
        previous = IDEMPOTENCY.get(idempotency_key)
        if previous:
            if previous["fingerprint"] != fingerprint:
                raise HTTPException(409, "Idempotency key was already used for a different request")
            return previous["response"]
        u = next(u for u in ALL if u["id"] == request.market_id)
        months = month_list()
        ms = months[request.start_month:request.start_month+request.months]
        base = {"u":u,"dir":"up" if request.side == "buy" else "down","q":request.volume,"ms":ms,"K1":request.limit,"K2":request.cap if request.structure == "cap" else None,"Kx":None,"shock":0}
        kx = None
        if request.structure == "zero_cost_collar":
            solved = solve_collar(base, months)
            if not solved:
                raise HTTPException(422, "No zero-cost collar exists for these inputs")
            kx, result = solved["Kx"], solved["p"]
        else:
            result = price(base, months)
        now = datetime.now(timezone.utc)
        response = {
            "quote_id": "q_" + secrets.token_urlsafe(18),
            "snapshot_id": "curve_" + hashlib.sha256(f"{u['id']}:{now.date()}".encode()).hexdigest()[:16],
            "model_version": MODEL_VERSION,
            "curve_as_of": now,
            "created_at": now,
            "expires_at": now + timedelta(seconds=QUOTE_SECONDS),
            "data_status": "illustrative",
            "request": request.model_dump(),
            "sold_strike": kx,
            "currency": u["ccy"],
            "unit": u["unit"],
            "premium": {key: result[key] for key in ["mid", "spread", "fee", "total", "monthly"]},
            "chance_of_payout": result["chance"],
            "chance_of_sold_option": result["owe"],
            "rows": result["per"],
        }
        SNAPSHOTS[response["quote_id"]] = response
        IDEMPOTENCY[idempotency_key] = {"fingerprint":fingerprint,"response":response}
        return response
