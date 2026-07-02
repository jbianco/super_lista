from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.db.session import get_session
from app.db.models import User
from app.services.auth import get_optional_user
from app.services.budget import BudgetService
from app.services.cache import get_cache_timestamp
from app.schemas import (
    BudgetRequest,
    BudgetResponse,
    StoreBudget,
    BudgetItem,
    ProductResponse,
    PriceHistoryResponse,
    AlternativesRequest,
    AlternativeGroup,
    SavingsPlanRequest,
    SavingsPlanResponse,
    StoreSplit,
    SavingsPlanItem,
    ProductOptionsRequest,
    ProductOptionsResponse,
    CharacteristicOption,
    BrandOption,
)
from app.providers.base import ProductResult
from app.services.price_history import record_price, get_history, get_history_by_product
import asyncio


def _product_response(p: ProductResult, query: str, session: Session | None = None) -> ProductResponse:
    price_change: float | None = None
    if session:
        prev = get_history_by_product(session, p.store, p.name, limit=2)
        if len(prev) >= 2 and prev[0].price != prev[1].price:
            price_change = round((prev[0].price - prev[1].price) / prev[1].price * 100, 1)
    return ProductResponse(
        name=p.name,
        price=p.price,
        unit=p.unit,
        brand=p.brand,
        store=p.store,
        url=p.url,
        details=p.details,
        last_updated=get_cache_timestamp(p.store, query),
        price_change_pct=price_change,
    )


router = APIRouter(prefix="/api", tags=["budget"])


@router.post("/budget", response_model=BudgetResponse)
async def get_budget(
    req: BudgetRequest,
    current_user: User | None = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    service = BudgetService()
    budgets = await service.get_best_budget(req.items, req.stores)

    result = {}
    for store, data in budgets.items():
        items = []
        for i in data["items"]:
            product = i["product"]
            record_price(session, store, i["query"], product.name, product.price, product.unit, product.brand)
            items.append(BudgetItem(
                query=i["query"],
                product=_product_response(product, i["query"], session),
            ))

        result[store] = StoreBudget(
            items=items,
            total=data["total"],
            whatsapp_message=service.generate_whatsapp_message(data, store),
        )

    return BudgetResponse(budgets=result)


@router.post("/alternatives", response_model=list[AlternativeGroup])
async def get_alternatives(
    req: AlternativesRequest,
    current_user: User | None = Depends(get_optional_user),
):
    service = BudgetService()
    alternatives = await service.get_alternatives(req.query, req.stores)

    return [
        AlternativeGroup(
            name=alt["name"],
            product=_product_response(alt["product"], req.query),
            count=alt["count"],
            stores=alt["stores"],
        )
        for alt in alternatives
    ]


@router.post("/savings-plan", response_model=SavingsPlanResponse)
async def get_savings_plan(
    req: SavingsPlanRequest,
    current_user: User | None = Depends(get_optional_user),
):
    service = BudgetService()
    plan = await service.get_max_savings_plan(req.items, req.stores)

    result = {}
    for store, data in plan["splits"].items():
        result[store] = StoreSplit(
            items=[
                SavingsPlanItem(
                    product=_product_response(i["product"], i["query"]),
                    store=i["product"].store,
                )
                for i in data["items"]
            ],
            subtotal=data["subtotal"],
        )

    return SavingsPlanResponse(
        splits=result,
        grand_total=plan["grand_total"],
        total_saved=plan["total_saved"],
    )


@router.post("/product-options", response_model=ProductOptionsResponse)
async def get_product_options(
    req: ProductOptionsRequest,
    current_user: User | None = Depends(get_optional_user),
):
    service = BudgetService()

    active_providers = service.all_providers
    if req.stores:
        active_providers = [p for p in service.all_providers if p.store_name in req.stores]

    tasks = [p.search_product(req.query) for p in active_providers]
    results = await asyncio.gather(*tasks)

    all_products = []
    for store_results in results:
        all_products.extend(store_results)

    products_by_unit: dict[str, list[dict]] = {}

    for p in all_products:
        entry = {
            "name": p.name,
            "price": p.price,
            "unit": p.unit,
            "brand": p.brand,
            "store": p.store,
            "url": p.url,
            "details": p.details,
            "last_updated": get_cache_timestamp(p.store, req.query),
        }
        unit = p.unit if p.unit else "sin_caracteristica"
        if unit not in products_by_unit:
            products_by_unit[unit] = []
        products_by_unit[unit].append(entry)

    characteristics = []
    flat_all = []

    for unit, prods in sorted(products_by_unit.items()):
        brand_groups: dict[str, dict] = {}
        for pd in prods:
            brand = pd["brand"]
            if brand not in brand_groups:
                brand_groups[brand] = {"name": brand, "stores": set(), "cheapest": None}
            brand_groups[brand]["stores"].add(pd["store"])
            if brand_groups[brand]["cheapest"] is None or pd["price"] < brand_groups[brand]["cheapest"]["price"]:
                brand_groups[brand]["cheapest"] = pd
            flat_all.append(pd)

        sorted_brands = sorted(
            brand_groups.values(),
            key=lambda b: (-len(b["stores"]), b["cheapest"]["price"]),
        )

        display_unit = "Sin característica" if unit == "sin_caracteristica" else unit

        characteristics.append(CharacteristicOption(
            unit=display_unit,
            brands=[
                BrandOption(
                    name=bg["name"],
                    common_count=len(bg["stores"]),
                    total_stores=len(active_providers),
                    products=[
                        ProductResponse(**p)
                        for p in prods
                        if p["brand"] == bg["name"]
                    ],
                )
                for bg in sorted_brands
            ],
        ))

    cheapest = min(flat_all, key=lambda p: p["price"]) if flat_all else None

    return ProductOptionsResponse(
        characteristics=characteristics,
        cheapest=ProductResponse(**cheapest) if cheapest else None,
    )


@router.get("/price-history", response_model=list[PriceHistoryResponse])
def price_history(
    store: str = Query(...),
    query: str = Query(None),
    product_name: str = Query(None),
    limit: int = Query(30, ge=1, le=100),
    current_user: User | None = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    if product_name:
        entries = get_history_by_product(session, store, product_name, limit)
    elif query:
        entries = get_history(session, store, query, limit)
    else:
        return []

    return [
        PriceHistoryResponse(
            store=e.store,
            query=e.query,
            product_name=e.product_name,
            price=e.price,
            unit=e.unit,
            brand=e.brand,
            recorded_at=e.recorded_at.isoformat(),
        )
        for e in entries
    ]
