from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)
BASE = {"market_id":"brent","side":"buy","structure":"protection","limit":75,"volume":10000,"start_month":0,"months":6}


def post(payload=None, key="test-key-0001"):
    return client.post("/v1/quotes", json=payload or BASE, headers={"Idempotency-Key":key})


def test_markets_and_curve_provenance():
    response = client.get("/v1/markets")
    assert response.status_code == 200
    assert any(m["id"] == "brent" for m in response.json()["markets"])
    curve = client.get("/v1/markets/brent/curve")
    assert curve.status_code == 200
    assert curve.json()["data_status"] == "illustrative"
    assert len(curve.json()["points"]) == 12


def test_quote_has_snapshot_version_and_expiry():
    response = post(key="quote-fields-01")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["model_version"]
    assert body["snapshot_id"].startswith("curve_")
    assert body["premium"]["fee"] == 150
    assert len(body["rows"]) == 6
    assert body["data_status"] == "illustrative"


def test_idempotency_replays_and_conflicts():
    first, second = post(key="same-request-01"), post(key="same-request-01")
    assert first.json()["quote_id"] == second.json()["quote_id"]
    changed = {**BASE, "limit":80}
    assert post(changed, key="same-request-01").status_code == 409


def test_zero_cost_collar_has_no_upfront_residual():
    response = post({**BASE,"structure":"zero_cost_collar"}, key="zero-cost-0001")
    assert response.status_code == 201, response.text
    assert abs(response.json()["premium"]["total"]) < 1e-6
    assert response.json()["sold_strike"] is not None


def test_validation_and_openapi():
    assert post({**BASE,"months":13}, key="bad-months-001").status_code == 422
    assert post({**BASE,"start_month":10,"months":6}, key="bad-strip-0001").status_code == 422
    assert post({**BASE,"structure":"cap"}, key="bad-cap-00001").status_code == 422
    assert client.post("/v1/quotes", json=BASE).status_code == 422
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/health").json()["status"] == "ok"
