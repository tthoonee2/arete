from fastapi.testclient import TestClient

from apps.api.main import app

client = TestClient(app)
HEADERS = {"Idempotency-Key": "test-quote-0001"}


def quote_payload(**overrides):
    payload = {
        "market": "brent", "side": "ceiling", "structure": "paid",
        "limit": 72.5, "cap": 88, "volume_per_month": 8000,
        "start_month": 1, "months": 6,
    }
    payload.update(overrides)
    return payload


def test_markets_and_curve_include_illustrative_provenance():
    response = client.get("/v1/markets")
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 25
    assert body["data_status"] == "illustrative"
    curve = client.get("/v1/markets/brent/curve")
    assert curve.status_code == 200
    assert len(curve.json()["points"]) == 12
    assert curve.json()["snapshot_id"].startswith("cs_")
    assert curve.json()["source"] == "illustrative"


def test_quote_is_reproducible_and_idempotent():
    response = client.post("/v1/quotes", json=quote_payload(), headers=HEADERS)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["snapshot_id"].startswith("cs_")
    assert body["model_version"]
    assert len(body["months"]) == 6
    assert body["expires_at"] > body["curve_as_of"]
    repeated = client.post("/v1/quotes", json=quote_payload(), headers=HEADERS)
    assert repeated.status_code == 201
    assert repeated.json() == body
    conflict = client.post("/v1/quotes", json=quote_payload(months=3), headers=HEADERS)
    assert conflict.status_code == 409


def test_quotes_require_a_positive_upfront_premium_and_reject_zero_cost():
    response = client.post("/v1/quotes", json=quote_payload(cap=None), headers={"Idempotency-Key": "test-upfront-001"})
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["structure"] == "paid"
    assert body["payment_timing"] == "upfront"
    assert body["premium"] > 0
    assert "collar_strike" not in body

    zero_cost = client.post(
        "/v1/quotes",
        json=quote_payload(structure="zero_cost", cap=None),
        headers={"Idempotency-Key": "test-no-zero-cost-001"},
    )
    assert zero_cost.status_code == 422


def test_quote_validation_and_openapi():
    assert client.post("/v1/quotes", json=quote_payload()).status_code == 422
    assert client.post("/v1/quotes", json=quote_payload(volume_per_month=1_000_001), headers={"Idempotency-Key": "test-limit-001"}).status_code == 422
    assert client.post("/v1/quotes", json=quote_payload(cap=60), headers={"Idempotency-Key": "test-cap-0001"}).status_code == 422
    assert client.post("/v1/quotes", json=quote_payload(start_month=12, months=2), headers={"Idempotency-Key": "test-strip-01"}).status_code == 422
    schema = client.get("/openapi.json")
    assert schema.status_code == 200
    assert "/v1/quotes" in schema.json()["paths"]
