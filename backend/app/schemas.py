from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class BudgetRequest(BaseModel):
    items: List[str]
    stores: Optional[List[str]] = None


class ProductResponse(BaseModel):
    name: str
    price: float
    unit: str
    brand: str
    store: str
    url: Optional[str] = None
    details: Optional[str] = None
    last_updated: Optional[str] = None


class BudgetItem(BaseModel):
    query: str
    product: ProductResponse


class StoreBudget(BaseModel):
    items: List[BudgetItem]
    total: float
    whatsapp_message: str


class BudgetResponse(BaseModel):
    budgets: dict[str, StoreBudget]


class AlternativesRequest(BaseModel):
    query: str
    stores: Optional[List[str]] = None


class AlternativeGroup(BaseModel):
    name: str
    product: ProductResponse
    count: int
    stores: List[str]


class SavingsPlanRequest(BaseModel):
    items: List[str]
    stores: Optional[List[str]] = None


class SavingsPlanItem(BaseModel):
    product: ProductResponse
    store: str


class StoreSplit(BaseModel):
    items: List[SavingsPlanItem]
    subtotal: float


class SavingsPlanResponse(BaseModel):
    splits: dict[str, StoreSplit]
    grand_total: float
    total_saved: float


class ProductOptionsRequest(BaseModel):
    query: str
    stores: Optional[List[str]] = None


class BrandOption(BaseModel):
    name: str
    common_count: int
    total_stores: int
    products: List[ProductResponse]


class CharacteristicOption(BaseModel):
    unit: str
    brands: List[BrandOption]


class ProductOptionsResponse(BaseModel):
    characteristics: List[CharacteristicOption]
    cheapest: Optional[ProductResponse] = None
