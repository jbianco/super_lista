# Modular Architecture

## 1. Building Blocks

### Frontend (React SPA)
```
frontend/src/
├── api.ts                  # HTTP client (axios → FastAPI), all API types
├── api-schema.d.ts         # Generated TypeScript types from OpenAPI spec
├── App.tsx                 # Main component: composes hooks + components
├── App.css                 # Global styles (CSS variables, layout, components)
├── ProductWizard.tsx       # Multi-step product selector modal
├── ProductWizard.css       # Wizard-specific styles
├── main.tsx                # React entry point
├── index.css               # CSS reset
├── types.ts                # Shared TypeScript interfaces (ShoppingItem, etc.)
├── utils.ts                # Pure functions (calculateTotal, ageClass, getWhatsAppLink)
├── hooks/
│   ├── useLists.ts         # List CRUD + localStorage persistence
│   ├── useComparison.ts    # Comparison state, overrides, async operations
│   └── useCredentials.ts   # In-memory credentials state
├── components/
│   ├── Sidebar.tsx         # List sidebar with rename-on-double-click
│   ├── ListEditor.tsx      # Store pills, credentials panel, item CRUD
│   ├── ComparisonTable.tsx  # Results table with overrides, exclusion, price history
│   └── QueryEditor.tsx     # Query editing dialog before cell override
└── test/
    ├── setup.ts            # Vitest setup (testing-library matchers)
    ├── utils.test.ts       # 13 tests for calculateTotal, ageClass, getWhatsAppLink
    └── hooks/
        ├── useLists.test.ts       # 13 tests for list CRUD + persistence
        └── useComparison.test.ts  # 11 tests for comparison + overrides + cart
```

### Backend (FastAPI)
```
backend/app/
├── main.py                 # App entry point, CORS, rate limiting, audit logging, router registration
├── schemas.py              # Pydantic request/response models
├── db/
│   ├── models.py           # SQLModel table definitions (User, StoreCredential, PriceHistory, etc.)
│   └── session.py          # SQLite engine + session factory
├── providers/
│   ├── base.py             # Abstract provider + ProductResult
│   ├── carrefour.py        # → search_vtex("Carrefour")
│   ├── changomas.py        # → search_vtex("Changomas")
│   ├── disco.py            # → search_vtex("Disco")
│   └── jumbo.py            # → search_vtex("Jumbo")
├── routers/
│   ├── auth.py             # API endpoints: /auth/register, /login, /me, /credentials CRUD
│   ├── budget.py           # API endpoints: /budget, /product-options, /alternatives, /savings-plan, /price-history
│   └── cart.py             # API endpoint: /cart (with USE_REAL_CART feature flag)
├── scrapers/
│   └── vtex.py             # VTEX API client with caching + keyword filter + query sanitization
├── services/
│   ├── auth.py             # JWT create/verify, password hashing, get_current_user/get_optional_user
│   ├── budget.py           # BudgetService: best budget, alternatives, savings plan
│   ├── cache.py            # ProductCache CRUD (SQLite, 6h TTL)
│   ├── cart.py             # Simulated CartService (logging only)
│   ├── automation.py       # Playwright RealCartService (lazy import, timeout+retry, per-item results)
│   ├── price_history.py    # PriceHistory CRUD: record_price, get_history, get_history_by_product
│   └── rate_limit.py       # Shared Limiter instance (60/min global)
└── tests/
    ├── conftest.py          # Pytest fixtures (clean_db, client, auth_token, budget_service)
    ├── test_budget_service.py   # 17 async tests
    ├── test_cart_service.py     # 3 cart service tests
    ├── test_cart_router.py      # 4 cart router tests
    └── test_auth.py            # 10 auth tests
```

---

