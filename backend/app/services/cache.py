import json
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlmodel import Session, select
from app.db.session import engine
from app.db.models import ProductCache
from app.providers.base import ProductResult


CACHE_TTL_HOURS = 6


def get_cached_products(store: str, query: str) -> Tuple[Optional[List[ProductResult]], Optional[datetime]]:
    with Session(engine) as session:
        stmt = (
            select(ProductCache)
            .where(ProductCache.store == store, ProductCache.query == query)
            .order_by(ProductCache.last_updated.desc())
        )
        cached = session.exec(stmt).first()
        if cached:
            ts = cached.last_updated
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            age = datetime.now(timezone.utc) - ts
            if age.total_seconds() > CACHE_TTL_HOURS * 3600:
                return None, None
            data = json.loads(cached.products) if isinstance(cached.products, str) else cached.products
            products = [ProductResult(**p) if isinstance(p, dict) else p for p in data]
            return products, cached.last_updated
    return None, None


def get_cache_timestamp(store: str, query: str) -> Optional[str]:
    with Session(engine) as session:
        stmt = (
            select(ProductCache.last_updated)
            .where(ProductCache.store == store, ProductCache.query == query)
            .order_by(ProductCache.last_updated.desc())
        )
        ts = session.exec(stmt).first()
        if ts:
            return ts.isoformat()
    return None


def save_cached_products(store: str, query: str, products: List[ProductResult]):
    with Session(engine) as session:
        stmt = select(ProductCache).where(ProductCache.store == store, ProductCache.query == query)
        existing = session.exec(stmt).first()
        now = datetime.now(timezone.utc)
        products_json = json.dumps([p.model_dump() for p in products], default=str)
        if existing:
            existing.products = products_json
            existing.last_updated = now
        else:
            entry = ProductCache(
                store=store,
                query=query,
                products=products_json,
                last_updated=now,
            )
            session.add(entry)
        session.commit()
