"""Pure Python counterpart of packages/pricing/browser.js (Black-76/Bachelier)."""
from __future__ import annotations

import json
import math
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / "packages/pricing/markets.json").read_text())
U, R, TICKET = DATA["U"], DATA["R"], DATA["TICKET"]
ALL = [u for markets in U.values() for u in markets]
MODEL_VERSION = "2026.10-black76-v2"


def month_list(now=None):
    now = now or datetime.now(timezone.utc)
    result = []
    for i in range(1, 13):
        year, month = now.year + (now.month - 1 + i) // 12, (now.month - 1 + i) % 12 + 1
        ny, nm = year + month // 12, month % 12 + 1
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        end = datetime(ny, nm, 1, tzinfo=timezone.utc)
        result.append({
            "i": i, "cal": month - 1, "label": start.strftime("%b %y"),
            "t1": max((start - now).total_seconds() / 31_536_000, 1 / 365),
            "t2": (end - now).total_seconds() / 31_536_000,
        })
    return result


def polevl(x, coefficients):
    result = 0.0
    for coefficient in coefficients:
        result = result * x + coefficient
    return result


def p1evl(x, coefficients):
    result = 1.0
    for coefficient in coefficients[:-1]:
        result = result * x + coefficient
    return result * x + coefficients[-1]


def erfc(x):
    if x < 0:
        return 2 - erfc(-x)
    if x < 1:
        return 1 - x * polevl(x*x, [9.60497373987051638749,90.0260197203842689217,2232.00534594684319226,7003.32514112805075473,55592.3013010394962768]) / p1evl(x*x, [33.5617141647503099647,521.357949780152679795,4594.32382970980127987,22629.0000613890934246,49267.3942608635921086])
    if x > 8:
        return 0.0
    if x < 8:
        p = [2.46196981473530512524e-10,.564189564831068821977,7.46321056442269912687,48.6371970985681366614,196.520832956077098242,526.445194995477358631,934.52852717195760754,1027.55188689515710272,557.535335369399327526]
        q = [13.2281951154737992588,86.7072140885989742329,354.937778887819891062,975.708501743205489753,1823.90916687909736289,2246.33760818710981792,1656.66309194161350182,557.535340817727675546]
    else:
        p = [.564189583547755073984,1.27536670759978104416,5.01905042251180477414,6.16021097993053585195,7.4097426995044893916,2.9788666537210024067]
        q = [2.2605286322011727659,9.39603524938001434673,12.0489539808096656605,17.0814450747565897222,9.60896809063285878198,3.3690764510008151605]
    return math.exp(-x*x) * polevl(x, p) / p1evl(x, q)


def N(x):
    return .5 * erfc(-x / math.sqrt(2))


def fwd(u, mo, months):
    tm = (mo["t1"] + mo["t2"]) / 2
    seasonal = lambda c: 1 + u["seas"] * math.cos(2 * math.pi * c / 12)
    return u["F"] * (1 + u["slope"] * tm) * seasonal(mo["cal"]) / seasonal(months[0]["cal"])


def atm_vol(u, t):
    return u["volL"] + (u["vol0"] - u["volL"]) * math.exp(-t / .5)


def vol_at(u, f, k, t):
    if u.get("model") == "normal":
        return atm_vol(u, t)
    x = math.log(k / f) / math.sqrt(max(t, .08))
    return atm_vol(u, t) * min(2.5, max(.6, 1 + u["skew"] * x + u["curv"] * x*x))


def black(f, k, v, df, option_type):
    if k <= 0:
        return df * (f-k) if option_type == "c" else 0
    s = math.sqrt(v)
    if s < 1e-9:
        return df * max(f-k if option_type == "c" else k-f, 0)
    d1 = (math.log(f/k) + v/2) / s
    d2 = d1-s
    if option_type == "c":
        return df * (f*N(d1) - k*N(d2))
    return df * (k*N(-d2) - f*N(-d1))


def opt_val(u, mo, f, k, option_type, bump=0):
    t = (mo["t1"] + mo["t2"]) / 2
    sig = max(.01, vol_at(u, f, k, t) + bump)
    v = sig*sig * (mo["t1"] + (mo["t2"]-mo["t1"])/3)
    df = math.exp(-R[u["ccy"]] * mo["t2"])
    if u.get("model") == "normal":
        sd, d = math.sqrt(v), (f-k) / math.sqrt(v)
        ph = .3989422804 * math.exp(-d*d/2)
        if option_type == "c":
            return df * ((f-k)*N(d) + sd*ph)
        return df * ((k-f)*N(-d) + sd*ph)
    return black(f, k, v, df, option_type)


def prob_above(u, mo, f, k):
    h = max(u["vol0"]*.005, 1e-6) if u.get("model") == "normal" else max(f*.002, 1e-6)
    df = math.exp(-R[u["ccy"]] * mo["t2"])
    return min(1, max(0, (opt_val(u,mo,f,k-h,"c") - opt_val(u,mo,f,k+h,"c")) / (2*h*df)))


def price(s, months):
    u, q, ms = s["u"], s["q"], s["ms"]
    up = s["dir"] == "up"
    option_type, other = ("c", "p") if up else ("p", "c")
    mid = ask = chance = owe = 0.0
    per = []
    for mo in ms:
        f = fwd(u, mo, months) * (1 + s.get("shock", 0))
        a = opt_val(u,mo,f,s["K1"],option_type,u["dvol"])
        md = opt_val(u,mo,f,s["K1"],option_type)
        if s.get("K2") is not None:
            a -= opt_val(u,mo,f,s["K2"],option_type,-u["dvol"])
            md -= opt_val(u,mo,f,s["K2"],option_type)
        if s.get("Kx") is not None:
            a -= opt_val(u,mo,f,s["Kx"],other,-u["dvol"])
            md -= opt_val(u,mo,f,s["Kx"],other)
        ask += a*q*u["mult"]
        mid += md*q*u["mult"]
        per.append({"month": mo["label"], "forward": f, "cost": a*q*u["mult"]+TICKET})
        pa = prob_above(u,mo,f,s["K1"])
        chance += pa if up else 1-pa
        if s.get("Kx") is not None:
            px = prob_above(u,mo,f,s["Kx"])
            owe += 1-px if up else px
    fee = TICKET*len(ms)
    total = ask+fee
    return {"mid":mid,"spread":ask-mid,"fee":fee,"total":total,"monthly":total/len(ms),"chance":chance/len(ms),"owe":owe/len(ms),"per":per}


def solve_collar(base, months):
    outer = base["u"]["lo"] if base["dir"] == "up" else base["u"]["hi"]
    def at(k):
        return price({**base, "Kx": k}, months)
    a, b, pa, pb = outer, base["K1"], at(outer), at(base["K1"])
    if pa["total"] < 0 or pb["total"] > 0:
        return None
    for _ in range(90):
        middle = (a+b)/2
        pm = at(middle)
        if pm["total"] > 0:
            a, pa = middle, pm
        else:
            b, pb = middle, pm
    k = (a+b)/2
    return {"Kx":k,"p":at(k)}


def settle(direction, k1, k2, kx, x):
    if direction == "up":
        return max(0, min(x, k2 if k2 is not None else math.inf)-k1) - (0 if kx is None else max(kx-x,0))
    return max(0, k1-max(x, k2 if k2 is not None else -math.inf)) - (0 if kx is None else max(x-kx,0))
