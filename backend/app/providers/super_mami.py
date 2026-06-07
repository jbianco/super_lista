import httpx
from bs4 import BeautifulSoup
from typing import List
import asyncio
import random
from app.providers.base import BaseSupermarketProvider, ProductResult

class SuperMamiProvider(BaseSupermarketProvider):
    @property
    def store_name(self) -> str:
        return "Super Mami"

    async def search_product(self, query: str) -> List[ProductResult]:
        # Simulamos una pequeña latencia de red
        await asyncio.sleep(0.5)
        
        # Datos simulados basados en una búsqueda real
        # En un entorno real, aquí iría el scraping si el sitio lo permite
        mock_data = [
            {"name": f"{query} Primera Marca", "price": random.uniform(1000, 2500)},
            {"name": f"{query} Marca Propia", "price": random.uniform(800, 1500)},
            {"name": f"{query} Premium", "price": random.uniform(2500, 4000)},
        ]
        
        results = []
        for item in mock_data:
            results.append(ProductResult(
                name=item["name"],
                price=round(item["price"], 2),
                unit="u",
                store=self.store_name,
                url="https://www.dinoonline.com.ar/super/..."
            ))
            
        return results
