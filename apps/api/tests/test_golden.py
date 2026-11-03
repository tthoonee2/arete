import json
import math
import random
import subprocess
from pathlib import Path

from apps.api.pricing import ALL, fwd, price

ROOT = Path(__file__).resolve().parents[3]


def test_200_random_quotes_match_javascript_within_1e_6():
    rng = random.Random(20261030)
    cases = []
    for _ in range(200):
        u = rng.choice(ALL)
        direction = rng.choice(["up", "down"])
        t1 = rng.uniform(.01, 1.5)
        mo = {"cal": rng.randrange(12), "label": "Golden", "t1": t1, "t2": t1 + 1 / 12}
        forward = fwd(u, mo)
        if u.get("model") == "normal":
            k1 = forward + rng.uniform(-1, 1) * u["vol0"]
            k2 = k1 + rng.uniform(.1, 1) * u["vol0"] * (1 if direction == "up" else -1) if rng.random() < .35 else None
        else:
            k1 = forward * rng.uniform(.55, 1.5)
            k2 = None
            if rng.random() < .35:
                k2 = k1 * (rng.uniform(1.02, 1.5) if direction == "up" else rng.uniform(.5, .98))
        cases.append({"market": u["id"], "dir": direction, "q": rng.uniform(1, 100_000), "mo": mo, "K1": k1, "K2": k2, "shock": rng.uniform(-.05, .05)})

    completed = subprocess.run(
        ["node", str(ROOT / "apps/api/tests/compare_engine.js")],
        input=json.dumps(cases), text=True, capture_output=True, check=True,
    )
    javascript = json.loads(completed.stdout)
    for case, expected in zip(cases, javascript):
        u = next(market for market in ALL if market["id"] == case["market"])
        actual = price({"u": u, "dir": case["dir"], "q": case["q"], "ms": [case["mo"]], "K1": case["K1"], "K2": case["K2"], "shock": case["shock"]})
        assert actual["total"] > 0
        for key in ["mid", "spread", "fee", "total", "monthly", "chance", "vol1"]:
            assert math.isclose(actual[key], expected[key], rel_tol=0, abs_tol=1e-6), (case["market"], key, actual[key], expected[key])
        for actual_row, expected_row in zip(actual["per"], expected["per"]):
            assert math.isclose(actual_row["F"], expected_row["F"], rel_tol=0, abs_tol=1e-6)
            assert math.isclose(actual_row["cost"], expected_row["cost"], rel_tol=0, abs_tol=1e-6)
