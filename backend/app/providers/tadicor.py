import asyncio
import random
from typing import List
from app.providers.base import BaseSupermarketProvider, ProductResult

class TadicorProvider(BaseSupermarketProvider):
    @property
    def store_name(self) -> str:
        return "Tadicor"

    async def search_product(self, query: str) -> List[ProductResult]:
        # Simulamos latencia de red
        await asyncio.sleep(0.4)
        
        # Tadicor suele tener precios competitivos por bulto/mayorista
        # Simulamos datos realistas para este súper
        mock_data = [
            {"name": f"{query} Mayorista x Unidad", "price": random.uniform(900, 2000)},
            {"name": f"{query} Oferta Tadi", "price": random.uniform(700, 1400)},
        ]
        
        results = []
        for item in mock_data:
            results.append(ProductResult(
                name=item["name"],
                price=round(item["price"], 2),
                unit="u",
                store=self.store_name,
                url="https://www.tadicor.com.ar/..."
            ))
            
        return results
