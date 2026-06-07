import asyncio
import sys
import os

# Añadir el directorio actual al path para poder importar app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.budget import BudgetService

async def test_alternatives():
    service = BudgetService()
    query = "Leche"
    
    print(f"Buscando alternativas para: {query}...\n")
    
    alternatives = await service.get_alternatives(query)
    
    print(f"{'Producto':<40} | {'Tiendas':<10} | {'Precio':<10}")
    print("-" * 65)
    for alt in alternatives:
        p = alt["product"]
        stores_str = f"({alt['count']}) " + ", ".join(alt["stores"])
        print(f"{p.name:<40} | {alt['count']:<10} | ${p.price:<10.2f}")

if __name__ == "__main__":
    asyncio.run(test_alternatives())
