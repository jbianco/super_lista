from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from app.db.models import PriceHistory


def record_price(
    session: Session,
    store: str,
    query: str,
    product_name: str,
    price: float,
    unit: str,
    brand: str,
):
    entry = PriceHistory(
        store=store,
        query=query,
        product_name=product_name,
        price=price,
        unit=unit,
        brand=brand,
    )
    session.add(entry)
    session.commit()


def get_history(
    session: Session,
    store: str,
    query: str,
    limit: int = 30,
) -> List[PriceHistory]:
    stmt = (
        select(PriceHistory)
        .where(PriceHistory.store == store, PriceHistory.query == query)
        .order_by(PriceHistory.recorded_at.desc())
        .limit(limit)
    )
    return list(session.exec(stmt))


def get_history_by_product(
    session: Session,
    store: str,
    product_name: str,
    limit: int = 30,
) -> List[PriceHistory]:
    stmt = (
        select(PriceHistory)
        .where(PriceHistory.store == store, PriceHistory.product_name == product_name)
        .order_by(PriceHistory.recorded_at.desc())
        .limit(limit)
    )
    return list(session.exec(stmt))
