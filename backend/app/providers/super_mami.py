from typing import List
from app.providers.base import BaseSupermarketProvider, ProductResult
from app.providers.catalog import STORE_CONFIGS, search_store


class SuperMamiProvider(BaseSupermarketProvider):
    @property
    def store_name(self) -> str:
        return "Super Mami"

    async def search_product(self, query: str) -> List[ProductResult]:
        return await search_store(
            query,
            self.store_name,
            STORE_CONFIGS["Super Mami"],
            latency=0.5,
        )
