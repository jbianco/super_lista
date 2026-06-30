import random
import asyncio
from typing import List, Optional
from app.providers.base import ProductResult

PRODUCTS_BY_CATEGORY = {
    "leche": [
        {"name": "Leche Entera La Serenísima 1L", "brand": "La Serenísima", "unit": "1L", "base_price": 1550, "details": "Leche entera larga vida 1L"},
        {"name": "Leche Entera Ilolay 1L", "brand": "Ilolay", "unit": "1L", "base_price": 1400, "details": "Leche entera larga vida 1L"},
        {"name": "Leche Entera Tregar 1L", "brand": "Tregar", "unit": "1L", "base_price": 1250, "details": "Leche entera larga vida 1L"},
        {"name": "Leche Entera Sancor 1L", "brand": "Sancor", "unit": "1L", "base_price": 1600, "details": "Leche entera larga vida 1L"},
        {"name": "Leche Entera La Serenísima 2L", "brand": "La Serenísima", "unit": "2L", "base_price": 2500, "details": "Leche entera larga vida 2L"},
        {"name": "Leche Entera Ilolay 2L", "brand": "Ilolay", "unit": "2L", "base_price": 2350, "details": "Leche entera larga vida 2L"},
        {"name": "Leche Descremada La Serenísima 1L", "brand": "La Serenísima", "unit": "1L", "base_price": 1550, "details": "Leche descremada larga vida 1L"},
        {"name": "Leche Descremada Ilolay 1L", "brand": "Ilolay", "unit": "1L", "base_price": 1450, "details": "Leche descremada larga vida 1L"},
        {"name": "Leche Entera en Polvo Nido 800g", "brand": "Nido", "unit": "800g", "base_price": 3200, "details": "Leche en polvo entera 800g"},
    ],
    "yerba": [
        {"name": "Yerba Mate Taragüí 1kg", "brand": "Taragüí", "unit": "1kg", "base_price": 2100, "details": "Yerba mate tradicional 1kg"},
        {"name": "Yerba Mate Playadito 1kg", "brand": "Playadito", "unit": "1kg", "base_price": 2300, "details": "Yerba mate suave 1kg"},
        {"name": "Yerba Mate Amanda 1kg", "brand": "Amanda", "unit": "1kg", "base_price": 1900, "details": "Yerba mate tradicional 1kg"},
        {"name": "Yerba Mate Cruz de Malta 1kg", "brand": "Cruz de Malta", "unit": "1kg", "base_price": 2400, "details": "Yerba mate tradicional 1kg"},
        {"name": "Yerba Mate La Merced 1kg", "brand": "La Merced", "unit": "1kg", "base_price": 2800, "details": "Yerba mate premium 1kg"},
        {"name": "Yerba Mate Taragüí 500g", "brand": "Taragüí", "unit": "500g", "base_price": 1100, "details": "Yerba mate tradicional 500g"},
        {"name": "Yerba Mate Amanda 500g", "brand": "Amanda", "unit": "500g", "base_price": 1050, "details": "Yerba mate tradicional 500g"},
    ],
    "pan": [
        {"name": "Pan de Molde Blanco Bimbo 400g", "brand": "Bimbo", "unit": "400g", "base_price": 1600, "details": "Pan de molde blanco 400g"},
        {"name": "Pan de Molde Blanco Fargo 400g", "brand": "Fargo", "unit": "400g", "base_price": 1350, "details": "Pan de molde blanco 400g"},
        {"name": "Pan de Molde Blanco Bimbo 600g", "brand": "Bimbo", "unit": "600g", "base_price": 2000, "details": "Pan de molde blanco 600g"},
        {"name": "Pan de Molde Integral Bimbo 400g", "brand": "Bimbo", "unit": "400g", "base_price": 1800, "details": "Pan de molde integral 400g"},
        {"name": "Pan de Molde Artesano 400g", "brand": "Artesano", "unit": "400g", "base_price": 1200, "details": "Pan de molde artesanal 400g"},
        {"name": "Pan de Hamburguesa Bimbo 4u", "brand": "Bimbo", "unit": "4u", "base_price": 1400, "details": "Pan de hamburguesa 4 unidades"},
    ],
    "arroz": [
        {"name": "Arroz Largo Fino Gallo 1kg", "brand": "Gallo", "unit": "1kg", "base_price": 1900, "details": "Arroz largo fino 1kg"},
        {"name": "Arroz Largo Fino Molinos Ala 1kg", "brand": "Molinos Ala", "unit": "1kg", "base_price": 1650, "details": "Arroz largo fino 1kg"},
        {"name": "Arroz Integral Gallo 1kg", "brand": "Gallo", "unit": "1kg", "base_price": 2100, "details": "Arroz integral 1kg"},
        {"name": "Arroz Largo Fino Luchetti 1kg", "brand": "Luchetti", "unit": "1kg", "base_price": 1550, "details": "Arroz largo fino 1kg"},
        {"name": "Arroz Largo Fino Gallo 500g", "brand": "Gallo", "unit": "500g", "base_price": 1000, "details": "Arroz largo fino 500g"},
    ],
    "fideos": [
        {"name": "Fideos Tallarín Matarazzo 500g", "brand": "Matarazzo", "unit": "500g", "base_price": 950, "details": "Fideos tallarín 500g"},
        {"name": "Fideos Spaghetti Marolio 500g", "brand": "Marolio", "unit": "500g", "base_price": 750, "details": "Fideos spaghetti 500g"},
        {"name": "Fideos Mostachol Lucchetti 500g", "brand": "Lucchetti", "unit": "500g", "base_price": 900, "details": "Fideos mostachol 500g"},
        {"name": "Fideos Spaghetti Don Vicente 500g", "brand": "Don Vicente", "unit": "500g", "base_price": 700, "details": "Fideos spaghetti 500g"},
        {"name": "Fideos Tallarín Matarazzo 1kg", "brand": "Matarazzo", "unit": "1kg", "base_price": 1700, "details": "Fideos tallarín 1kg"},
    ],
    "huevos": [
        {"name": "Huevos Blancos 6u", "brand": "Huevo Feliz", "unit": "6u", "base_price": 900, "details": "Huevos blancos 6 unidades"},
        {"name": "Huevos Blancos 12u", "brand": "Huevo Feliz", "unit": "12u", "base_price": 1600, "details": "Huevos blancos 12 unidades"},
        {"name": "Huevos Colorados 12u", "brand": "Campo Feliz", "unit": "12u", "base_price": 1800, "details": "Huevos colorados 12 unidades"},
        {"name": "Huevos Blancos 6u", "brand": "La María", "unit": "6u", "base_price": 850, "details": "Huevos blancos 6 unidades"},
    ],
    "aceite": [
        {"name": "Aceite de Girasol Cocinero 1.5L", "brand": "Cocinero", "unit": "1.5L", "base_price": 2200, "details": "Aceite de girasol 1.5 litros"},
        {"name": "Aceite de Girasol Natura 1.5L", "brand": "Natura", "unit": "1.5L", "base_price": 2000, "details": "Aceite de girasol 1.5 litros"},
        {"name": "Aceite de Oliva Cocinero 500ml", "brand": "Cocinero", "unit": "500ml", "base_price": 3000, "details": "Aceite de oliva 500ml"},
        {"name": "Aceite de Girasol Lira 1.5L", "brand": "Lira", "unit": "1.5L", "base_price": 1900, "details": "Aceite de girasol 1.5 litros"},
    ],
    "gaseosa": [
        {"name": "Coca-Cola 2.25L", "brand": "Coca-Cola", "unit": "2.25L", "base_price": 2800, "details": "Gaseosa Coca-Cola 2.25 litros"},
        {"name": "Sprite 2.25L", "brand": "Sprite", "unit": "2.25L", "base_price": 2600, "details": "Gaseosa Sprite 2.25 litros"},
        {"name": "Pepsi 2.25L", "brand": "Pepsi", "unit": "2.25L", "base_price": 2500, "details": "Gaseosa Pepsi 2.25 litros"},
        {"name": "Seven Up 2.25L", "brand": "Seven Up", "unit": "2.25L", "base_price": 2400, "details": "Gaseosa Seven Up 2.25 litros"},
    ],
    "cerveza": [
        {"name": "Cerveza Quilmes 1L", "brand": "Quilmes", "unit": "1L", "base_price": 1500, "details": "Cerveza Quilmes 1 litro"},
        {"name": "Cerveza Brahma 1L", "brand": "Brahma", "unit": "1L", "base_price": 1400, "details": "Cerveza Brahma 1 litro"},
        {"name": "Cerveza Andes 1L", "brand": "Andes", "unit": "1L", "base_price": 1600, "details": "Cerveza Andes 1 litro"},
        {"name": "Cerveza Quilmes 473ml", "brand": "Quilmes", "unit": "473ml", "base_price": 900, "details": "Cerveza Quilmes 473ml"},
        {"name": "Cerveza Stella Artois 355ml", "brand": "Stella Artois", "unit": "355ml", "base_price": 1100, "details": "Cerveza Stella Artois 355ml"},
        {"name": "Cerveza Corona 355ml", "brand": "Corona", "unit": "355ml", "base_price": 1300, "details": "Cerveza Corona 355ml"},
        {"name": "Cerveza Patagonia 725ml", "brand": "Patagonia", "unit": "725ml", "base_price": 2400, "details": "Cerveza Patagonia 725ml"},
        {"name": "Cerveza Heineken 473ml", "brand": "Heineken", "unit": "473ml", "base_price": 1200, "details": "Cerveza Heineken 473ml"},
        {"name": "Cerveza Miller 473ml", "brand": "Miller", "unit": "473ml", "base_price": 1100, "details": "Cerveza Miller 473ml"},
        {"name": "Cerveza Schneider 1L", "brand": "Schneider", "unit": "1L", "base_price": 1350, "details": "Cerveza Schneider 1 litro"},
    ],
    "default": [
        {"name": "Producto Primera Marca", "brand": "Primera Marca", "unit": "u", "base_price": 1500, "details": "Producto de primera marca"},
        {"name": "Producto Económico", "brand": "Económico", "unit": "u", "base_price": 900, "details": "Producto económico"},
        {"name": "Producto Premium", "brand": "Premium", "unit": "u", "base_price": 2500, "details": "Producto premium"},
    ],
}


