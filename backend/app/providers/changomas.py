from typing import List
from app.providers.base import BaseSupermarketProvider, ProductResult
from app.scrapers.vtex import search_vtex


class ChangomasProvider(BaseSupermarketProvider):
    @property
    def store_name(self) -> str:
        return "Changomas"

    async def search_product(self, query: str) -> List[ProductResult]:
        return await search_vtex("Changomas", query)
