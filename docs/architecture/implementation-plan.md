# Implementation Plan — Phase 1: Connect Frontend + Backend

## Goal

Replace the client-side mock data with real API calls from the backend `BudgetService`. The user should be able to click "Comparar Precios" and see results coming from the FastAPI backend (still using mocked provider data for now).

---

## Summary of Steps

| Step | What                      | Why                             | Files Changed           |
|------|---------------------------|---------------------------------|--------------------------|
| 1    | Add requirements.txt      | Document backend deps           | `backend/requirements.txt` (new) |
| 2    | Create FastAPI router     | Expose budget endpoints         | `backend/app/routers/budget.py` (new), `backend/app/main.py` |
| 3    | Add Pydantic request/response schemas | Type-safe API contract | `backend/app/schemas.py` (new) |
| 4    | Configure Vite proxy      | Forward /api to backend         | `frontend/vite.config.ts` |
| 5    | Add frontend API service  | Centralize axios calls          | `frontend/src/api.ts` (new) |
| 6    | Connect App.tsx to API    | Replace mock with real calls    | `frontend/src/App.tsx` |
| 7    | Add loading + error UI    | Feedback for network operations | `frontend/src/App.css`, `frontend/src/App.tsx` |
| 8    | End-to-end test           | Verify everything works         | —                        |

---

## Step 1 — Backend requirements.txt

**Why**: The backend dependencies are only in a venv. Documenting them enables reproducible setups.

**File**: `backend/requirements.txt`

```
fastapi>=0.136.0
uvicorn[standard]>=0.34.0
sqlmodel>=0.0.22
httpx>=0.28.0
beautifulsoup4>=4.13.0
playwright>=1.52.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
pytest>=8.0.0
pytest-asyncio>=0.25.0
```

---

## Step 2 — Pydantic Schemas

**Why**: Define the request/response contracts for the API.

**File**: `backend/app/schemas.py` (new)

```python
from pydantic import BaseModel
from typing import List, Optional

class BudgetRequest(BaseModel):
    items: List[str]           # ["leche", "pan", ...]
    stores: Optional[List[str]] = None  # None = all stores

class ProductResponse(BaseModel):
    name: str
    price: float
    unit: str
    store: str
    url: Optional[str] = None

class BudgetItem(BaseModel):
    query: str
    product: ProductResponse

class StoreBudget(BaseModel):
    items: List[BudgetItem]
    total: float
    whatsapp_message: str

class BudgetResponse(BaseModel):
    budgets: dict[str, StoreBudget]

class AlternativesRequest(BaseModel):
    query: str
    stores: Optional[List[str]] = None

class AlternativeGroup(BaseModel):
    name: str
    product: ProductResponse
    count: int
    stores: List[str]

class SavingsPlanRequest(BaseModel):
    items: List[str]
    stores: Optional[List[str]] = None

class SavingsPlanItem(BaseModel):
    product: ProductResponse
    store: str

class StoreSplit(BaseModel):
    items: List[SavingsPlanItem]
    subtotal: float

class SavingsPlanResponse(BaseModel):
    splits: dict[str, StoreSplit]
    grand_total: float
    total_saved: float
```

---

## Step 3 — FastAPI Router

**Why**: Expose the `BudgetService` methods as REST endpoints.

**File**: `backend/app/routers/__init__.py` (empty)

**File**: `backend/app/routers/budget.py` (new)

```python
from fastapi import APIRouter, HTTPException
from app.services.budget import BudgetService
from app.schemas import (
    BudgetRequest, BudgetResponse, StoreBudget, BudgetItem,
    ProductResponse, AlternativesRequest, AlternativeGroup,
    SavingsPlanRequest, SavingsPlanResponse, StoreSplit, SavingsPlanItem
)

router = APIRouter(prefix="/api", tags=["budget"])

@router.post("/budget", response_model=BudgetResponse)
async def get_budget(req: BudgetRequest):
    service = BudgetService()
    budgets = await service.get_best_budget(req.items, req.stores)
    result = {}
    for store, data in budgets.items():
        result[store] = StoreBudget(
            items=[BudgetItem(query=i["query"], product=ProductResponse(
                name=i["product"].name,
                price=i["product"].price,
                unit=i["product"].unit,
                store=i["product"].store,
                url=i["product"].url,
            )) for i in data["items"]],
            total=data["total"],
            whatsapp_message=service.generate_whatsapp_message(data, store)
        )
    return BudgetResponse(budgets=result)

@router.post("/alternatives", response_model=list[AlternativeGroup])
async def get_alternatives(req: AlternativesRequest):
    service = BudgetService()
    return await service.get_alternatives(req.query, req.stores)

@router.post("/savings-plan", response_model=SavingsPlanResponse)
async def get_savings_plan(req: SavingsPlanRequest):
    service = BudgetService()
    plan = await service.get_max_savings_plan(req.items, req.stores)
    result = {}
    for store, data in plan["splits"].items():
        result[store] = StoreSplit(
            items=[SavingsPlanItem(
                product=ProductResponse(
                    name=i.name, price=i.price, unit=i.unit,
                    store=i.store, url=i.url,
                ),
                store=i.store
            ) for i in data["items"]],
            subtotal=data["subtotal"]
        )
    return SavingsPlanResponse(
        splits=result,
        grand_total=plan["grand_total"],
        total_saved=plan["total_saved"]
    )
```