STORE_CONFIGS = {
    "Carrefour": {
        "carries": {
            "leche": ["Leche Entera La Serenísima 1L", "Leche Entera Ilolay 1L", "Leche Entera Tregar 1L", "Leche Entera La Serenísima 2L", "Leche Descremada La Serenísima 1L", "Leche Descremada Ilolay 1L", "Leche Entera en Polvo Nido 800g"],
            "yerba": ["Yerba Mate Taragüí 1kg", "Yerba Mate Playadito 1kg", "Yerba Mate Amanda 500g"],
            "pan": ["Pan de Molde Blanco Bimbo 400g", "Pan de Molde Blanco Fargo 400g", "Pan de Molde Blanco Bimbo 600g", "Pan de Molde Integral Bimbo 400g", "Pan de Hamburguesa Bimbo 4u"],
            "arroz": ["Arroz Largo Fino Gallo 1kg", "Arroz Largo Fino Molinos Ala 1kg", "Arroz Largo Fino Luchetti 1kg", "Arroz Largo Fino Gallo 500g"],
            "fideos": ["Fideos Tallarín Matarazzo 500g", "Fideos Spaghetti Marolio 500g", "Fideos Mostachol Lucchetti 500g", "Fideos Tallarín Matarazzo 1kg"],
            "huevos": ["Huevos Blancos 6u", "Huevos Blancos 12u", "Huevos Colorados 12u"],
            "aceite": ["Aceite de Girasol Cocinero 1.5L", "Aceite de Girasol Natura 1.5L", "Aceite de Oliva Cocinero 500ml"],
            "gaseosa": ["Coca-Cola 2.25L", "Sprite 2.25L"],
            "cerveza": ["Cerveza Quilmes 1L", "Cerveza Brahma 1L", "Cerveza Quilmes 473ml", "Cerveza Stella Artois 355ml", "Cerveza Corona 355ml", "Cerveza Patagonia 725ml", "Cerveza Heineken 473ml", "Cerveza Schneider 1L"],
        },
        "price_range": (0.9, 1.1),
        "extra_products": {
            "default": [
                {"name": "{} Carrefour Classic", "brand": "Carrefour Classic", "unit": "u", "base_price": 800, "details": "Producto marca Carrefour Classic"},
                {"name": "Primer Precio {}", "brand": "Primer Precio", "unit": "u", "base_price": 600, "details": "Producto primer precio"},
            ],
        },
        "search_url": "https://www.carrefour.com.ar/search?q={}",
    },
    "Changomas": {
        "carries": {
            "leche": ["Leche Entera La Serenísima 1L", "Leche Entera Ilolay 1L", "Leche Entera Sancor 1L", "Leche Entera Ilolay 2L", "Leche Descremada Ilolay 1L"],
            "yerba": ["Yerba Mate Taragüí 1kg", "Yerba Mate Amanda 1kg", "Yerba Mate La Merced 1kg", "Yerba Mate Amanda 500g"],
            "pan": ["Pan de Molde Blanco Bimbo 400g", "Pan de Molde Blanco Fargo 400g", "Pan de Molde Artesano 400g", "Pan de Hamburguesa Bimbo 4u"],
            "arroz": ["Arroz Largo Fino Gallo 1kg", "Arroz Integral Gallo 1kg", "Arroz Largo Fino Luchetti 1kg"],
            "fideos": ["Fideos Tallarín Matarazzo 500g", "Fideos Spaghetti Marolio 500g", "Fideos Mostachol Lucchetti 500g", "Fideos Spaghetti Don Vicente 500g"],
            "huevos": ["Huevos Blancos 6u", "Huevos Blancos 12u", "Huevos Blancos 6u", "Huevos Colorados 12u"],
            "aceite": ["Aceite de Girasol Cocinero 1.5L", "Aceite de Girasol Lira 1.5L"],
            "gaseosa": ["Pepsi 2.25L", "Seven Up 2.25L"],
            "cerveza": ["Cerveza Quilmes 1L", "Cerveza Andes 1L", "Cerveza Brahma 1L", "Cerveza Miller 473ml", "Cerveza Schneider 1L", "Cerveza Patagonia 725ml", "Cerveza Heineken 473ml"],
        },
        "price_range": (0.85, 1.15),
        "extra_products": {
            "default": [
                {"name": "Great Value {}", "brand": "Great Value", "unit": "u", "base_price": 750, "details": "Producto Great Value"},
                {"name": "{} Marca Lider", "brand": "Marca Lider", "unit": "u", "base_price": 1100, "details": "Producto Marca Lider"},
            ],
        },
        "search_url": "https://www.masonline.com.ar/search?q={}",
    },
    "Super Mami": {
        "carries": {
            "leche": ["Leche Entera La Serenísima 1L", "Leche Entera Tregar 1L", "Leche Entera La Serenísima 2L", "Leche Descremada La Serenísima 1L"],
            "yerba": ["Yerba Mate Taragüí 1kg", "Yerba Mate Cruz de Malta 1kg", "Yerba Mate Playadito 1kg", "Yerba Mate Taragüí 500g"],
            "pan": ["Pan de Molde Blanco Bimbo 400g", "Pan de Molde Blanco Bimbo 600g", "Pan de Molde Artesano 400g", "Pan de Molde Integral Bimbo 400g"],
            "arroz": ["Arroz Largo Fino Gallo 1kg", "Arroz Largo Fino Molinos Ala 1kg", "Arroz Integral Gallo 1kg"],
            "fideos": ["Fideos Tallarín Matarazzo 500g", "Fideos Mostachol Lucchetti 500g", "Fideos Spaghetti Don Vicente 500g"],
            "huevos": ["Huevos Blancos 6u", "Huevos Blancos 12u"],
            "aceite": ["Aceite de Girasol Natura 1.5L", "Aceite de Girasol Lira 1.5L", "Aceite de Oliva Cocinero 500ml"],
            "gaseosa": ["Coca-Cola 2.25L", "Sprite 2.25L", "Pepsi 2.25L"],
            "cerveza": ["Cerveza Quilmes 1L", "Cerveza Stella Artois 355ml", "Cerveza Andes 1L", "Cerveza Corona 355ml", "Cerveza Schneider 1L"],
        },
        "price_range": (0.95, 1.15),
        "extra_products": {
            "default": [
                {"name": "{} Marca Propia", "brand": "Marca Propia Dino", "unit": "u", "base_price": 850, "details": "Producto marca propia Dino"},
                {"name": "{} Premium", "brand": "Premium Dino", "unit": "u", "base_price": 2000, "details": "Producto premium Dino"},
            ],
        },
        "search_url": "https://www.dinoonline.com.ar/super/search?q={}",
    },
    "Tadicor": {
        "carries": {
            "leche": ["Leche Entera Ilolay 1L", "Leche Entera Tregar 1L", "Leche Entera Ilolay 2L", "Leche Descremada Ilolay 1L"],
            "yerba": ["Yerba Mate Taragüí 1kg", "Yerba Mate Amanda 1kg", "Yerba Mate Taragüí 500g"],
            "pan": ["Pan de Molde Blanco Fargo 400g", "Pan de Molde Artesano 400g", "Pan de Molde Blanco Bimbo 600g"],
            "arroz": ["Arroz Largo Fino Molinos Ala 1kg", "Arroz Largo Fino Luchetti 1kg"],
            "fideos": ["Fideos Tallarín Matarazzo 500g", "Fideos Mostachol Lucchetti 500g", "Fideos Spaghetti Marolio 500g"],
            "huevos": ["Huevos Blancos 6u", "Huevos Blancos 12u", "Huevos Blancos 6u", "Huevos Colorados 12u"],
            "aceite": ["Aceite de Girasol Cocinero 1.5L", "Aceite de Girasol Lira 1.5L"],
            "gaseosa": ["Coca-Cola 2.25L", "Seven Up 2.25L"],
            "cerveza": ["Cerveza Quilmes 1L", "Cerveza Brahma 1L", "Cerveza Quilmes 473ml", "Cerveza Miller 473ml", "Cerveza Schneider 1L"],
        },
        "price_range": (0.8, 1.0),
        "extra_products": {
            "default": [
                {"name": "{} Mayorista x Unidad", "brand": "Mayorista Tadi", "unit": "u", "base_price": 700, "details": "Producto mayorista Tadicor"},
                {"name": "{} Oferta Tadi", "brand": "Oferta Tadi", "unit": "u", "base_price": 900, "details": "Producto oferta Tadicor"},
            ],
        },
        "search_url": "https://www.tadicor.com.ar/search?q={}",
    },
}


