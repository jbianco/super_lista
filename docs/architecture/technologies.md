# Technologies & Tools

## 1. Frontend

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **react** | ^19.2.6 | UI component library — declarative rendering with hooks |
| **react-dom** | ^19.2.6 | DOM renderer for React |
| **axios** | ^1.16.1 | HTTP client — all communication with the FastAPI backend |
| **lucide-react** | ^1.16.0 | SVG icon set — used for UI icons (Edit3, X, Zap, Send, etc.) |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **typescript** | ~6.0.2 | Type system — static analysis, type checking |
| **vite** | ^8.0.12 | Build tool + dev server with HMR |
| **@vitejs/plugin-react** | ^6.0.1 | Vite plugin for React Fast Refresh |
| **eslint** | ^10.3.0 | Static code analysis |
| **typescript-eslint** | ^8.59.2 | TypeScript ESLint rules |
| **eslint-plugin-react-hooks** | ^7.1.1 | React Hooks correctness rules |
| **@types/react** | ^19.2.14 | React type definitions |
| **@types/react-dom** | ^19.2.3 | ReactDOM type definitions |
| **@types/node** | ^24.12.3 | Node.js type definitions (for vite.config.ts) |

### Frontend Architecture

```
SPA (Single Page Application)
├── No routing library — single <App> component renders everything
├── No state management library — useState + useEffect only
├── No CSS framework — custom CSS variables + flexbox/grid
├── PWA — vite-plugin-pwa con service worker, precaching, runtime cache para API
└── Testing — vitest + @testing-library/react (37 tests)
```

### Browser Storage

| Key | Data Stored | Format | Update Frequency |
|-----|-------------|--------|-----------------|
| `sl_lists` | Shopping lists with items, quantities, selected products | `ShoppingList[]` JSON | On every list mutation |
| `sl_activeId` | Currently active list ID | `string` | On list switch |
| `sl_stores` | Selected stores for comparison | `string[]` | On store toggle |
| `sl_results` | Comparison results from API | `Record<string, Record<string, Product>>` | On every comparison |
| `sl_overrides` | Per-cell product overrides and exclusion flags | `Record<string, Record<string, {overrideProduct?, excluded}>>` | On cell edit/exclude |

All five keys are persisted via a single `useEffect` on every render of the relevant state. Credentials (`sl_creds`) were removed from localStorage in Phase 1 — they live only in React state (in-memory) and are discarded on page refresh.

---

## 2. Backend

### Runtime Dependencies

| Package | Version Constraint | Purpose |
|---------|-------------------|---------|
| **fastapi** | >=0.136.0 | Web framework — async route handlers, request validation via Pydantic |
| **uvicorn[standard]** | >=0.34.0 | ASGI server — runs the FastAPI application |
| **sqlmodel** | >=0.0.22 | ORM — combines SQLAlchemy ORM with Pydantic validation |
| **httpx** | >=0.28.0 | Async HTTP client — external API calls to VTEX catalog |
| **beautifulsoup4** | >=4.14.0 | HTML parser — available for future scraping needs |
| **playwright** | >=1.59.0 | Browser automation — real cart interaction (VTEX login + add to cart) |
| **python-jose[cryptography]** | >=3.5.0 | JWT handling — create/verify access tokens |
| **python-multipart** | >=0.0.28 | Form data parsing — required by FastAPI |
| **pydantic-settings** | >=2.14.0 | Settings management — environment variable loading |
| **slowapi** | >=0.1.10 | Rate limiting — 60 req/min global, 10/min register, 20/min login |

### Dev Dependencies

| Package | Version Constraint | Purpose |
|---------|-------------------|---------|
| **pytest** | >=8.3.0 | Test framework |
| **pytest-asyncio** | >=0.24.0 | Async test support for pytest |

### Backend Architecture

