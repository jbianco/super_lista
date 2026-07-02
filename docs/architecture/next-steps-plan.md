# Plan de Próximos Pasos

Basado en el análisis arquitectónico actual (`modular-architecture.md`, `technologies.md`, `security.md`) y el código existente.

---

## Resumen del Estado Actual

### ✅ Lo que funciona
- Comparación de precios reales vía API VTEX (4 supermercados)
- Búsqueda con filtro de stock (`IsAvailable`/`AvailableQuantity`)
- Filtro por coincidencia de nombre (`_product_matches` con stop words + sanitización)
- Caché de productos con TTL de 6 horas
- Wizard de selección de productos (característica → marca → precio)
- Override de producto por celda (editar/excluir)
- Refrescado individual por tienda
- Persistencia en localStorage (5 claves, sin credenciales)
- WhatsApp share
- Alternativas automáticas cuando un producto no tiene stock
- Historial de precios con gráfico y notificaciones de cambio (🔻/🔺)
- PWA (service worker + offline + instalable)
- Rate limiting (slowapi: 60/min global, 10/min register, 20/min login)
- Audit logging (log de METHOD /path STATUS DURATIONms)
- Autenticación JWT (register, login, me, credentials CRUD)
- Carrito real con Playwright (Carrefour, feature flag)
- Docker (multi-stage frontend + backend slim)
- CI/CD (GitHub Actions: 4 jobs)
- OpenAPI TypeScript generator
- 34 tests backend + 37 tests frontend

### ❌ Lo que falta / está incompleto
- Frontend auth integration (login/register UI, attach JWT to API calls)
- Component tests for Sidebar, ListEditor, ComparisonTable, QueryEditor, ProductWizard
- RealCartService expansion for Changomas, Disco, Jumbo
- HTTPS en producción (Caddy/Traefik)
- OAuth para credenciales de supermercados
- WebSockets para actualizaciones en tiempo real
- Server-side rendering (Next.js)

---

## Fase 1: Limpieza y Seguridad ✅

Todos los items completados en Phase 1 del desarrollo.

---

## Fase 2: Modularización Frontend ✅

Todos los items completados en Phase 2 del desarrollo.

---

## Fase 3: Testing ✅

Todos los items completados en Phase 3 del desarrollo.

---

## Fase 4: Carrito Real ✅

Todos los items completados en Phase 4 del desarrollo.

---

## Fase 5: Backend Auth ✅

Todos los items completados en Phase 5 del desarrollo.

---

## Fase 6: Producción ✅

Todos los items completados en Phase 6 del desarrollo.

---

## Fase 7: Mejoras Continuas ✅

### 7.1 Producto ✅
- ✅ Sugerir alternativas automáticamente cuando un producto no tiene stock
- ✅ Historial de precios por producto (PriceHistory model + endpoint + gráfico SVG)
- ✅ Notificaciones de cambios de precio (price_change_pct en ProductResponse, badges 🔻/🔺)

### 7.2 Técnico ✅
- ✅ OpenAPI TypeScript generator (openapi-typescript + npm run api-types)
- ✅ PWA (vite-plugin-pwa, service worker, precaching, runtime cache para API)
- WebSockets — no implementado (baja prioridad)

### 7.3 Seguridad ✅
- ✅ Rate limiting (slowapi, sin Redis — in-memory para single-instance)
- ✅ Auditoría de acceso (middleware HTTP logging)
- OAuth — no implementado (requiere integración con cada supermercado)
- SQLCipher — no implementado (requiere reemplazar sqlite3)

---

## Próximos Pasos (Fase 8+)

### Frontend Auth
- UI de login/register
- Store JWT in memory, attach to API calls
- Protected routes / conditional rendering based on auth state

### Más Tests
- Component tests: Sidebar, ListEditor, ComparisonTable, QueryEditor, ProductWizard
- E2E con Playwright: add item → compare → refresh

### Carrito Real
- Changomas, Disco, Jumbo Playwright selectors
- Más robustez en detección de login/captcha

### Infraestructura
- HTTPS con Caddy reverse proxy
- Deploy a VPS con docker-compose
- Dominio propio

### Features
- Soporte para más supermercados (Coto, Día)
- WebSockets para actualizaciones en tiempo real de comparación
- Server-side rendering (Next.js) si se necesita SEO

---

## Timeline Resumen

```
Fase 1: Limpieza + Seguridad ✅
Fase 2: Modularización Frontend ✅
Fase 3: Testing ✅
Fase 4: Carrito Real ✅
Fase 5: Backend Auth ✅
Fase 6: Producción (Docker + CI/CD) ✅
Fase 7: Mejoras Continuas ✅
```

Todas las 7 fases del plan original están completadas.
