# Issue: Agregar thumbnail de producto

**Creado:** 2026-07-03
**Branch:** `feat/thumbnail-producto`

## Descripción
Agregar la imagen del producto (thumbnail) obtenida desde cada proveedor (VTEX y MercadoLibre) en tres lugares: tabla de comparación, popover de detalle, y ProductWizard.

## Cambios Realizados

### Backend
- **`backend/app/providers/mercadolibre.py`**: Extracción de `thumbnail` en API path (`item.get("thumbnail")`) y Playwright path (`img[src]`)
- **`backend/app/schemas.py`**: Campo `image_url: Optional[str]` en `ProductResponse`
- **`backend/app/routers/budget.py`**: `image_url` incluido en `_product_response()`

### Frontend
- **`frontend/src/api.ts`**: Campo `image_url?: string` en `ProductResult`
- **`frontend/src/components/ComparisonTable.tsx`**: Thumbnail 40×40 en celda + `ProductDetailModal` con imagen grande al hacer clic
- **`frontend/src/ProductWizard.tsx`**: Imagen en step price (48px), confirm_lowest (96px) y done (64px)
- **`frontend/src/App.css`**: Estilos para `.prod-header`, `.product-thumbnail`, `.detail-overlay`, `.detail-modal`
- **`frontend/src/ProductWizard.css`**: Estilos para `.price-thumb`, `.lowest-image`, `.done-image`, `.price-card-row`

## Criterios de Aceptación
- [x] MercadoLibre extrae thumbnail vía API y Playwright
- [x] ProductResponse incluye image_url
- [x] api.ts tipa image_url
- [x] Thumbnail 40×40 en tabla (siempre visible, click abre detalle)
- [x] Popover modal con imagen grande + nombre, marca, precio, unidad, tienda, link
- [x] Imagen en ProductWizard (price, confirm_lowest, done)
- [x] Tests: 34 backend + 37 frontend pasan
- [x] Sin cambios de categoría

## Archivos Modificados
```
backend/app/providers/mercadolibre.py   | +2 líneas (API), +4 líneas (Playwright)
backend/app/schemas.py                   | +1 línea
backend/app/routers/budget.py            | +1 línea
frontend/src/api.ts                      | +1 línea
frontend/src/components/ComparisonTable.tsx | +56 líneas
frontend/src/ProductWizard.tsx           | +13 líneas
frontend/src/App.css                     | +99 líneas
frontend/src/ProductWizard.css           | +44 líneas
```