```
FastAPI Application
├── CORS: configurable via CORS_ORIGINS env var
├── Routes: /api/* (budget, product-options, alternatives, savings-plan, cart, auth, price-history)
├── Database: SQLite via SQLModel (User, StoreCredential, ShoppingList, ListItem, ProductCache, PriceHistory)
├── Authentication: JWT via python-jose (register, login, me, credentials CRUD)
├── Rate Limiting: slowapi (60/min global, 10/min register, 20/min login)
├── Audit Logging: middleware HTTP que loguea METHOD /path STATUS DURATIONms
└── Testing: pytest with pytest-asyncio (34 tests)
```

---

## 3. API Management

### Internal API (Backend → Frontend)

| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|-------------|----------|---------|
| GET | `/` | — | `{message}` | Health check |
| POST | `/api/budget` | `{items: string[], stores?: string[]}` | `{budgets: Record<store, {items, total}>}` | Best prices per store (registra price history automáticamente) |
| POST | `/api/product-options` | `{query: string, stores?: string[]}` | `{characteristics: [...], cheapest: ProductResult}` | Wizard options grouped by characteristic → brand → price |
| POST | `/api/alternatives` | `{query: string, stores?: string[]}` | `AlternativeGroup[]` | Fuzzy matched alternatives >80% similarity |
| POST | `/api/savings-plan` | `{items: string[], stores?: string[]}` | `{splits: [...], grand_total, total_saved}` | Optimal split purchase plan |
| POST | `/api/cart` | `{store_name, credentials, items}` | `{success: boolean, results: CartItemResult[]}` | Add items to store cart (per-item status) |
| GET | `/api/price-history` | `?store=X&query=Y&limit=30` | `PriceHistoryEntry[]` | Historial de precios de un producto |
| POST | `/api/auth/register` | `{username, password}` | `TokenResponse` | Crear usuario (10/min rate limit) |
| POST | `/api/auth/login` | `{username, password}` | `TokenResponse` | Login (20/min rate limit) |
| GET | `/api/auth/me` | `Authorization: Bearer <token>` | `{id, username}` | Perfil del usuario autenticado |
| POST | `/api/auth/credentials` | `{store_name, email, password}` | `StoreCredential` | Guardar credenciales de tienda |
| GET | `/api/auth/credentials` | — | `StoreCredential[]` | Listar credenciales del usuario |
| DELETE | `/api/auth/credentials/{id}` | — | `{ok: true}` | Eliminar credencial de tienda |

### External API (Backend → VTEX)

| Store | VTEX Base URL | API Endpoint |
|-------|---------------|-------------|
| Carrefour | `https://www.carrefour.com.ar` | `/api/catalog_system/pub/products/search/{query}` |
| Changomas | `https://www.masonline.com.ar` | `/api/catalog_system/pub/products/search/{query}` |
| Disco | `https://www.disco.com.ar` | `/api/catalog_system/pub/products/search/{query}` |
| Jumbo | `https://www.jumbo.com.ar` | `/api/catalog_system/pub/products/search/{query}` |

Parameters: `_from=0&_to=19` (returns up to 20 products).  
Client: `httpx.AsyncClient` with 15s timeout and `follow_redirects=True`.

### API Proxy (Dev)

Vite dev server proxies `/api/*` requests to `http://localhost:8000` (configured in `vite.config.ts`).

---

## 4. Data Management

### Data Analysis
- **Product matching**: Keyword-based filtering — extracts significant words from the search query (excluding stop words like "de", "la", "cerveza", "leche") and requires at least 2 keyword matches in the product name.
- **Fuzzy matching**: `difflib.SequenceMatcher` with >80% similarity threshold for grouping alternatives across stores.
- **Price comparison**: Cheapest product per query per store, with "Mínimo" badge highlighting.
- **Price aging**: Color-coded freshness indicators (1d pink, 3d darker pink, 7d+ watery red).
- **Price history**: Automatic recording of every price fetched via `/api/budget`. Graph display on frontend with % change notifications (🔻 price dropped, 🔺 price increased).