CATEGORY_KEYWORDS = {
    "leche": ["leche", "lácteo", "lacteo"],
    "yerba": ["yerba", "mate"],
    "pan": ["pan", "pan de molde", "pan lactal", "pan hamburguesa"],
    "arroz": ["arroz"],
    "fideos": ["fideo", "tallarin", "spaghetti", "mostachol", "ñoqui"],
    "huevos": ["huevo"],
    "aceite": ["aceite"],
    "gaseosa": ["gaseosa", "coca", "pepsi", "sprite", "seven"],
    "cerveza": ["cerveza", "quilmes", "brahma", "andes", "stella", "corona", "patagonia", "heineken", "miller", "schneider"],
}


def detect_category(query: str) -> str:
    query_lower = query.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in query_lower:
                return category
    return "default"


async def search_store(
    query: str,
    store_name: str,
    config: dict,
    latency: float,
) -> List[ProductResult]:
    await asyncio.sleep(latency)
    results: List[ProductResult] = []
    price_min, price_max = config["price_range"]

    # Search across ALL categories the store carries
    for category, carried_names in config["carries"].items():
        catalog_items = PRODUCTS_BY_CATEGORY.get(category, [])
        for item in catalog_items:
            if item["name"] in carried_names:
                multiplier = random.uniform(price_min, price_max)
                price = round(item["base_price"] * multiplier, 2)
                results.append(ProductResult(
                    name=item["name"],
                    price=price,
                    unit=item["unit"],
                    brand=item["brand"],
                    store=store_name,
                    url=config["search_url"].format(query),
                    details=item["details"],
                ))

    # Add store-specific products for the detected category
    detected_category = detect_category(query)
    extras = config["extra_products"].get(detected_category, config["extra_products"].get("default", []))
    for extra in extras:
        multiplier = random.uniform(price_min, price_max)
        price = round(extra["base_price"] * multiplier, 2)
        results.append(ProductResult(
            name=extra["name"].format(query),
            price=price,
            unit=extra["unit"],
            brand=extra["brand"],
            store=store_name,
            url=config["search_url"].format(query),
            details=extra["details"],
        ))

    # Filter by query relevance — all significant query words must appear in the name
    query_words = [w for w in query.lower().split() if len(w) > 2]
    if query_words:
        results = [r for r in results if all(w in r.name.lower() for w in query_words)]

    return results
