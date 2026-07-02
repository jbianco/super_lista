import httpx
import re
from datetime import datetime, timezone
from typing import List, Optional
from app.providers.base import ProductResult
from app.services.cache import get_cached_products, save_cached_products


STOP_WORDS = {
    "de", "la", "el", "los", "las", "del", "y", "e", "a", "al", "en",
    "por", "con", "sin", "para", "x", "cerveza", "cafe", "leche", "pan",
    "g", "gr", "kg", "ml", "cc", "l", "lt", "pack", "sixpack",
}


def _query_keywords(query: str) -> List[str]:
    words = re.sub(r"[^\w\s]", " ", query.lower()).split()
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]


def _product_matches(product_name: str, keywords: List[str]) -> bool:
    if not keywords:
        return True
    name_lower = re.sub(r"(\d+)\s+(ml|cc|g|gr|kg|l|lt)", r"\1\2", product_name.lower())
    matches = sum(1 for k in keywords if k in name_lower)
    return matches >= min(2, len(keywords))


VTEX_BASE_URLS = {
    "Carrefour": "https://www.carrefour.com.ar",
    "Changomas": "https://www.masonline.com.ar",
    "Disco": "https://www.disco.com.ar",
    "Jumbo": "https://www.jumbo.com.ar",
}


async def search_vtex(
    store_name: str,
    query: str,
    max_results: int = 20,
) -> List[ProductResult]:
    query = re.sub(r"[^\w\sáéíóúñü\-]", "", query)[:100]

    cached, last_updated = get_cached_products(store_name, query)
    if cached is not None and last_updated is not None:
        return cached

    base = VTEX_BASE_URLS.get(store_name)
    if not base:
        return []

    url = f"{base}/api/catalog_system/pub/products/search/{query}"
    params = {"_from": 0, "_to": max_results - 1}

    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
        try:
            r = await client.get(url, params=params)
            if r.status_code not in (200, 206):
                return cached if cached else []
            data = r.json()
        except Exception:
            return cached if cached else []

    results: List[ProductResult] = []
    keywords = _query_keywords(query)
    for p in data:
        name = p.get("productName", "")
        brand = p.get("brand", "")
        items = p.get("items", [])
        if not items:
            continue

        item = items[0]
        sellers = item.get("sellers", [])
        if not sellers:
            continue

        offer = sellers[0].get("commertialOffer", {})
        is_available = offer.get("IsAvailable", True)
        available_qty = offer.get("AvailableQuantity", 0)
        if not is_available or available_qty < 1:
            continue

        price = offer.get("Price", 0)
        if not price:
            continue

        if not _product_matches(name, keywords):
            continue

        unit = item.get("measurementUnit", "u")
        unit_mult = item.get("unitMultiplier", 1)
        if unit_mult and unit_mult != 1:
            unit = f"{unit_mult}{unit}"

        image_url = None
        images = item.get("images", [])
        if images:
            image_url = images[0].get("imageUrl")

        results.append(ProductResult(
            name=name,
            price=float(price),
            unit=unit,
            brand=brand,
            store=store_name,
            url=p.get("link") or f"{base}/search?q={query}",
            details=name,
            image_url=image_url,
        ))

    save_cached_products(store_name, query, results)
    return results
