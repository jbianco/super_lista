import pytest
from app.services.cart import CartService


class TestCartService:
    pytestmark = pytest.mark.asyncio

    async def test_returns_success_with_results(self):
        service = CartService()
        result = await service.add_to_cart(
            "Carrefour",
            {"email": "test@test.com", "password": "pass"},
            [{"query": "Leche", "quantity": 1}],
        )
        assert result.success is True
        assert len(result.results) == 1

    async def test_returns_per_item_results(self):
        service = CartService()
        result = await service.add_to_cart(
            "Carrefour",
            {"email": "test@test.com", "password": "pass"},
            [{"query": "Leche", "quantity": 2}, {"query": "Pan", "quantity": 1}],
        )
        assert len(result.results) == 2
        assert result.results[0].query == "Leche"
        assert result.results[0].status == "added"
        assert result.results[1].query == "Pan"
        assert result.results[1].status == "added"

    async def test_works_with_credentials_dict(self):
        service = CartService()
        result = await service.add_to_cart(
            "Changomas",
            {"email": "test@test.com", "password": "pass", "auth_method": "password"},
            [{"query": "Arroz", "quantity": 1, "name": "Arroz Gallo 1kg"}],
        )
        assert result.success is True
        assert result.results[0].status == "added"
