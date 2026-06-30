# Backend Architecture

## Entry Point

```python
# backend/app/main.py
app = FastAPI(title="SuperLista API")

@app.on_event("startup")
def on_startup():
    init_db()  # Creates SQLModel tables in SQLite

@app.get("/")
def read_root():
    return {"message": "Bienvenido a SuperLista API"}
```

**What happens on startup:**
1. FastAPI creates the app
2. `init_db()` executes `SQLModel.metadata.create_all(engine)`
3. This creates 4 tables in `superlista.db`: `user`, `storecredential`, `shoppinglist`, `listitem`
4. The app listens on port 8000 with uvicorn

---

## Database Layer

### Session (`app/db/session.py`)

```python
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./superlista.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in ... else {})

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():  # Generator for FastAPI dependency injection
    with Session(engine) as session:
        yield session
```

- Defaults to SQLite at `backend/superlista.db`
- `get_session()` is a generator for FastAPI's `Depends()` — not yet used since no endpoints exist
- Uses `check_same_thread=False` for SQLite since FastAPI is async

### Models (`app/db/models.py`)

```python
class User:
    id: int (PK)
    username: str (unique, indexed)
    hashed_password: str
    lists: List[ShoppingList] (relationship)
    credentials: List[StoreCredential] (relationship)

class StoreCredential:
    id: int (PK)
    store_name: str
    email: str
    password: str  # ⚠️ plaintext (TODO: encrypt)
    user_id: int (FK → user.id)
    user: User (relationship)

class ShoppingList:
    id: int (PK)
    name: str
    user_id: int (FK → user.id)
    user: User (relationship)
    items: List[ListItem] (relationship)
    created_at: datetime (auto)

class ListItem:
    id: int (PK)
    query: str          # e.g., "Leche entera"
    quantity: int       # default 1
    shopping_list_id: int (FK → shoppinglist.id)
    shopping_list: ShoppingList (relationship)
```

**Relationships (ER):**

```
User 1──N ShoppingList 1──N ListItem
User 1──N StoreCredential
```

---

## Provider Layer (Strategy Pattern)

### Abstract Interface (`app/providers/base.py`)

```python
class ProductResult(BaseModel):
    name: str
    price: float
    unit: str        # "kg", "u", "l"
    store: str
    url: Optional[str] = None
    image_url: Optional[str] = None

class BaseSupermarketProvider(ABC):
    @property
    @abstractmethod
    def store_name(self) -> str: ...

    @abstractmethod
    async def search_product(self, query: str) -> List[ProductResult]: ...
```

### Provider Comparison

| Provider          | store_name   | Products | Latency | Notes                      |
|-------------------|-------------|----------|---------|----------------------------|
| CarrefourProvider | Carrefour   | 3        | 0.3s    | Classic + La Serenísima + Primer Precio |
| ChangomasProvider | Changomas   | 3        | 0.35s   | Great Value + La Serenísima + Marca Lider |
| SuperMamiProvider | Super Mami  | 3        | 0.5s    | Primera Marca + Marca Propia + Premium (imports httpx+bs4 for future scraping) |
| TadicorProvider   | Tadicor     | 2        | 0.4s    | Mayorista x Unidad + Oferta Tadi |

All providers return randomly generated prices via `random.uniform()` and simulate latency with `asyncio.sleep()`.

---

## Service Layer

### BudgetService (`app/services/budget.py`)

This is the core business logic class.

```python
class BudgetService:
    def __init__(self):
        self.all_providers = [
            SuperMamiProvider(),
            TadicorProvider(),
            CarrefourProvider(),
            ChangomasProvider()
        ]
```

#### `get_best_budget(items_queries, enabled_stores) -> Dict`

**Flow:**
1. Filter providers by `enabled_stores` (or use all)
2. For each (provider × query), create a task calling `_search_and_tag()`
3. Run all tasks in parallel via `asyncio.gather()`
4. For each result, pick the cheapest product per store per query
5. Return `{ store_name: { items: [...], total: float } }`

**Sequence:**
```
BudgetService               Provider1        Provider2
     │                          │                │
     │  search_product(leche)   │                │
     │─────────────────────────►│                │
     │◄─────────────────────────┘                │
     │  [{productos...}]                         │
     │                          │                │
     │  search_product(leche)   │                │
     │───────────────────────────►──────────────►│
     │◄───────────────────────────┼──────────────┘
     │  [{productos...}]         │                │
     │                          │                │
     │  (repite para pan)       │                │
     │                          │                │
     │  devuelve:               │                │
     │  {Carrefour:{items,total},                │
     │   Changomas:{items,total}}                │
```

#### `get_alternatives(query, enabled_stores) -> List[Dict]`

**Flow:**
1. Search query across all enabled stores
2. Collect all products into a flat list
3. Group by name similarity using `difflib.SequenceMatcher` (threshold > 80%)
4. Sort groups by: count descending, then price ascending
5. Return `[{ name, product, count, stores }, ...]`

**Example output for "Leche":**
```python
[
    {"name": "Leche Entera La Serenísima", "product": ProductResult(...), "count": 2,
     "stores": ["Carrefour", "Changomas"]},
    {"name": "Leche Entera Ilolay", "product": ProductResult(...), "count": 1,
     "stores": ["Super Mami"]}
]
```

#### `get_max_savings_plan(items_queries, enabled_stores) -> Dict`

**Flow:**
1. Search all items across all stores (parallel)
2. For each query, find the absolute cheapest product across ALL stores
3. Group cheapest items by store
4. Calculate grand total and savings vs buying everything at one store

**Returns:**
```python
{
    "splits": {
        "Changomas": {"items": [ProductResult(...)], "subtotal": 1.1},
        "Tadicor": {"items": [ProductResult(...)], "subtotal": 0.8}
    },
    "grand_total": 1.9,
    "total_saved": 0.0
}
```

#### `generate_whatsapp_message(budget, store_name) -> str`

Generates a Markdown-formatted WhatsApp message like:
```
*🛒 Presupuesto SuperLista: Carrefour*

• Leche Entera La Serenísima: *$1.2*
• Pan Bimbo: *$0.8*

💰 *Total Estimado: $2.0*

Generado con SuperLista 🚀
```

---

### CartService (`app/services/cart.py`)

Simulated automation with `asyncio.sleep` delays:
```python
class CartService:
    async def add_to_cart(self, store_name, credentials, items) -> bool
        # Prints: [Automator] Iniciando sesión en {store}...
        # sleep 2s
        # Prints: [Automator] + {item} agregado al carrito
        # sleep 1s per item
        # return True
```

### RealCartService (`app/services/automation.py`)

Playwright-based real automation (Carrefour only):

```python
class RealCartService:
    async def add_to_carrefour_cart(self, credentials, items) -> None
        # 1. Launch Chromium (headless=False for dev)
        # 2. Navigate to carrefour.com.ar
        # 3. Click VTEX login button → fill email/password → submit
        # 4. For each item:
        #    a. Type into search input → Enter
        #    b. Wait for product results
        #    c. Click first "Agregar" button
        # 5. Close browser
```

---

## Tests (`backend/tests/`)

| File                 | What it tests                          |
|----------------------|----------------------------------------|
| `test_logic.py`      | `BudgetService.get_best_budget()` + `generate_whatsapp_message()` |
| `test_alternatives.py` | `BudgetService.get_alternatives()` fuzzy matching |

Both tests run via `asyncio.run()` directly (no pytest runner required):
```bash
python tests/test_logic.py
python tests/test_alternatives.py
```
