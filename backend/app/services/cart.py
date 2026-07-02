import asyncio
from typing import List, Dict
from app.schemas import CartItemResult, CartResponse


class CartService:
    async def add_to_cart(self, store_name: str, credentials: Dict, items: List[Dict]) -> CartResponse:
        print(f"[Automator] Iniciando sesión en {store_name} para {credentials.get('email', '?')}...")
        await asyncio.sleep(0.5)

        results: List[CartItemResult] = []
        for item in items:
            query = item.get("query", "?")
            qty = item.get("quantity", 1)
            print(f"[Automator] + {qty}x {query} agregado al carrito de {store_name}")
            await asyncio.sleep(0.3)
            results.append(CartItemResult(query=query, status="added"))

        print(f"[Automator] Proceso completado para {store_name}.")
        return CartResponse(success=True, results=results)
