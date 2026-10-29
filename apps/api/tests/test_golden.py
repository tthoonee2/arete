"""Cross-language golden tests: 200 deterministic cases, absolute tolerance 1e-6."""
import json
import math
import random
import subprocess
from pathlib import Path

from apps.api.pricing import ALL, month_list, price, solve_collar

ROOT = Path(__file__).resolve().parents[3]


def test_javascript_python_parity():
    rng = random.Random(76123)
    months = month_list()
    cases = []
    for index in range(200):
        u = ALL[index % len(ALL)]
        span = u["hi"] - u["lo"]
        k1 = u["lo"] + span * rng.uniform(.25,.7)
        structure = ["protection","cap","zero_cost_collar"][index % 3]
        case = {"market_id":u["id"],"dir":["up","down"][index%2],"q":max(1,u["usage"]*rng.uniform(.1,2)),"start":rng.randrange(0,6),"months":rng.randrange(1,7),"K1":k1,"K2":None,"structure":structure}
        case["months"] = min(case["months"],12-case["start"])
        if structure == "cap":
            case["K2"] = k1 + span*.15 if case["dir"] == "up" else k1-span*.15
        cases.append(case)
    script = ROOT / "apps/api/tests/compare_engine.js"
    raw = subprocess.check_output(["node",str(script)],input=json.dumps({"cases":cases,"months":months}),text=True)
    expected = json.loads(raw)
    for case, want in zip(cases,expected):
        u = next(item for item in ALL if item["id"] == case["market_id"])
        base = {"u":u,"dir":case["dir"],"q":case["q"],"ms":months[case["start"]:case["start"]+case["months"]],"K1":case["K1"],"K2":case["K2"],"Kx":None,"shock":0}
        if case["structure"] == "zero_cost_collar":
            solved = solve_collar(base,months)
            assert (solved is None) == (want is None)
            if solved is None:
                continue
            got = solved["p"]
        else:
            got = price(base,months)
        assert want is not None
        for key in ["mid","spread","fee","total","monthly","chance","owe"]:
            assert math.isclose(got[key],want[key],rel_tol=0,abs_tol=1e-6), (case,key,got[key],want[key])
        for actual_row, expected_row in zip(got["per"],want["per"]):
            for key in ["forward","cost"]:
                assert math.isclose(actual_row[key],expected_row[key],rel_tol=0,abs_tol=1e-6)
