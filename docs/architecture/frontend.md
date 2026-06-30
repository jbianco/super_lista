# Frontend Architecture

## Overview

The frontend is a **single-component React SPA** with no routing, no Redux, and no backend calls. All data is generated and stored client-side.

- **Framework**: React 19.2 + TypeScript 6 + Vite 8
- **Entry**: `index.html` → `src/main.tsx` → `<App />`
- **Persistence**: localStorage (5 keys)
- **HTTP client**: axios (installed but unused)
- **Icons**: lucide-react

---

## Component Tree

```
<App>  (App.tsx — único componente)
├── <header>      → Title + subtitle
├── <aside>       → Sidebar: list management
│   └── .list-item-sidebar → Per-list name + delete button
└── <main>
    ├── .card     → List header + store checkboxes + credentials + input + items
    │   ├── Store checkboxes (allStores toggle)
    │   ├── Credentials section (togglable)
    │   ├── Input group (text input + Add button)
    │   ├── Items list (quantity controls, edit, delete)
    │   └── "Compare Prices" button
    └── .card     → Comparison table (shown when results exist)
        ├── <thead>   → Store columns with "Refresh" buttons
        ├── <tbody>   → Product rows × store columns with prices
        └── <tfoot>   → Totals + "Add to Cart" + "WhatsApp" buttons
```

---

## State Management

### State Variables (`App.tsx`)

| State              | localStorage Key | Type                                      | Default                                    |
|-------------------|-----------------|-------------------------------------------|--------------------------------------------|
| `lists`           | `sl_lists`      | `ShoppingList[]`                          | `[{ id:'1', name:'Lista Semanal', items: [...] }]` |
| `activeListId`    | `sl_activeId`   | `string`                                  | `'1'`                                      |
| `credentials`     | `sl_creds`      | `Record<string, {email: string}>`         | `{}`                                       |
| `selectedStores`  | `sl_stores`     | `string[]`                                | `["Super Mami", "Tadicor", "Carrefour", "Changomas"]` |
| `results`         | `sl_results`    | `Record<string, Record<string, Product>>` | `{}`                                       |

### UI State (not persisted)

| State               | Type       | Purpose                          |
|---------------------|------------|----------------------------------|
| `editingListId`     | `string | null` | Which list name is being renamed |
| `newItem`           | `string`   | Input value for new item         |
| `editingItemIndex`  | `number | null` | Which item is being edited inline |
| `editingItemValue`  | `string`   | Current edit input value         |
| `loading`           | `boolean`  | Loading spinner state            |
| `showCreds`         | `boolean`  | Toggle credentials section       |

### Persistence Hook

```typescript
useEffect(() => {
    localStorage.setItem('sl_lists', JSON.stringify(lists))
    localStorage.setItem('sl_activeId', activeListId)
    localStorage.setItem('sl_creds', JSON.stringify(credentials))
    localStorage.setItem('sl_stores', JSON.stringify(selectedStores))
    localStorage.setItem('sl_results', JSON.stringify(results))
}, [lists, activeListId, credentials, selectedStores, results])
```

All 5 state values are persisted to localStorage on every change.

---

## Key Interfaces

```typescript
interface Product {
    name: string;
    price: number;
    store: string;
    url?: string;
    details?: string;
}

interface ShoppingItem {
    query: string;
    quantity: number;
}

interface ShoppingList {
    id: string;
    name: string;
    items: ShoppingItem[];
}
```

- **Product**: A product result from a store (price, name, metadata)
- **ShoppingItem**: A single line item in a shopping list (what + how many)
- **ShoppingList**: A named collection of items (user can have multiple)

---

## Key Functions

| Function | Purpose | Currently |
|----------|---------|-----------|
| `createList()` | Adds new empty list | Client-side only |
| `deleteList(id)` | Removes list (protects last) | Client-side only |
| `renameList(id, newName)` | Renames list | Client-side only |
| `addItem()` | Adds item to active list | Client-side only |
| `removeItem(index)` | Removes item from list | Client-side only |
| `updateQuantity(index, delta)` | Adjusts quantity (min 1) | Client-side only |
| `startEditItem(idx, val)` | Enter inline edit mode | Client-side only |
| `saveEditItem()` | Save inline edit | Client-side only |
| `getRandomBrand(query, store)` | Generates mock brand name | Mock |
| `getUnit(query)` | Returns "1L" or "1kg" | Mock |
| `calculateComparison()` | Triggers price comparison | Mock (setTimeout + random) |
| `refreshStore(store)` | Re-mocks a single store | Mock (setTimeout + random) |
| `addToCart(store)` | Opens cart in new tab | Simulated |
| `calculateTotal(store)` | Sums price × quantity | Reads from `results` |
| `getWhatsAppLink(store)` | Generates wa.me link | Builds URL from `results` |

---

## Data Flow (Current — Mock)

```
User clicks "Comparar Precios"
        │
        ▼
calculateComparison()
        │
        ▼
setLoading(true)
        │
        ▼
setTimeout 800ms
        │
        ▼
for each item × each store:
    base = 1000 + random(500)
    brand = getRandomBrand(query, store)
    mockResults[query][store] = { name, price, store, url, details }
        │
        ▼
setResults(mockResults)
setLoading(false)
        │
        ▼
UI renders comparison table
```

### What `addToCart` does:

1. Checks credentials exist for store
2. Opens a blank browser tab
3. Writes "Automatizando Carrito..." HTML
4. After 3s timeout, redirects tab to the store's cart URL
5. Shows `alert("¡Listo!")`

### What `getWhatsAppLink` does:

1. Iterates items and their results for a store
2. Builds markdown string: `*Store*` + items with prices + total
3. Returns `https://wa.me/?text={encodeURIComponent(text)}`

---

## Store URLs (for cart automation)

| Store      | Cart URL                                          |
|------------|---------------------------------------------------|
| Super Mami | https://www.dinoonline.com.ar/super/carro         |
| Tadicor    | https://www.tadicor.com.ar/checkout/#/cart        |
| Carrefour  | https://www.carrefour.com.ar/checkout/#/cart      |
| Changomas  | https://www.masonline.com.ar/checkout/#/cart      |

---

## Styling

- **CSS variables** for theming (primary = WhatsApp green `#25d366`)
- **Grid layout**: sidebar (280px) + main content (1fr)
- **Tooltip system**: CSS-only tooltips on hover for product details
- **No CSS framework** (plain CSS in `App.css`)

---

## Current Limitations

1. **No backend connection**: axios is installed but never used; all URLs, prices, details are mock
2. **No routing**: Single page, single component — no way to deep-link to a list
3. **No error handling**: No loading states for API calls (because there are none), no try/catch
4. **No form validation**: Item names, credentials, quantities have no validation
5. **No mobile responsiveness**: Static grid layout may break on small screens
6. **No test coverage**: No testing framework configured
