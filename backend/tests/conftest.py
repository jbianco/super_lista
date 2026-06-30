import pytest
from app.services.budget import BudgetService


@pytest.fixture
def budget_service():
    return BudgetService()
