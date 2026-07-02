import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestAuthRegister:
    def test_register_creates_user_and_returns_token(self):
        response = client.post("/api/auth/register", json={
            "username": "testuser",
            "password": "testpass123",
        })
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_register_duplicate_username_returns_409(self):
        client.post("/api/auth/register", json={
            "username": "dupuser",
            "password": "pass123",
        })
        response = client.post("/api/auth/register", json={
            "username": "dupuser",
            "password": "pass456",
        })
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"].lower()


class TestAuthLogin:
    def test_login_with_valid_credentials_returns_token(self):
        client.post("/api/auth/register", json={
            "username": "loginuser",
            "password": "correctpass",
        })
        response = client.post("/api/auth/login", json={
            "username": "loginuser",
            "password": "correctpass",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_login_with_wrong_password_returns_401(self):
        response = client.post("/api/auth/login", json={
            "username": "loginuser",
            "password": "wrongpass",
        })
        assert response.status_code == 401


class TestAuthMe:
    def test_me_with_valid_token_returns_user(self, auth_token):
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "meuser"
        assert "id" in data

    def test_me_without_token_returns_401(self):
        response = client.get("/api/auth/me")
        assert response.status_code == 401


class TestStoreCredentials:
    def test_save_and_list_credentials(self, auth_token):
        headers = {"Authorization": f"Bearer {auth_token}"}
        save_resp = client.post("/api/auth/credentials", json={
            "store_name": "Carrefour",
            "email": "test@carrefour.com",
            "password": "storepass",
        }, headers=headers)
        assert save_resp.status_code == 201
        assert save_resp.json()["store_name"] == "Carrefour"

        list_resp = client.get("/api/auth/credentials", headers=headers)
        assert list_resp.status_code == 200
        data = list_resp.json()
        assert len(data) >= 1
        assert data[0]["store_name"] == "Carrefour"

    def test_delete_credential(self, auth_token):
        headers = {"Authorization": f"Bearer {auth_token}"}
        save_resp = client.post("/api/auth/credentials", json={
            "store_name": "Changomas",
            "email": "test@changomas.com",
            "password": "storepass",
        }, headers=headers)
        cred_id = save_resp.json()["id"]

        del_resp = client.delete(f"/api/auth/credentials/{cred_id}", headers=headers)
        assert del_resp.status_code == 204

        list_resp = client.get("/api/auth/credentials", headers=headers)
        ids = [c["id"] for c in list_resp.json()]
        assert cred_id not in ids


class TestProtectedEndpointsPublicAccess:
    def test_budget_endpoint_works_without_auth(self):
        response = client.post("/api/budget", json={
            "items": ["Leche"],
            "stores": ["Carrefour"],
        })
        assert response.status_code == 200

    def test_cart_endpoint_works_without_auth(self):
        response = client.post("/api/cart", json={
            "store_name": "Carrefour",
            "credentials": {"email": "x@x.com", "password": "x"},
            "items": [{"query": "Leche", "quantity": 1}],
        })
        assert response.status_code == 200
