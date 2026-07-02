import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestCartRouter:
    def test_cart_endpoint_exists(self):
        response = client.post("/api/cart", json={
            "store_name": "Carrefour",
            "credentials": {"email": "test@test.com", "password": "pass"},
            "items": [{"query": "Leche", "quantity": 1}],
        })
        assert response.status_code == 200

    def test_cart_returns_results_list(self):
        response = client.post("/api/cart", json={
            "store_name": "Changomas",
            "credentials": {"email": "test@test.com", "password": "pass"},
            "items": [{"query": "Leche", "quantity": 2}, {"query": "Pan", "quantity": 1}],
        })
        data = response.json()
        assert "success" in data
        assert "results" in data
        assert len(data["results"]) == 2

    def test_cart_items_have_status(self):
        response = client.post("/api/cart", json={
            "store_name": "Disco",
            "credentials": {"email": "test@test.com", "password": "pass"},
            "items": [{"query": "Arroz", "quantity": 1}],
        })
        data = response.json()
        assert data["results"][0]["status"] == "added"
        assert data["results"][0]["query"] == "Arroz"

    def test_cart_accepts_optional_name_field(self):
        response = client.post("/api/cart", json={
            "store_name": "Jumbo",
            "credentials": {"email": "test@test.com", "password": "pass"},
            "items": [{"query": "Leche", "quantity": 1, "name": "Leche Entera 1L"}],
        })
        assert response.status_code == 200
