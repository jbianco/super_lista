import asyncio
import sys
import os

# Añadir el directorio actual al path para poder importar app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.budget import BudgetService

async def test_budget():
    service = BudgetService()
    lista_compras = ["Leche entera", "Pan de molde", "Yerba mate 1kg"]
    
    print(f"Buscando precios para: {', '.join(lista_compras)}...\n")
    
    budgets = await service.get_best_budget(lista_compras)
    
    for store, data in budgets.items():
        print(f"--- {store} ---")
        print(f"Total: ${data['total']:.2f}")
        
        # Probar generación de mensaje de WhatsApp
        ws_message = service.generate_whatsapp_message(data, store)
        print("\n[Vista previa mensaje WhatsApp]:")
        print(ws_message)
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(test_budget())
