from typing import List
from app.providers.base import BaseSupermarketProvider, ProductResult
from app.scrapers.vtex import search_vtex


class JumboProvider(BaseSupermarketProvider):
    @property
    def store_name(self) -> str:
        return "Jumbo"

    async def search_product(self, query: str) -> List[ProductResult]:
        return await search_vtex("Jumbo", query)
