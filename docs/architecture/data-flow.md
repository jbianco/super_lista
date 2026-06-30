# Data Flow Diagrams

## 1. Current State — Price Comparison (Mock)

```
┌───────────────────────┐
│  User clicks          │
│  "Comparar Precios"   │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│  calculateComparison() │
│  setLoading(true)      │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐      ┌───────────────────────┐
│  setTimeout 800ms     │──────│  getRandomBrand(q, s)  │
└──────────┬────────────┘      │  getUnit(q)            │
           │                   └───────────────────────┘
           ▼
┌───────────────────────┐
│  for each item × store│
│  generate mock:       │
│    { name, price,     │
│      url, details }   │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│  setResults(mock)     │
│  setLoading(false)    │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│  Re-render table      │
│  with new prices      │
└───────────────────────┘
```

**All data is generated client-side. No network requests.**

---

## 2. Future State — Price Comparison (Backend)

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  React App       │       │  FastAPI          │       │  Providers       │
│  (Frontend)      │       │  (Backend)        │       │  (Supermarkets)  │
└────────┬─────────┘       └────────┬──────────┘       └────────┬─────────┘
         │                         │                           │
         │  POST /api/budget       │                           │
         │  { items: ["leche",     │                           │
         │    "pan"],              │                           │
         │    stores: ["Carrefour"]}                            │
         │────────────────────────►│                           │
         │                         │                           │
         │                         │  search_product("leche")  │
         │                         │  ── parallel for each ──►│
         │                         │◄──────────────────────────│
         │                         │  [ProductResult, ...]     │
         │                         │                           │
         │                         │  search_product("pan")    │
         │                         │──────────────────────────►│
         │                         │◄──────────────────────────│
         │                         │  [ProductResult, ...]     │
         │                         │                           │
         │                         │  ── BudgetService ──      │
         │                         │  pick cheapest per store  │
         │                         │                           │
         │  200 OK                 │                           │
         │  {                      │                           │
         │   "Carrefour": {        │                           │
         │     items: [{ query,    │                           │
         │       product: Product}],                            │
         │     total: 2.0          │                           │
         │   },                     │                           │
         │   "Changomas": {...}    │                           │
         │  }                      │                           │
         │◄────────────────────────│                           │
         │                         │                           │
         ▼                         ▼                           ▼
    setResults(data)          Response sent               Done
```

---

## 3. Future State — Max Savings Plan (Split Purchase)

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  React App       │       │  FastAPI          │       │  Providers       │
└────────┬─────────┘       └────────┬──────────┘       └────────┬─────────┘
         │                         │                           │
         │  POST /api/savings-plan │                           │
         │  { items: ["leche",     │                           │
         │    "pan", "huevos"]}    │                           │
         │────────────────────────►│                           │
         │                         │                           │
         │                         │  ── search ALL items ──►│
         │                         │    in ALL stores         │
         │                         │  (parallel, 4prov × 3items──────────►│
         │                         │◄──────────────────────────│
         │                         │  all products with prices │
         │                         │                           │
         │                         │  ── BudgetService ──      │
         │                         │  For "leche" → cheapest   │
         │                         │    is Changomas ($1.1)    │
         │                         │  For "pan" → cheapest     │
         │                         │    is Tadicor ($0.8)      │
         │                         │  For "huevos" → cheapest  │
         │                         │    is Carrefour ($2.5)    │
         │                         │                           │
         │                         │  Build splits:            │
         │                         │    Changomas: [leche]     │
         │                         │    Tadicor: [pan]         │
         │                         │    Carrefour: [huevos]    │
         │                         │                           │
         │  200 OK                 │                           │
         │  { splits: {            │                           │
         │    Changomas: {items,   │                           │
         │      subtotal: 1.1},    │                           │
         │    Tadicor: {items,     │                           │
         │      subtotal: 0.8},    │                           │
         │    Carrefour: {items,   │                           │
         │      subtotal: 2.5}},   │                           │
         │    grand_total: 4.4,    │                           │
         │    total_saved: 0.6     │                           │
         │  }                      │                           │
         │◄────────────────────────│                           │
         │                         │                           │
         ▼                         ▼                           ▼
    Render split-plan UI      Response sent               Done
```

---

## 4. Future State — Alternatives (Fuzzy Matching)

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  React App       │       │  FastAPI          │       │  difflib         │
└────────┬─────────┘       └────────┬──────────┘       └────────┬─────────┘
         │                         │                           │
         │  POST /api/alternatives │                           │
         │  { query: "leche       │                           │
         │    entera",             │                           │
         │    stores: [...] }      │                           │
         │────────────────────────►│                           │
         │                         │                           │
         │                         │  Search all stores        │
         │                         │─────────────────────────► │
         │                         │◄──────────────────────────│
         │                         │  All products             │
         │                         │                           │
         │                         │  ── agrupar por           │
         │                         │  similitud (>80%) ──────► │
         │                         │◄──────────────────────────│
         │                         │  Groups:                  │
         │                         │  "Leche Entera La Ser."   │
         │                         │  → 2 stores, $1.2         │
         │                         │  "Leche Descremada Ilolay"│
         │                         │  → 1 store, $1.0          │
         │                         │                           │
         │  200 OK                 │                           │
         │  [{ name, product,      │                           │
         │    count, stores }]     │                           │
         │◄────────────────────────│                           │
         │                         │                           │
         ▼                         ▼                           ▼
    Render alternatives list   Response sent               Done
```

---

## 5. WhatsApp Share Flow

```
┌──────────────────────────┐
│  User clicks WhatsApp    │
│  button for a store      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  getWhatsAppLink(store)  │
│                          │
│  for each item in list:  │
│    p = results[q][store] │
│    text += "• {qty}x     │
│      {p.name}: ${price}" │
│                          │
│  text += "\nTOTAL: $X"   │
│                          │
│  return wa.me/?text=     │
│    encodeURI(text)       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  window.open(url)       │
│  → WhatsApp Web / App   │
└──────────────────────────┘
```

---

## 6. Cart Automation Flow

```
┌──────────────────────────┐
│  User clicks "Carrito"   │
│  for a store             │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Check credentials       │
│  if (!creds?.email)      │
│    → alert("Ingresa tus  │
│      credenciales")      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Open blank tab          │
│  Write "Automatizando    │
│  Carrito..." HTML        │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  setTimeout 3000ms       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Tab redirect → store    │
│  cart URL                │
│  alert("¡Listo!")        │
└──────────────────────────┘
```

**Future state**: Replace `setTimeout` with actual API call to `RealCartService` which uses Playwright to automate the real store website.
