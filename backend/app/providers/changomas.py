import asyncio
import random
from typing import List
from app.providers.base import BaseSupermarketProvider, ProductResult

class ChangomasProvider(BaseSupermarketProvider):
    @property
    def store_name(self) -> str:
        return "Changomas"

    async def search_product(self, query: str) -> List[ProductResult]:
        await asyncio.sleep(0.35)
        mock_data = [
            {"name": f"{query} Great Value", "price": random.uniform(850, 1600)},
            {"name": f"Leche La Serenísima 1L", "price": random.uniform(1500, 2000)}, # Marca común
            {"name": f"{query} Marca Lider", "price": random.uniform(1400, 2500)},
        ]
        
        results = []
        for item in mock_data:
            results.append(ProductResult(
                name=item["name"],
                price=round(item["price"], 2),
                unit="u",
                store=self.store_name,
                url="https://www.masonline.com.ar/..."
            ))
        return results