**Modify**: `backend/app/main.py` — add `include_router`

```python
from fastapi import FastAPI
from app.db.session import init_db
from app.routers.budget import router as budget_router

app = FastAPI(title="SuperLista API")
app.include_router(budget_router)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def read_root():
    return {"message": "Bienvenido a SuperLista API"}
```

Also add CORS middleware so the Vite dev server (port 5173) can reach the backend (port 8000):

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Step 4 — Vite Proxy Configuration

**Why**: Avoid CORS issues in development. The frontend at `localhost:5173` calls `/api/*` and Vite forwards to `localhost:8000`.

**Modify**: `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

Now `fetch("/api/budget")` from the frontend will be proxied to `http://localhost:8000/api/budget`.

---

## Step 5 — Frontend API Service

**Why**: Centralize all API calls in one file for maintainability.

**File**: `frontend/src/api.ts` (new)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',  // uses Vite proxy in dev
  timeout: 30000,
});

export interface ProductResult {
  name: string;
  price: number;
  unit: string;
  store: string;
  url?: string;
  image_url?: string;
}

export interface BudgetItem {
  query: string;
  product: ProductResult;
}

export interface StoreBudget {
  items: BudgetItem[];
  total: number;
  whatsapp_message: string;
}

export interface BudgetResponse {
  budgets: Record<string, StoreBudget>;
}

export interface AlternativeGroup {
  name: string;
  product: ProductResult;
  count: number;
  stores: string[];
}

export interface SavingsPlanResponse {
  splits: Record<string, {
    items: { product: ProductResult; store: string }[];
    subtotal: number;
  }>;
  grand_total: number;
  total_saved: number;
}

export async function fetchBudget(items: string[], stores?: string[]): Promise<BudgetResponse> {
  const { data } = await api.post<BudgetResponse>('/budget', { items, stores });
  return data;
}

export async function fetchAlternatives(query: string, stores?: string[]): Promise<AlternativeGroup[]> {
  const { data } = await api.post<AlternativeGroup[]>('/alternatives', { query, stores });
  return data;
}

export async function fetchSavingsPlan(items: string[], stores?: string[]): Promise<SavingsPlanResponse> {
  const { data } = await api.post<SavingsPlanResponse>('/savings-plan', { items, stores });
  return data;
}
```

---

## Step 6 — Connect App.tsx to the Backend

**Goal**: Replace `calculateComparison()` mock logic with `fetchBudget()`.

### New state variables to add:

```typescript
const [error, setError] = useState<string | null>(null)
```

### Replace `calculateComparison`:

```typescript
const calculateComparison = async () => {
  if (activeList.items.length === 0 || selectedStores.length === 0) return
  setLoading(true)
  setError(null)
  
  try {
    const response = await fetchBudget(
      activeList.items.map(i => i.query),
      selectedStores
    )
    
    // Transform backend response to match expected frontend format
    const transformed: Record<string, Record<string, Product>> = {}
    for (const [store, budget] of Object.entries(response.budgets)) {
      for (const item of budget.items) {
        if (!transformed[item.query]) transformed[item.query] = {}
        transformed[item.query][store] = {
          name: item.product.name,
          price: item.product.price,
          store: item.product.store,
          url: item.product.url,
          details: `Precio unitario: $${item.product.price}\nUnidad: ${item.product.unit}`,
        }
      }
    }
    setResults(transformed)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error al obtener presupuesto')
  } finally {
    setLoading(false)
  }
}
```

### Render error state in the UI:

Add after the "Compare Prices" button:

```tsx
{error && <div className="error-banner">{error}</div>}
```

---

## Step 7 — Add Loading & Error Styles

**Modify**: `frontend/src/App.css` — add:

```css
.error-banner {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  border: 1px solid #f5c6cb;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## Step 8 — End-to-End Test

### Manual test procedure:

1. Start both servers: `./start.sh`
2. Open `http://localhost:5173`
3. Add items to the shopping list
4. Select stores
5. Click "Comparar Precios"
6. Verify:
   - Loading spinner shows during request
   - Results table appears with product names, prices, and store columns
   - WhatsApp button generates a correct `wa.me` link
   - Error banner shows if backend is down

### Automated test:

The existing tests work without changes:
```bash
cd backend && python tests/test_logic.py && python tests/test_alternatives.py
```

---

## Future Phases (After Phase 1)

| Phase | Focus                              | Key Tasks                                                |
|-------|------------------------------------|----------------------------------------------------------|
| 2     | Auth & Multi-user                  | Register/login endpoints, JWT, protected routes, user-specific lists |
| 3     | Real provider data                 | Replace mock providers with actual scraping/API integration |
| 4     | Real cart automation               | Wire addToCart → RealCartService, add more stores        |
| 5     | Polish & Production                | Error handling, loading states, mobile responsive, tests, deployment |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CORS issues in dev | Low | Medium | Vite proxy eliminates CORS |
| Backend provider mock data too random | High | Low | Acceptable for Phase 1; will be replaced in Phase 3 |
| Frontend state incompatible with backend response shape | Medium | Medium | Clear schema definitions + TypeScript interfaces |
| Backend has no requirements.txt | Medium | High | Added in Step 1 |
| No existing frontend tests | High | Medium | Manual E2E test in Phase 1; add tests in Phase 5 |
