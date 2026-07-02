from typing import List, Dict, Optional
import asyncio
import difflib
from app.providers.base import ProductResult, BaseSupermarketProvider
from app.providers.carrefour import CarrefourProvider
from app.providers.changomas import ChangomasProvider
from app.providers.disco import DiscoProvider
from app.providers.jumbo import JumboProvider


class BudgetService:
    def __init__(self):
        self.all_providers: List[BaseSupermarketProvider] = [
            CarrefourProvider(),
            ChangomasProvider(),
            DiscoProvider(),
            JumboProvider(),
        ]

    async def get_best_budget(self, items_queries: List[str], enabled_stores: Optional[List[str]] = None) -> Dict:
        """
        Calcula el presupuesto solo para las tiendas habilitadas.
        Si enabled_stores es None, usa todas.
        """
        budgets_by_store = {}
        
        active_providers = self.all_providers
        if enabled_stores:
            active_providers = [p for p in self.all_providers if p.store_name in enabled_stores]
        
        tasks = []
        for provider in active_providers:
            for query in items_queries:
                tasks.append(self._search_and_tag(provider, query))
        
        search_results = await asyncio.gather(*tasks)
        
        for res in search_results:
            store = res["store"]
            if store not in budgets_by_store:
                budgets_by_store[store] = {"items": [], "total": 0.0}
            
            if not res["products"]:
                alt_groups = await self.get_alternatives(res["query"], [res["store"]])
                alternatives = [g["product"] for g in alt_groups]
                budgets_by_store[store]["items"].append({
                    "query": res["query"],
                    "product": None,
                    "alternatives": alternatives,
                })
                continue
            
            best_product = min(res["products"], key=lambda p: p.price)
            
            budgets_by_store[store]["items"].append({
                "query": res["query"],
                "product": best_product,
            })
            budgets_by_store[store]["total"] += best_product.price

        return budgets_by_store

    async def _search_and_tag(self, provider: BaseSupermarketProvider, query: str):
        products = await provider.search_product(query)
        return {
            "store": provider.store_name,
            "query": query,
            "products": products
        }

    async def get_alternatives(self, query: str, enabled_stores: Optional[List[str]] = None) -> List[Dict]:
        """
        Busca alternativas y agrupa productos similares usando Fuzzy Matching.
        """
        active_providers = self.all_providers
        if enabled_stores:
            active_providers = [p for p in self.all_providers if p.store_name in enabled_stores]
            
        tasks = [p.search_product(query) for p in active_providers]
        results = await asyncio.gather(*tasks)
        
        all_products = []
        for store_results in results:
            all_products.extend(store_results)
            
        # Agrupamiento por similitud de nombres
        groups = []
        for p in all_products:
            found_group = False
            for group in groups:
                # Si el nombre es > 80% similar, lo consideramos el mismo producto
                similarity = difflib.SequenceMatcher(None, p.name.lower(), group["name"].lower()).ratio()
                if similarity > 0.8:
                    group["count"] += 1
                    group["stores"].append(p.store)
                    # Mantener el precio más bajo como referencia del grupo
                    if p.price < group["product"].price:
                        group["product"] = p
                    found_group = True
                    break
            
            if not found_group:
                groups.append({
                    "name": p.name,
                    "product": p,
                    "count": 1,
                    "stores": [p.store]
                })
            
        return sorted(groups, key=lambda x: (-x["count"], x["product"].price))

    async def get_max_savings_plan(self, items_queries: List[str], enabled_stores: Optional[List[str]] = None) -> Dict:
        """
        Divide la lista entre las tiendas seleccionadas para obtener el precio mínimo total.
        """
        active_providers = self.all_providers
        if enabled_stores:
            active_providers = [p for p in self.all_providers if p.store_name in enabled_stores]

        # 1. Buscar todos los productos para todos los queries en todas las tiendas
        tasks = []
        for provider in active_providers:
            for query in items_queries:
                tasks.append(self._search_and_tag(provider, query))
        
        all_results = await asyncio.gather(*tasks)

        # 2. Para cada producto buscado, encontrar el precio mínimo absoluto entre todas las tiendas
        best_plan = {"splits": {}, "total_saved": 0.0, "grand_total": 0.0}
        
        query_to_best_price = {}
        for res in all_results:
            if not res["products"]: continue
            
            query = res["query"]
            cheapest_in_store = min(res["products"], key=lambda p: p.price)
            
            if query not in query_to_best_price or cheapest_in_store.price < query_to_best_price[query]["product"].price:
                query_to_best_price[query] = {
                    "product": cheapest_in_store,
                    "store": res["store"]
                }

        # 3. Organizar el plan por tienda
        for query, info in query_to_best_price.items():
            store = info["store"]
            if store not in best_plan["splits"]:
                best_plan["splits"][store] = {"items": [], "subtotal": 0.0}

            best_plan["splits"][store]["items"].append({
                "product": info["product"],
                "query": query,
            })
            best_plan["splits"][store]["subtotal"] += info["product"].price
            best_plan["grand_total"] += info["product"].price

        return best_plan

    def generate_whatsapp_message(self, budget: Dict, store_name: str) -> str:
        """Genera el texto para compartir por WhatsApp."""
        message = f"*🛒 Presupuesto SuperLista: {store_name}*\n\n"
        for item in budget["items"]:
            product = item["product"]
            message += f"• {product.name}: *${product.price}*\n"
        
        message += f"\n💰 *Total Estimado: ${round(budget['total'], 2)}*"
        message += "\n\nGenerado con SuperLista 🚀"
        return message
