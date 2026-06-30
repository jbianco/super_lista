# SuperLista — Architecture Overview

## What is SuperLista?

SuperLista is a supermarket price comparison and cart automation web app targeting Argentine chains (Carrefour, Changomas, Super Mami, Tadicor). The user creates a shopping list and the app compares prices across stores, finds the optimal split-purchase plan, and can automate adding items to the real store's cart via Playwright.

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| **Backend** | Python 3.13, FastAPI 0.136, SQLModel, SQLite    |
|             | Playwright (browser automation)                 |
|             | httpx + BeautifulSoup4 (scraping stubs)         |
| **Frontend**| TypeScript 6, React 19.2, Vite 8               |
|             | axios (HTTP client, not yet wired)              |
|             | lucide-react (icons)                            |
| **Pattern** | Service-oriented backend, monolith frontend     |

---

## Directory Structure

```
super_lista/
├── start.sh                          # Launches both servers
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI entry point
│   │   ├── db/
│   │   │   ├── models.py             # SQLModel entities
│   │   │   └── session.py            # Engine & session factory
│   │   ├── providers/                # Supermarket API abstraction
│   │   │   ├── base.py               # Abstract provider + ProductResult
│   │   │   ├── carrefour.py          # Mock Carrefour
│   │   │   ├── changomas.py          # Mock Changomas
│   │   │   ├── super_mami.py         # Mock Super Mami
│   │   │   └── tadicor.py            # Mock Tadicor
│   │   └── services/                 # Business logic
│   │       ├── budget.py             # BudgetService
│   │       ├── cart.py               # Simulated CartService
│   │       └── automation.py         # RealCartService (Playwright)
│   └── tests/
│       ├── test_logic.py             # Budget end-to-end test
│       └── test_alternatives.py      # Alternatives fuzzy-match test
└── frontend/
    ├── index.html                    # Vite HTML entry
    ├── vite.config.ts                # Vite config (no proxy yet)
    ├── package.json                  # React 19, axios, lucide-react
    └── src/
        ├── main.tsx                  # React root (StrictMode)
        ├── App.tsx                   # Single-component UI
        ├── App.css                   # All styles
        └── index.css                 # Global reset
```

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                               │
├──────────────────────────┬──────────────────────────────────────────┤
│                          │                                          │
│         FRONTEND         │              BACKEND                     │
│     (React + Vite)       │         (FastAPI + Python)               │
│                          │                                          │
│  ┌──────────────────┐   │      ┌──────────────────────────────┐    │
│  │    App.tsx        │   │      │    main.py (FastAPI app)     │    │
│  │  (monolito SPA)   │   │      │  GET / (health)             │    │
│  │                   │   │      │  router * (not yet wired)   │    │
│  │  localStorage ◄──┤   │      └──────┬───────────────────────┘    │
│  │  (persistencia)  │   │             │                            │
│  │                   │   │      ┌──────▼───────────────────────┐    │
│  │  Mock prices ◄───┤   │      │     BudgetService             │    │
│  │  (getRandomBrand) │   │      │  get_best_budget()           │    │
│  │                   │   │      │  get_alternatives()          │    │
│  │  NO axios calls───┤   │      │  get_max_savings_plan()      │    │
│  │  to backend       │   │      │  generate_whatsapp_message() │    │
│  └──────────────────┘   │      └──────┬───────────────────────┘    │
│                          │             │                            │
│     Current state:       │      ┌──────▼───────────────────────┐    │
│     Frontend is fully    │      │  BaseSupermarketProvider     │    │
│     self-contained with  │      │  (ABC)  ──── ProductResult  │    │
│     mock data. Backend   │      ├─────────────────────────────┤    │
│     has all logic but    │      │  CarrefourProvider  (mock)  │    │
│     no endpoints.        │      │  ChangomasProvider  (mock)  │    │
│                          │      │  SuperMamiProvider  (mock)  │    │
│                          │      │  TadicorProvider    (mock)  │    │
│                          │      └─────────────────────────────┘    │
│                          │                                          │
│                          │      ┌──────────────────────────────┐    │
│                          │      │  CartService (simulated)     │    │
│                          │      │  RealCartService (Playwright)│    │
│                          │      └──────────────────────────────┘    │
│                          │                                          │
│                          │      ┌──────────────────────────────┐    │
│                          │      │  SQLModel + SQLite           │    │
│                          │      │  User, ShoppingList,         │    │
│                          │      │  ListItem, StoreCredential   │    │
│                          │      └──────────────────────────────┘    │
└──────────────────────────┴──────────────────────────────────────────┘
```

---

## Layer Responsibilities

### 1. Frontend (React SPA)

- **List management**: Create, rename, delete shopping lists (persisted in localStorage)
- **Item management**: Add, edit, remove, adjust quantity of items
- **Store selection**: Toggle which supermarkets to compare
- **Credentials storage**: Store email per-store for cart automation
- **Price comparison**: Currently generates mock prices client-side via `getRandomBrand()`
- **Results display**: Table showing product × store with prices, tooltips, totals
- **WhatsApp sharing**: Generates `wa.me` link with markdown summary
- **Cart automation**: Opens store cart URL in a new tab (simulated)

### 2. Backend API (FastAPI)

- **Entry point**: `app/main.py` — currently only exposes `GET /` health check
- **Startup**: Calls `init_db()` to create SQLite tables

### 3. Providers (Strategy Pattern)

Abstract interface `BaseSupermarketProvider` with one method `search_product(query) -> List[ProductResult]`. Each supermarket implements it:

| Provider          | Store Name   | Simulated Latency | Products per Query |
|-------------------|-------------|-------------------|-------------------|
| CarrefourProvider | Carrefour   | 0.3s             | 3                 |
| ChangomasProvider | Changomas   | 0.35s            | 3                 |
| SuperMamiProvider | Super Mami  | 0.5s             | 3                 |
| TadicorProvider   | Tadicor     | 0.4s             | 2                 |

All currently return randomly-generated prices. `SuperMamiProvider` also imports `httpx` and `BeautifulSoup4` for future real scraping.

### 4. Services

- **BudgetService**: Core business logic
  - `get_best_budget()` — For each store, finds cheapest product per query
  - `get_alternatives()` — Cross-store fuzzy matching via `difflib.SequenceMatcher` (>80% threshold)
  - `get_max_savings_plan()` — Optimal split-purchase: finds absolute cheapest per item across stores
  - `generate_whatsapp_message()` — Markdown-formatted share text

- **CartService**: Simulated cart automation with `asyncio.sleep` delays

- **RealCartService**: Real Playwright automation for Carrefour (VTEX selectors: login form, search input, "Agregar" button)

### 5. Database Models (SQLModel)

```
User (id, username, hashed_password)
 ├── ShoppingList (id, name, user_id, created_at)
 │     └── ListItem (id, query, quantity, shopping_list_id)
 └── StoreCredential (id, store_name, email, password, user_id)
```

---

## Current State & Key Gaps

1. **Frontend ↔ Backend disconnect**: Frontend uses client-side mock data. Backend has no API routes beyond `GET /`.
2. **No auth**: `User` model exists but no login/register endpoints or JWT.
3. **Plaintext passwords**: `StoreCredential.password` stored in plain text.
4. **No requirements.txt**: Backend deps are in a venv but not documented.
5. **Mock data everywhere**: All providers and the frontend generate random prices.
6. **Playwright is Carrefour-only**: RealCartService only implements Carrefour.
7. **No frontend tests**: Only backend has tests (pytest).
