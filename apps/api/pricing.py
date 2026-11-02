"""Pure Python counterpart of packages/pricing/browser.js.

No DOM, I/O or framework dependencies. The golden suite compares 200 randomized
quotes against the JavaScript engine before the API is tested.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / "packages/pricing/markets.json").read_text())
U = DATA["U"]
CATS = DATA["CATS"]
R = DATA["R"]
CCY = DATA["CCY"]
TICKET = DATA["TICKET"]
ALL = [market for markets in U.values() for market in markets]
MODEL_VERSION = "2026.11-upfront-premium-v3"


def _round_to_step(value: float, step: float) -> float:
    return round(round(value / step) * step, 6)


for market in ALL:
    market["mult"] = 1
    if market.get("model") == "normal":
        market["lo"] = _round_to_step(market["F"] - 1.4 * market["vol0"], market["step"])
        market["hi"] = _round_to_step(market["F"] + 1.5 * market["vol0"], market["step"])
    else:
        market["lo"] = _round_to_step(market["F"] * math.exp(-1.4 * market["vol0"]), market["step"])
        market["hi"] = _round_to_step(market["F"] * math.exp(1.5 * market["vol0"]), market["step"])


def month_list(now: datetime | None = None) -> list[dict[str, Any]]:
    now = now or datetime.now(timezone.utc)
    out = []
    year, month = now.year, now.month
    for i in range(1, 13):
        absolute = year * 12 + month - 1 + i
        sy, sm = divmod(absolute, 12)
        ey, em = divmod(absolute + 1, 12)
        start = datetime(sy, sm + 1, 1, tzinfo=now.tzinfo)
        end = datetime(ey, em + 1, 1, tzinfo=now.tzinfo)
        out.append({
            "i": i,
            "cal": sm,
            "m": start.strftime("%b"),
            "y": start.strftime("%y"),
            "label": start.strftime("%b %y"),
            "t1": max((start - now).total_seconds() / 31_536_000, 1 / 365),
            "t2": (end - now).total_seconds() / 31_536_000,
        })
    return out


MONTHS = month_list()


def polevl(x: float, coefficients: list[float]) -> float:
    result = 0.0
    for coefficient in coefficients:
        result = result * x + coefficient
    return result


def p1evl(x: float, coefficients: list[float]) -> float:
    result = 1.0
    for coefficient in coefficients[:-1]:
        result = result * x + coefficient
    return result * x + coefficients[-1]


def erfc(x: float) -> float:
    if x < 0:
        return 2 - erfc(-x)
    if x < 1:
        return 1 - x * polevl(x * x, [9.60497373987051638749, 90.0260197203842689217, 2232.00534594684319226, 7003.32514112805075473, 55592.3013010394962768]) / p1evl(x * x, [33.5617141647503099647, 521.357949780152679795, 4594.32382970980127987, 22629.0000613890934246, 49267.3942608635921086])
    if x > 8:
        return 0.0
    if x < 8:
        p = [2.46196981473530512524e-10, .564189564831068821977, 7.46321056442269912687, 48.6371970985681366614, 196.520832956077098242, 526.445194995477358631, 934.52852717195760754, 1027.55188689515710272, 557.535335369399327526]
        q = [13.2281951154737992588, 86.7072140885989742329, 354.937778887819891062, 975.708501743205489753, 1823.90916687909736289, 2246.33760818710981792, 1656.66309194161350182, 557.535340817727675546]
    else:
        p = [.564189583547755073984, 1.27536670759978104416, 5.01905042251180477414, 6.16021097993053585195, 7.4097426995044893916, 2.9788666537210024067]
        q = [2.2605286322011727659, 9.39603524938001434673, 12.0489539808096656605, 17.0814450747565897222, 9.60896809063285878198, 3.3690764510008151605]
    return math.exp(-x * x) * polevl(x, p) / p1evl(x, q)


def N(x: float) -> float:
    return .5 * erfc(-x / math.sqrt(2))


def market_by_id(market_id: str) -> dict[str, Any] | None:
    return next((market for market in ALL if market["id"] == market_id), None)


def fwd(u: dict[str, Any], mo: dict[str, Any]) -> float:
    tm = (mo["t1"] + mo["t2"]) / 2

    def season(calendar_month: int) -> float:
        return 1 + u["seas"] * math.cos(2 * math.pi * calendar_month / 12)

    return u["F"] * (1 + u["slope"] * tm) * season(mo["cal"]) / season(MONTHS[0]["cal"])


def atm_vol(u: dict[str, Any], tenor: float) -> float:
    return u["volL"] + (u["vol0"] - u["volL"]) * math.exp(-tenor / .5)


def vol_at(u: dict[str, Any], forward: float, strike: float, tenor: float) -> float:
    if u.get("model") == "normal":
        return atm_vol(u, tenor)
    x = math.log(strike / forward) / math.sqrt(max(tenor, .08))
    return atm_vol(u, tenor) * min(2.5, max(.6, 1 + u["skew"] * x + u["curv"] * x * x))


def black(forward: float, strike: float, variance: float, discount: float, option_type: str) -> float:
    if strike <= 0:
        return discount * (forward - strike) if option_type == "c" else 0.0
    sigma = math.sqrt(variance)
    if sigma < 1e-9:
        return discount * max((forward - strike) if option_type == "c" else (strike - forward), 0)
    d1 = (math.log(forward / strike) + variance / 2) / sigma
    d2 = d1 - sigma
    if option_type == "c":
        return discount * (forward * N(d1) - strike * N(d2))
    return discount * (strike * N(-d2) - forward * N(-d1))


def opt_val(u: dict[str, Any], mo: dict[str, Any], forward: float, strike: float, option_type: str, bump: float = 0) -> float:
    tenor = (mo["t1"] + mo["t2"]) / 2
    sigma = max(.01, vol_at(u, forward, strike, tenor) + bump)
    variance = sigma * sigma * (mo["t1"] + (mo["t2"] - mo["t1"]) / 3)
    discount = math.exp(-R[u["ccy"]] * mo["t2"])
    if u.get("model") == "normal":
        sd = math.sqrt(variance)
        d = (forward - strike) / sd
        density = .3989422804 * math.exp(-d * d / 2)
        if option_type == "c":
            return discount * ((forward - strike) * N(d) + sd * density)
        return discount * ((strike - forward) * N(-d) + sd * density)
    return black(forward, strike, variance, discount, option_type)


def prob_above(u: dict[str, Any], mo: dict[str, Any], forward: float, strike: float) -> float:
    h = max(u["vol0"] * .005, 1e-6) if u.get("model") == "normal" else max(forward * .002, 1e-6)
    discount = math.exp(-R[u["ccy"]] * mo["t2"])
    derivative = (opt_val(u, mo, forward, strike - h, "c") - opt_val(u, mo, forward, strike + h, "c")) / (2 * h * discount)
    return min(1, max(0, derivative))


def price(s: dict[str, Any]) -> dict[str, Any]:
    """Price paid protection with an upfront premium and no customer payable at settlement."""
    u, q, months = s["u"], s["q"], s["ms"]
    up = s["dir"] == "up"
    option_type = "c" if up else "p"
    mid = ask = chance = 0.0
    vols, per = [], []
    for mo in months:
        forward = fwd(u, mo) * (1 + s.get("shock", 0))
        tenor = (mo["t1"] + mo["t2"]) / 2
        a = opt_val(u, mo, forward, s["K1"], option_type, u["dvol"])
        md = opt_val(u, mo, forward, s["K1"], option_type)
        if s.get("K2") is not None:
            a -= opt_val(u, mo, forward, s["K2"], option_type, -u["dvol"])
            md -= opt_val(u, mo, forward, s["K2"], option_type)
        ask += a * q * u["mult"]
        mid += md * q * u["mult"]
        per.append({"mo": mo, "F": forward, "cost": a * q * u["mult"] + TICKET})
        probability = prob_above(u, mo, forward, s["K1"])
        chance += probability if up else 1 - probability
        vols.append(vol_at(u, forward, s["K1"], tenor))
    fee = TICKET * len(months)
    total = ask + fee
    n = len(months)
    return {"mid": mid, "spread": ask - mid, "fee": fee, "total": total, "monthly": total / n, "chance": chance / n, "vol1": vols[0], "volN": vols[-1], "per": per}


def settle(direction: str, k1: float, k2: float | None, average: float) -> float:
    if direction == "up":
        return max(0, min(average, k2 if k2 is not None else math.inf) - k1)
    return max(0, k1 - max(average, k2 if k2 is not None else -math.inf))
