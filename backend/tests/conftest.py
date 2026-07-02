import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db, engine
from sqlmodel import SQLModel


@pytest.fixture(autouse=True)
def clean_db():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def budget_service():
    from app.services.budget import BudgetService
    return BudgetService()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_token(client):
    resp = client.post("/api/auth/register", json={
        "username": "meuser",
        "password": "mepass",
    })
    assert resp.status_code == 201
    return resp.json()["access_token"]
