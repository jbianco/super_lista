import asyncio
import os
from typing import List, Dict
from app.schemas import CartItemResult, CartResponse

STORES_WITH_AUTOMATION = {"Carrefour"}


class RealCartService:
    async def add_to_cart(self, store_name: str, credentials: Dict, items: List[Dict]) -> CartResponse:
        from playwright.async_api import async_playwright

        if store_name not in STORES_WITH_AUTOMATION:
            raise ValueError(f"Automation not available for {store_name}")

        results: List[CartItemResult] = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() == "true")
            context = await browser.new_context()
            page = await context.new_page()

            try:
                print(f"[Playwright] Navegando a {store_name}...")
                await self._safe_operation(
                    lambda: page.goto(self._store_url(store_name), wait_until="networkidle"),
                    timeout=30,
                )

                await self._login(page, store_name, credentials)

                for item in items:
                    query = item.get("query", "")
                    qty = item.get("quantity", 1)
                    result = await self._add_item(page, store_name, query, qty)
                    results.append(result)

                print("[Playwright] Proceso terminado con éxito.")
                return CartResponse(success=True, results=results)

            except Exception as e:
                print(f"[Playwright] Error: {e}")
                return CartResponse(success=False, results=results)
            finally:
                await browser.close()

    async def _safe_operation(self, fn, timeout: int = 60, retries: int = 3):
        for attempt in range(retries):
            try:
                return await asyncio.wait_for(fn(), timeout=timeout)
            except (asyncio.TimeoutError, Exception) as e:
                if attempt == retries - 1:
                    raise
                print(f"[Playwright] Reintento {attempt + 1}/{retries} tras error: {e}")
                await asyncio.sleep(2)

    def _store_url(self, store_name: str) -> str:
        urls = {
            "Carrefour": "https://www.carrefour.com.ar/",
        }
        return urls.get(store_name, f"https://www.{store_name.lower()}.com.ar/")

    async def _login(self, page, store_name: str, credentials: Dict):
        if store_name == "Carrefour":
            print("[Playwright] Intentando login en Carrefour...")
            await page.click(".vtex-login-2-x-display--vtex-id-link-checkout")
            await page.fill("input[name='email']", credentials.get("email", ""))
            await page.fill("input[name='password']", credentials.get("password", ""))
            await page.click(".vtex-login-2-x-sendButton")
            await page.wait_for_load_state("networkidle")

    async def _add_item(self, page, store_name: str, query: str, quantity: int) -> CartItemResult:
        try:
            print(f"[Playwright] Buscando: {query}...")
            search_input = page.locator("input[placeholder*='Buscar']").first
            await search_input.fill(query)
            await search_input.press("Enter")

            await page.wait_for_selector(".vtex-product-summary-2-x-container", timeout=10000)

            add_button = page.locator("button:has-text('Agregar')").first
            if await add_button.is_visible():
                for _ in range(quantity):
                    await add_button.click()
                print(f"[Playwright] + {quantity}x {query} agregado.")
                return CartItemResult(query=query, status="added")

            print(f"[Playwright] {query}: botón 'Agregar' no encontrado")
            return CartItemResult(query=query, status="not_found", error="Producto sin botón Agregar")

        except Exception as e:
            print(f"[Playwright] Error agregando {query}: {e}")
            return CartItemResult(query=query, status="error", error=str(e))
