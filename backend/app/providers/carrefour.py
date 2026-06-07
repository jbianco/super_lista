import asyncio
import random
from typing import List
from app.providers.base import BaseSupermarketProvider, ProductResult

class CarrefourProvider(BaseSupermarketProvider):
    @property
    def store_name(self) -> str:
        return "Carrefour"

    async def search_product(self, query: str) -> List[ProductResult]:
        await asyncio.sleep(0.3)
        mock_data = [
            {"name": f"{query} Carrefour Classic", "price": random.uniform(950, 1800)},
            {"name": f"Leche La Serenísima 1L", "price": random.uniform(1500, 2000)}, # Marca común
            {"name": f"Primer Precio {query}", "price": random.uniform(800, 1300)},
        ]
        
        results = []
        for item in mock_data:
            results.append(ProductResult(
                name=item["name"],
                price=round(item["price"], 2),
                unit="u",
                store=self.store_name,
                url="https://www.carrefour.com.ar/..."
            ))
        return results
