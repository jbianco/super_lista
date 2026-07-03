import os
import re
import httpx
from typing import List, Optional
from app.providers.base import BaseSupermarketProvider, ProductResult

ML_ACCESS_TOKEN = os.getenv("ML_ACCESS_TOKEN", "")
ML_API_BASE = "https://api.mercadolibre.com"
ML_CATEGORY_SUPERMERCADO = "MLA1051"


async def _search_api(query: str) -> List[ProductResult]:
    headers = {
        "Authorization": f"Bearer {ML_ACCESS_TOKEN}",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
        r = await client.get(
            f"{ML_API_BASE}/sites/MLA/search",
            params={"q": query, "category": ML_CATEGORY_SUPERMERCADO, "limit": 20},
            headers=headers,
        )
        if r.status_code != 200:
            return []
        data = r.json()

    results: List[ProductResult] = []
    for item in data.get("results", []):
        title = item.get("title", "")
        price = item.get("price", 0)
        if not title or not price:
            continue

        attrs = {a["id"]: a.get("value_name", "") for a in item.get("attributes", []) if a.get("value_name")}
        brand = attrs.get("BRAND", "")
        unit = attrs.get("PRESENTATION", attrs.get("UNIT", "u"))

        results.append(ProductResult(
            name=title,
            price=float(price),
            unit=unit,
            brand=brand or "MercadoLibre",
            store="MercadoLibre",
            url=item.get("permalink", ""),
            details=title,
            image_url=item.get("thumbnail", None),
        ))

    return results


async def _search_playwright(query: str) -> List[ProductResult]:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return []

    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=True)
    page = await browser.new_page()
    page.set_default_timeout(15000)

    try:
        url = f"https://www.mercadolibre.com.ar/supermercado/{query.replace(' ', '%20')}"
        await page.goto(url, wait_until="domcontentloaded")

        try:
            await page.wait_for_selector('[class*="ui-search-item__title"], [class*="poly-card"], [class*="andes-money-amount__fraction"]', timeout=10000)
        except Exception:
            pass

        results: List[ProductResult] = []
        cards = await page.query_selector_all('[class*="ui-search-result"], [class*="poly-card"]')
        cards = cards[:20]

        for card in cards:
            try:
                el_title = await card.query_selector('[class*="ui-search-item__title"], [class*="poly-component__title"]')
                if not el_title:
                    continue
                title = (await el_title.inner_text()).strip()

                el_price = await card.query_selector('[class*="andes-money-amount__fraction"]')
                if not el_price:
                    continue
                price_text = (await el_price.inner_text()).strip().replace(".", "").replace(",", ".")
                try:
                    price = float(price_text)
                except ValueError:
                    continue

                el_link = await card.query_selector("a")
                link = await el_link.get_attribute("href") if el_link else ""

                el_img = await card.query_selector("img")
                img_url = await el_img.get_attribute("src") if el_img else None

                results.append(ProductResult(
                    name=title,
                    price=price,
                    unit="u",
                    brand="MercadoLibre",
                    store="MercadoLibre",
                    url=link or "",
                    details=title,
                    image_url=img_url,
                ))
            except Exception:
                continue

        return results
    except Exception:
        return []
    finally:
        await browser.close()
        await pw.stop()


class MercadoLibreProvider(BaseSupermarketProvider):
    @property
    def store_name(self) -> str:
        return "MercadoLibre"

    async def search_product(self, query: str) -> List[ProductResult]:
        if ML_ACCESS_TOKEN:
            results = await _search_api(query)
            if results:
                return results
        return await _search_playwright(query)
