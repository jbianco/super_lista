from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel


class ProductResult(BaseModel):
    name: str
    price: float
    unit: str
    brand: str
    store: str
    url: Optional[str] = None
    details: Optional[str] = None
    image_url: Optional[str] = None


class BaseSupermarketProvider(ABC):
    @property
    @abstractmethod
    def store_name(self) -> str:
        pass

    @abstractmethod
    async def search_product(self, query: str) -> List[ProductResult]:
        """Busca productos en el supermercado y devuelve una lista de resultados."""
        pass