## 2. Module Separation by Role

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                      │
│  ┌──────────┐   ┌──────────────┐  ┌──────────────────────┐   │
│  │ api.ts   │   │ App.tsx      │  │ ProductWizard.tsx    │   │
│  │ (axios)  │   │(orchestrator)│  │ (multi-step modal)   │   │
│  └────┬─────┘   └──────┬───────┘  └──────────────────────┘   │
│       │                │                                     │
│       └── localStorage ┘ (6 keys: lists, stores, results,    │
│                            credentials, overrides, activeId) │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP (axios /api/*)
                       │
┌──────────────────────┴───────────────────────────────────────┐
│                     BACKEND (FastAPI)                        │
│                                                              │
│  ┌──────────────┐    ┌────────────────────────────────┐      │
│  │ routers/     │───▶│ services/                      │      │
│  │ budget.py    │    │ budget.py (BudgetService)      │      │
│  │ cart.py      │    │ cart.py (CartService)          │      │
│  └──────┬───────┘    │ automation.py (RealCartService)│      │
│         │            └───────────────────┬────────────┘      │
│         │                                │                   │
│         │            ┌──────────────────┐│                   │
│         │            │ scrapers/vtex.py ││                   │
│         │            │ (VTEX API client)││                   │
│         │            └────────┬─────────┘│                   │
│         │                     │          │                   │
│         │            ┌────────▼──────────▼───────┐           │
│         │            │ providers/                │           │
│         │            │ base.py (abstract)        │           │
│         │            │ carrefour.py              │           │
│         │            │ changomas.py              │           │
│         │            │ disco.py                  │           │
│         │            │ jumbo.py                  │           │
│         │            └───────────────────────────┘           │
│         │                                                    │
│         │            ┌──────────────────────────┐            │
│         └───────────▶│ db/                      │            │
│                      │ models.py (SQLModel)     │            │
│                      │ session.py (SQLite)      │            │
│                      └──────────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

### Frontend Modules

| Module | Role | Dependencies |
|--------|------|-------------|
| `api.ts` | HTTP layer — all backend communication | axios |
| `App.tsx` | Application orchestrator — state, layout, event handlers | api.ts, ProductWizard |
| `ProductWizard.tsx` | Feature component — multi-step product search/selection | api.ts |
| `App.css` | Visual layer — all styles via CSS variables | — |
| `localStorage` | Persistence layer — 6 keys, no encryption | — |

### Backend Modules

| Module | Role | Dependencies |
|--------|------|-------------|
| `routers/` | API gateway — HTTP entry points, request validation | services/, schemas.py |
| `services/` | Business logic — orchestration, aggregation, decisions | providers/, scrapers/, db/ |
| `providers/` | Supermarket abstraction — uniform product search interface | scrapers/ |
| `scrapers/` | External API integration — VTEX catalog API | httpx |
| `db/` | Data persistence — SQLite via SQLModel | sqlmodel |
| `schemas.py` | Data contracts — Pydantic request/response models | pydantic |

---

## 3. Inter-Module Communication

### Frontend → Backend
```
axios GET  /api/health              →  main.py → { message }
axios POST /api/budget              →  routers/budget.py → BudgetService.get_best_budget() → record_price()
axios POST /api/product-options     →  routers/budget.py → BudgetService → providers → scrapers  
axios POST /api/alternatives        →  routers/budget.py → BudgetService.get_alternatives()
axios POST /api/savings-plan        →  routers/budget.py → BudgetService.get_max_savings_plan()
axios GET  /api/price-history       →  routers/budget.py → price_history.get_history()
axios POST /api/cart                →  routers/cart.py → CartService | RealCartService (feature flag)
axios POST /api/auth/register       →  routers/auth.py → auth.hash_password() → create_access_token()
axios POST /api/auth/login          →  routers/auth.py → auth.verify_password() → create_access_token()
axios GET  /api/auth/me             →  routers/auth.py → auth.get_current_user()
axios POST|GET|DELETE /api/auth/credentials → routers/auth.py → StoreCredential CRUD
```

### Backend Internal
```
BudgetService
  ├── _search_and_tag(provider, query) → provider.search_product(query)
  │     └── Provider.search_product() → search_vtex(store, query)
  │           └── search_vtex() → get_cached_products() | httpx.get(VTEX API) → save_cached_products()
  ├── get_alternatives() → difflib.SequenceMatcher (fuzzy match)
  └── get_best_budget() → if no products: auto-calls get_alternatives() for that store

CartService
  └── add_to_cart() → asyncio.sleep (simulated) → returns per-item results

RealCartService
  └── add_to_cart() → lazy import playwright → _safe_operation() (30s timeout, 3 retries)
       └── Per-store routing → store-specific add_to_*_cart()

PriceHistoryService
  ├── record_price() → INSERT into PriceHistory table
  └── get_history() / get_history_by_product() → SELECT from PriceHistory

AuthService
  ├── hash_password() → SHA-256 + salt
  ├── verify_password() → hash comparison
  ├── create_access_token() → JWT encode (python-jose)
  └── get_current_user() / get_optional_user() → JWT decode → DB lookup
```

### Data Contracts
```
Pydantic → JSON → TypeScript (generated via openapi-typescript from /openapi.json)

ProductResult (Python) ↔ ProductResult (TypeScript)
  name, price, brand, unit, store, url, details, last_updated, price_change_pct

BudgetResponse
  budgets: Record<store, { items: [{ query, product: ProductResult, alternatives?: ProductResult[] }], total, whatsapp_message }>

CartResponse
  { success: boolean, results: [{ query, status, error? }] }

Auth
  TokenResponse: { access_token, token_type }
  StoreCredential: { id, store_name, email }
```

---

## 4. Historical Architectural Issues (Resolved)

### 4.1 Tight coupling in App.tsx ✅
- **Resolved**: App.tsx is now ~170 lines. State management extracted to hooks (`useLists`, `useComparison`, `useCredentials`). UI extracted to components (`Sidebar`, `ListEditor`, `ComparisonTable`, `QueryEditor`).

### 4.2 No typed API client generation ✅
- **Resolved**: `openapi-typescript` generates `src/api-schema.d.ts` from the FastAPI OpenAPI spec. `npm run api-types` regenerates types.

### 4.3 Provider/Scraper overlap ✅
- **Resolved**: Dead code removed (`catalog.py`, `super_mami.py`, `tadicor.py`). Scrapers consolidated to `vtex.py` with keyword matching, stock filter, and query sanitization.

### 4.4 No frontend module splitting ✅
- **Resolved**: Frontend split into `types.ts`, `utils.ts`, 3 custom hooks, 4 components. Each module has a single responsibility.

### 4.5 Cart service is simulated ➡️
- **Partially resolved**: `RealCartService` wired behind `USE_REAL_CART` feature flag with lazy Playwright import, timeout+retry, and per-item results. Only Carrefour supported.

### 4.6 No testing for frontend ✅
- **Resolved**: 37 frontend tests (vitest + testing-library) across 3 test files. Backend expanded to 34 tests (budget, cart service, cart router, auth).

---

## 5. Completed Modular Improvements

### Phase A: Frontend Component Extraction ✅ (Phase 2)

```
App.tsx (~170 lines, composed of):
├── components/
│   ├── Sidebar.tsx            # List management panel
│   ├── ListEditor.tsx         # Item CRUD + store pills + credentials
│   ├── ComparisonTable.tsx    # Full comparison grid with price history chart
│   └── QueryEditor.tsx        # Query editing dialog before override
├── hooks/
│   ├── useComparison.ts       # Comparison state, overrides, async operations
│   ├── useLists.ts            # List CRUD + localStorage persistence
│   └── useCredentials.ts      # In-memory credentials (no localStorage)
├── types.ts                   # Shared TypeScript interfaces
└── utils.ts                   # Pure functions (calculateTotal, ageClass, getWhatsAppLink)
```

### Phase B: API Contract Alignment ✅ (Phase 7)

- `openapi-typescript` generates `src/api-schema.d.ts` from FastAPI OpenAPI spec
- Script: `npm run api-types`

### Phase C: Provider/Scraper Cleanup ✅ (Phase 1)

- Removed `catalog.py`, `super_mami.py`, `tadicor.py`
- Consolidated to single `vtex.py` with keyword matching, stock filter, query sanitization

### Phase D: Cart Service Wiring ✅ (Phase 4)

- `RealCartService` wired behind `USE_REAL_CART` feature flag
- Lazy Playwright import (no crash when playwright not installed)
- Timeout (30s) + retry (3 attempts) via `_safe_operation()`
- Per-item results (`CartResponse.results`)
- CartItem model with `query`, `quantity`, `name`

### Phase E: Testing Infrastructure ✅ (Phase 3)

- Vitest + @testing-library/react (37 frontend tests)
- 3 test files: utils, useLists, useComparison
- Backend: 34 tests (budget service, cart service, cart router, auth)

---

## 6. Interconnection Summary

```
┌─────────────────┐     HTTP (JSON)     ┌────────────────────┐
│  Frontend       │────────────────────▶│  FastAPI Routers   │
│  (React 19)     │◀────────────────────│  /budget, /cart    │
│  ┌───────────┐  │    typed responses  │  ┌───────────────┐ │
│  │ api.ts    │──┘                     │  │ schemas.py    │ │
│  │ (axios)   │                        │  └───────────────┘ │
│  └───────────┘                        └─────────┬──────────┘
│  ┌───────────┐                                  │
│  │ hooks/    │── state management               │
│  │ (custom)  │── localStorage persistence       │
│  └───────────┘                                  │
│  ┌───────────┐                                  │
│  │ components│── UI rendering                   │
│  │ (per role)│── user interaction               │
│  └───────────┘                                  │
└─────────────────┘                               │
                                                  │
                     ┌────────────────────────────┘
                     │
          ┌──────────▼──────────────────┐
          │  BudgetService              │
          │  ┌────────────────────────┐ │
          │  │ Provider Layer         │ │
          │  │ (Strategy Pattern)     │ │
          │  └───────────┬────────────┘ │
          │              │              │
          │  ┌───────────▼────────────┐ │
          │  │ VTEX Scraper           │ │
          │  │ (httpx + cache)        │ │
          │  └───────────┬────────────┘ │
          │              │              │
          │  ┌───────────▼────────────┐ │
          │  │ Cache Layer            │ │
          │  │ (SQLite, 6h TTL)       │ │
          │  └────────────────────────┘ │
          └─────────────────────────────┘
```

Each module communicates through:
- **HTTP/JSON** — Frontend ↔ Backend (axios ↔ FastAPI)
- **Python async calls** — Service → Provider → Scraper (asyncio.gather)
- **SQLModel/SQLite** — Cache + future User data
- **localStorage** — Frontend persistence (6 keys, no server round-trip)
- **Props + callbacks** — React component tree communication
