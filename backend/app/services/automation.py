import asyncio
from playwright.async_api import async_playwright
from typing import List, Dict

class RealCartService:
    async def add_to_carrefour_cart(self, credentials: Dict, items: List[str]):
        """
        Automatización real para Carrefour Argentina.
        """
        async with async_playwright() as p:
            # Lanzamos el navegador
            browser = await p.chromium.launch(headless=False) # False para ver el proceso en desarrollo
            context = await browser.new_context()
            page = await context.new_page()

            try:
                print(f"[Playwright] Navegando a Carrefour...")
                await page.goto("https://www.carrefour.com.ar/", wait_until="networkidle")
                
                # 1. Login (Selectores típicos de VTEX)
                print(f"[Playwright] Intentando Login...")
                await page.click(".vtex-login-2-x-display--vtex-id-link-checkout") # Botón login
                await page.fill("input[name='email']", credentials['email'])
                await page.fill("input[name='password']", credentials['password'])
                await page.click(".vtex-login-2-x-sendButton")
                
                await page.wait_for_load_state("networkidle")

                # 2. Agregar items
                for item in items:
                    print(f"[Playwright] Buscando: {item}...")
                    # Selector de búsqueda Carrefour
                    search_input = page.locator("input[placeholder*='Buscar']").first
                    await search_input.fill(item)
                    await search_input.press("Enter")
                    
                    # Esperar a los resultados
                    await page.wait_for_selector(".vtex-product-summary-2-x-container", timeout=10000)
                    
                    # Clic en el primer botón de "Agregar" que esté visible
                    add_button = page.locator("button:has-text('Agregar')").first
                    if await add_button.is_visible():
                        await add_button.click()
                        print(f"[Playwright] + {item} agregado.")
                    
                    await page.wait_for_timeout(1500)

                print("[Playwright] Proceso terminado con éxito.")
                return True

            except Exception as e:
                print(f"[Playwright] Error en la automatización: {e}")
                return False
            finally:
                await browser.close()