### Data Storage
- **Product Cache**: SQLite via `ProductCache` model. Products stored as JSON strings. 6-hour TTL. Lookup by (store, query).
- **Price History**: SQLite via `PriceHistory` model. Records every price fetch with timestamp. Queried by (store, query) or (store, product_name).
- **User Data**: SQLite via SQLModel — `User`, `ShoppingList`, `ListItem`, `StoreCredential` models with JWT auth, register/login endpoints, credentials CRUD.
- **Browser Storage**: localStorage — 6 keys for lists, results, credentials, overrides, preferences.

### Data Update
- **Cache-first strategy**: `search_vtex` checks `get_cached_products()` before hitting the API. If cache is fresh (< 6h), returns cached data. Otherwise, fetches from VTEX API and stores in cache.
- **Manual refresh**: Per-store "Refrescar" button forces re-fetch by the user.
- **No webhook/push updates**: No real-time data — all updates are pull-based (user action or cache expiry).

### Data Provisioning
- **VTEX Catalog API**: Real supermarket product data via HTTP GET
- **No pre-seeded catalog**: All data is fetched live from supermarket APIs. No static product database.

---

## 5. Cart Management

| Service | Technology | Status | Stores Supported |
|---------|-----------|--------|-----------------|
| `CartService` | `asyncio.sleep` (simulated) | Active, wired to `/api/cart` | All 4 (but does nothing) |
| `RealCartService` | Playwright (Chromium) | Active behind `USE_REAL_CART` feature flag | Carrefour only |

### RealCartService
- Feature flag: `USE_REAL_CART=false` por defecto
- Import lazy de Playwright (no requiere playwright instalado si `USE_REAL_CART=false`)
- Timeout + retry: `_safe_operation()` con 30s timeout, 3 retries
- Per-item results: `CartResponse.results` con `query`, `status`, `error`
- Loguea cada paso del automation flow

---

## 6. Authentication & Credential Handling

### Current State
- **JWT authentication system is active.** `User` and `StoreCredential` SQLModel tables are used by auth endpoints.
- `python-jose[cryptography]` generates and verifies JWT tokens.
- Password hashing: SHA-256 + salt via `hashlib` + `secrets` (no external bcrypt dependency).
- Auth endpoints: `POST /register` (201), `POST /login` (200), `GET /me` (200/401), `POST/GET/DELETE /auth/credentials`.
- Existing budget/cart endpoints use `get_optional_user` — work both with and without auth token.
- Store credentials (email, password) are stored **in the server database**, never in localStorage.
- Frontend keeps credentials **in-memory only** (React state, no localStorage persistence).
- When the user clicks "Carrito", frontend sends in-memory credentials to `POST /api/cart`.
- CORS origins configurable via `CORS_ORIGINS` env var (comma-separated).

---

## 7. Data Locality

| Data | Location | Encrypted? | Backed Up? |
|------|----------|-----------|------------|
| Shopping lists | Browser localStorage | No | No |
| Store credentials | Server SQLite (StoreCredential table) | No | No |
| Comparison results | Browser localStorage (cache) | No | No |
| Product cache | Server SQLite (`ProductCache`) | No | No |
| Price history | Server SQLite (`PriceHistory`) | No | No |
| User accounts | Server SQLite (`User` table) | No | No |

---

## 8. Other Tools & Infrastructure

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | (via nvm/nvmrc) | JavaScript runtime for frontend tooling |
| **npm** | (bundled with Node) | Package manager for frontend |
| **Python** | 3.13 | Backend runtime |
| **pip** | (bundled with Python) | Package manager for backend |
| **venv** | (stdlib) | Python virtual environment |
| **SQLite** | (built-in) | Embedded database (no separate server) |
| **Git** | — | Version control |
| **GitHub** | — | Code hosting |

### Infrastructure

| Tool | Version | Purpose |
|------|---------|---------|
| **Docker** | — | Containerization: backend (python:3.13-slim) + frontend (multi-stage node→nginx) |
| **docker-compose** | — | Orchestration: backend + frontend, SQLite volume, healthcheck |
| **GitHub Actions** | — | CI/CD: 4 jobs (backend test, frontend lint, frontend build, frontend test) |
| **Playwright Chromium** | — | Browser automation installed in Docker backend image (lazy import) |
