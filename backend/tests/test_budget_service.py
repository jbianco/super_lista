import pytest
from app.services.budget import BudgetService


class TestGetBestBudget:
    pytestmark = pytest.mark.asyncio

    async def test_returns_all_stores_when_no_filter(self, budget_service: BudgetService):
        result = await budget_service.get_best_budget(["Leche"])
        assert set(result.keys()) == {"Carrefour", "Changomas", "Disco", "Jumbo"}

    async def test_filters_stores_when_enabled_provided(self, budget_service: BudgetService):
        result = await budget_service.get_best_budget(["Leche"], enabled_stores=["Carrefour"])
        assert set(result.keys()) == {"Carrefour"}

    async def test_each_store_has_items_and_total(self, budget_service: BudgetService):
        result = await budget_service.get_best_budget(["Leche", "Pan"])
        for store, data in result.items():
            assert "items" in data
            assert "total" in data
            assert isinstance(data["total"], float)
            assert data["total"] > 0
            assert len(data["items"]) > 0

    async def test_each_item_has_query_and_product_with_all_fields(self, budget_service: BudgetService):
        result = await budget_service.get_best_budget(["Leche"])
        for store, data in result.items():
            for item in data["items"]:
                assert "query" in item
                assert item["query"] == "Leche"
                p = item["product"]
                assert p.name
                assert isinstance(p.price, float) and p.price > 0
                assert p.unit
                assert p.brand
                assert p.store
                assert isinstance(p.brand, str)

    async def test_total_matches_sum_of_items(self, budget_service: BudgetService):
        result = await budget_service.get_best_budget(["Leche", "Pan", "Yerba"])
        for store, data in result.items():
            expected = sum(item["product"].price for item in data["items"])
            assert abs(data["total"] - expected) < 0.01

    async def test_multiple_queries_produce_multiple_items_per_store(self, budget_service: BudgetService):
        queries = ["Leche", "Pan", "Yerba", "Arroz", "Fideos"]
        result = await budget_service.get_best_budget(queries)
        for store, data in result.items():
            got_queries = {it["query"] for it in data["items"]}
            assert got_queries == set(queries)


class TestGetAlternatives:
    pytestmark = pytest.mark.asyncio

    async def test_returns_list_of_groups(self, budget_service: BudgetService):
        result = await budget_service.get_alternatives("Leche")
        assert isinstance(result, list)
        assert len(result) > 0

    async def test_each_group_has_required_fields(self, budget_service: BudgetService):
        result = await budget_service.get_alternatives("Leche")
        for group in result:
            assert "name" in group
            assert "product" in group
            assert "count" in group
            assert "stores" in group
            assert group["count"] >= 1
            assert isinstance(group["stores"], list)
            assert len(group["stores"]) == group["count"]
            p = group["product"]
            assert p.name
            assert p.price > 0
            assert p.store in group["stores"]

    async def test_fuzzy_matching_groups_similar_products(self, budget_service: BudgetService):
        result = await budget_service.get_alternatives("Leche")
        for group in result:
            assert group["count"] >= 1
        names = [g["name"].lower() for g in result]
        ilolay_groups = [n for n in names if "ilolay" in n]
        assert len(ilolay_groups) >= 1

    async def test_filters_stores_when_enabled(self, budget_service: BudgetService):
        result = await budget_service.get_alternatives("Leche", enabled_stores=["Carrefour"])
        for group in result:
            for store in group["stores"]:
                assert store == "Carrefour"

    async def test_different_queries_return_different_results(self, budget_service: BudgetService):
        leche = await budget_service.get_alternatives("Leche")
        pan = await budget_service.get_alternatives("Pan")
        leche_names = {g["name"] for g in leche}
        pan_names = {g["name"] for g in pan}
        assert leche_names != pan_names


class TestGetMaxSavingsPlan:
    pytestmark = pytest.mark.asyncio

    async def test_returns_splits_and_totals(self, budget_service: BudgetService):
        result = await budget_service.get_max_savings_plan(["Leche", "Pan"])
        assert "splits" in result
        assert "grand_total" in result
        assert "total_saved" in result
        assert result["grand_total"] > 0

    async def test_each_split_has_items_and_subtotal(self, budget_service: BudgetService):
        result = await budget_service.get_max_savings_plan(["Leche", "Pan"])
        for store, split in result["splits"].items():
            assert "items" in split
            assert "subtotal" in split
            assert split["subtotal"] > 0
            assert len(split["items"]) > 0

    async def test_grand_total_matches_all_subtotals(self, budget_service: BudgetService):
        result = await budget_service.get_max_savings_plan(["Leche", "Pan", "Yerba"])
        expected = sum(s["subtotal"] for s in result["splits"].values())
        assert abs(result["grand_total"] - expected) < 0.01

    async def test_every_product_in_plan_has_brand(self, budget_service: BudgetService):
        result = await budget_service.get_max_savings_plan(["Leche", "Pan"])
        for split in result["splits"].values():
            for item in split["items"]:
                assert item["product"].brand


class TestGenerateWhatsAppMessage:

    def test_contains_store_name_and_total(self, budget_service: BudgetService):
        budget = {
            "items": [
                {"product": type("P", (), {"name": "Leche", "price": 500.0})()},
            ],
            "total": 500.0,
        }
        msg = budget_service.generate_whatsapp_message(budget, "Carrefour")
        assert "Carrefour" in msg
        assert "$500" in msg or "500" in msg

    def test_includes_all_items(self, budget_service: BudgetService):
        budget = {
            "items": [
                {"product": type("P", (), {"name": "Leche", "price": 500.0})()},
                {"product": type("P", (), {"name": "Pan", "price": 300.0})()},
            ],
            "total": 800.0,
        }
        msg = budget_service.generate_whatsapp_message(budget, "Tadicor")
        assert "Leche" in msg
        assert "Pan" in msg
        assert "800" in msg or "800.0" in msg
