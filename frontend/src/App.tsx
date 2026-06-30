import { useState, useEffect } from 'react'
import {
  Plus, Trash2, Send, Calculator, ShoppingCart,
  Zap, Settings, Edit3, Save, X, List as ListIcon,
  Minus, ExternalLink, Loader2, CheckCircle2
} from 'lucide-react'
import { fetchBudget, addToCart as apiAddToCart, type ProductResult } from './api'
import ProductWizard from './ProductWizard'
import './App.css'

interface Product {
  name: string;
  price: number;
  brand: string;
  store: string;
  unit: string;
  url?: string;
  details?: string;
  last_updated?: string;
}

interface StoreConfig {
  auth: {
    methods: { id: string; label: string; fields: { key: string; label: string; type: string; placeholder: string }[] }[];
  };
}

const STORE_CONFIGS: Record<string, StoreConfig> = {
  Carrefour: {
    auth: {
      methods: [
        { id: 'password', label: 'Email + Contraseña', fields: [{ key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' }, { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' }] },
        { id: 'google', label: 'Google', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
        { id: 'facebook', label: 'Facebook', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
      ],
    },
  },
  Changomas: {
    auth: {
      methods: [
        { id: 'password', label: 'Email + Contraseña', fields: [{ key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' }, { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' }] },
        { id: 'google', label: 'Google', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
        { id: 'facebook', label: 'Facebook', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
      ],
    },
  },
  Disco: {
    auth: {
      methods: [
        { id: 'password', label: 'Email + Contraseña', fields: [{ key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' }, { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' }] },
        { id: 'google', label: 'Google', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
        { id: 'facebook', label: 'Facebook', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
      ],
    },
  },
  Jumbo: {
    auth: {
      methods: [
        { id: 'password', label: 'Email + Contraseña', fields: [{ key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' }, { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' }] },
        { id: 'google', label: 'Google', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
        { id: 'facebook', label: 'Facebook', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
      ],
    },
  },
};

interface ShoppingItem {
  query: string;
  quantity: number;
  selectedProduct?: ProductResult;
}

interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
}

function App() {
  const [lists, setLists] = useState<ShoppingList[]>(() => {
    const saved = localStorage.getItem('sl_lists')
    if (saved) {
      try {
        const parsed: { id: string; name: string; items: (string | ShoppingItem)[] }[] = JSON.parse(saved)
        return parsed.map(l => ({
          ...l,
          items: l.items.map(it => typeof it === 'string' ? { query: it, quantity: 1 } : it)
        }))
      } catch (e) { console.error(e) }
    }
    return [{ id: '1', name: 'Lista Semanal', items: [{ query: 'Leche', quantity: 1 }, { query: 'Pan', quantity: 1 }] }]
  })

  const [activeListId, setActiveListId] = useState<string>(() => localStorage.getItem('sl_activeId') || '1')
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>(() => {
    const saved = localStorage.getItem('sl_creds'); return saved ? JSON.parse(saved) : {}
  })
  const [selectedStores, setSelectedStores] = useState<string[]>(() => {
    const saved = localStorage.getItem('sl_stores'); return saved ? JSON.parse(saved) : ["Carrefour", "Changomas", "Disco", "Jumbo"]
  })
  const [results, setResults] = useState<Record<string, Record<string, Product>>>(() => {
    const saved = localStorage.getItem('sl_results'); return saved ? JSON.parse(saved) : {}
  })

  const [overrides, setOverrides] = useState<Record<string, Record<string, { overrideProduct?: ProductResult; excluded: boolean }>>>(() => {
    const saved = localStorage.getItem('sl_overrides'); return saved ? JSON.parse(saved) : {}
  })
  const [editCell, setEditCell] = useState<{ query: string; store: string } | null>(null)
  const [editQueryInput, setEditQueryInput] = useState<string | null>(null)
  const [editOriginalQuery, setEditOriginalQuery] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('sl_lists', JSON.stringify(lists))
    localStorage.setItem('sl_activeId', activeListId)
    localStorage.setItem('sl_creds', JSON.stringify(credentials))
    localStorage.setItem('sl_stores', JSON.stringify(selectedStores))
    localStorage.setItem('sl_results', JSON.stringify(results))
    localStorage.setItem('sl_overrides', JSON.stringify(overrides))
  }, [lists, activeListId, credentials, selectedStores, results, overrides])

  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [editingItemValue, setEditingItemValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreds, setShowCreds] = useState(false)
  const [wizardQuery, setWizardQuery] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(true)

  const allStores = ["Carrefour", "Changomas", "Disco", "Jumbo"]
  const activeList = lists.find(l => l.id === activeListId) || lists[0]

  const storeCartUrls: Record<string, string> = {
    "Carrefour": "https://www.carrefour.com.ar/checkout/#/cart",
    "Changomas": "https://www.masonline.com.ar/checkout/#/cart",
    "Disco": "https://www.disco.com.ar/checkout/#/cart",
    "Jumbo": "https://www.jumbo.com.ar/checkout/#/cart"
  }

  const createList = () => {
    const newId = Math.random().toString(36).substr(2, 9)
    setLists([...lists, { id: newId, name: `Nueva Lista ${lists.length + 1}`, items: [] }])
    setActiveListId(newId); setResults({})
  }

  const deleteList = (id: string) => {
    if (lists.length === 1) return
    const newLists = lists.filter(l => l.id !== id)
    setLists(newLists)
    if (activeListId === id) setActiveListId(newLists[0].id)
  }

  const renameList = (id: string, newName: string) => {
    setLists(lists.map(l => l.id === id ? { ...l, name: newName } : l))
    setEditingListId(null)
  }

  const openWizard = () => {
    if (!newItem.trim()) return
    setWizardQuery(newItem.trim())
    setNewItem('')
  }

  const handleWizardConfirm = (product: ProductResult) => {
    setLists(lists.map(l => l.id === activeListId ? {
      ...l, items: [...l.items, {
        query: product.name,
        quantity: 1,
        selectedProduct: product,
      }]
    } : l))
    setWizardQuery(null)
  }

  const removeItem = (index: number) => {
    setLists(lists.map(l => l.id === activeListId ? { ...l, items: l.items.filter((_, i) => i !== index) } : l))
  }

  const updateQuantity = (index: number, delta: number) => {
    setLists(lists.map(l => l.id === activeListId ? {
      ...l, items: l.items.map((item, i) => i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
    } : l))
  }

  const startEditItem = (index: number, value: string) => { setEditingItemIndex(index); setEditingItemValue(value) }

  const saveEditItem = () => {
    if (editingItemIndex === null) return
    setLists(lists.map(l => l.id === activeListId ? {
      ...l, items: l.items.map((item, i) => i === editingItemIndex ? { ...item, query: editingItemValue } : item)
    } : l))
    setEditingItemIndex(null)
  }

  const calculateComparison = async () => {
    if (activeList.items.length === 0 || selectedStores.length === 0) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetchBudget(
        activeList.items.map(i => i.query),
        selectedStores,
      )

      const transformed: Record<string, Record<string, Product>> = {}
      for (const [store, budget] of Object.entries(response.budgets)) {
        for (const item of budget.items) {
          if (!transformed[item.query]) transformed[item.query] = {}
          transformed[item.query][store] = {
            name: item.product.name,
            price: item.product.price,
            brand: item.product.brand,
            unit: item.product.unit,
            store: item.product.store,
            url: item.product.url,
            details: item.product.details || `Precio unitario: $${item.product.price}\nUnidad: ${item.product.unit}`,
            last_updated: item.product.last_updated,
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

  const handleCellOverride = (query: string, store: string, product: ProductResult) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (!next[query]) next[query] = {}
      next[query] = { ...next[query], [store]: { overrideProduct: product, excluded: false } }
      return next
    })
    setEditCell(null)
  }

  const handleExcludeCell = (query: string, store: string) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (!next[query]) next[query] = {}
      next[query] = { ...next[query], [store]: { overrideProduct: undefined, excluded: !next[query]?.[store]?.excluded } }
      return next
    })
  }

  const refreshStore = async (store: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetchBudget(
        activeList.items.map(i => i.query),
        [store],
      )

      const transformed = { ...results }
      const storeBudget = response.budgets[store]
      if (storeBudget) {
        for (const item of storeBudget.items) {
          if (!transformed[item.query]) transformed[item.query] = {}
          transformed[item.query][store] = {
            name: item.product.name,
            price: item.product.price,
            brand: item.product.brand,
            unit: item.product.unit,
            store: item.product.store,
            url: item.product.url,
            details: `Refrescado: ${new Date().toLocaleTimeString()}\n${item.product.details || ''}\nPrecio: $${item.product.price}`,
            last_updated: item.product.last_updated,
          }
        }
      }
      setResults(transformed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al refrescar')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async (store: string) => {
    const creds = credentials[store]
    const method = creds?.auth_method || 'password'
    if (method === 'password' && (!creds?.email || !creds?.password)) {
      alert("Ingresa email y contraseña en Configuración"); return
    }
    if (method !== 'password' && !creds?.token) {
      alert("Ingresa el token de acceso en Configuración"); return
    }

    setLoading(true)
    setError(null)

    try {
      const cartItems = activeList.items
        .filter(it => !overrides[it.query]?.[store]?.excluded)
        .map(it => {
          const p = overrides[it.query]?.[store]?.overrideProduct || results[it.query]?.[store]
          return { query: it.query, quantity: it.quantity, name: p?.name || it.query }
        })

      await apiAddToCart(
        store,
        { email: creds.email, password: creds.password, auth_method: method, token: creds.token },
        cartItems.map(i => i.query),
      )

      const cartUrl = storeCartUrls[store]
      if (cartUrl) {
        window.open(cartUrl, '_blank')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar al carrito')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotal = (store: string) => activeList.items.reduce((acc, it) => {
    const cellOverrides = overrides[it.query]?.[store]
    if (cellOverrides?.excluded) return acc
    if (cellOverrides?.overrideProduct) return acc + cellOverrides.overrideProduct.price * it.quantity
    return acc + ((results[it.query]?.[store]?.price || 0) * it.quantity)
  }, 0)

  const ageClass = (lastUpdated?: string) => {
    if (!lastUpdated) return ''
    const now = Date.now()
    const updated = new Date(lastUpdated).getTime()
    const days = (now - updated) / (1000 * 60 * 60 * 24)
    if (days >= 7) return 'age-stale'
    if (days >= 3) return 'age-aging'
    if (days >= 1) return 'age-day'
    return ''
  }

  const getWhatsAppLink = (store: string) => {
    let text = `*🛒 SuperLista: ${store}*\n\n`
    activeList.items.forEach(it => {
      const cellOverrides = overrides[it.query]?.[store]
      if (cellOverrides?.excluded) return
      const p = cellOverrides?.overrideProduct || results[it.query]?.[store]
      if (p) text += `• ${it.quantity}x ${p.name}: *$${p.price * it.quantity}*\n`
    })
    text += `\n💰 *TOTAL: $${calculateTotal(store)}*`
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="container">
      <header className="header">
        <h1>SuperLista 🚀</h1>
        <p>Gestiona tus compras y ahorra en segundos</p>
      </header>

      <div className="main-layout">
        <aside>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}><ListIcon size={18} /> Mis Listas</h3>
              <button className="btn-primary" onClick={createList} style={{ padding: '0.3rem' }}><Plus size={16} /></button>
            </div>
            {lists.map(list => (
              <div key={list.id} onClick={() => setActiveListId(list.id)} className={`list-item-sidebar ${activeListId === list.id ? 'active' : ''}`}>
                {editingListId === list.id ? (
                  <input autoFocus defaultValue={list.name} onBlur={(e) => renameList(list.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && renameList(list.id, (e.target as HTMLInputElement).value)} />
                ) : (
                  <> <span onDoubleClick={() => setEditingListId(list.id)}>{list.name}</span> <Trash2 size={14} onClick={(e) => { e.stopPropagation(); deleteList(list.id); }} /> </>
                )}
              </div>
            ))}
          </div>
        </aside>

        <main>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{activeList.name}</h2>
              <button className="btn-secondary" onClick={() => setShowCreds(!showCreds)}><Settings size={18} /> {showCreds ? 'Ocultar' : 'Cuentas'}</button>
            </div>
            <div className="store-pills">
              {allStores.map(s => (
                <span
                  key={s}
                  className={`store-pill ${selectedStores.includes(s) ? 'active' : ''}`}
                  onClick={() => setSelectedStores(selectedStores.includes(s) ? selectedStores.filter(x => x !== s) : [...selectedStores, s])}
                >
                  <span className="pill-icon">
                    {selectedStores.includes(s) ? <CheckCircle2 size={12} /> : ''}
                  </span>
                  {s}
                </span>
              ))}
            </div>
            {showCreds && <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem' }}>Credenciales por tienda</h4>
              {selectedStores.filter(s => STORE_CONFIGS[s]).map(s => {
                const config = STORE_CONFIGS[s]
                const currentMethod = credentials[s]?.auth_method || 'password'
                const methodConfig = config.auth.methods.find(m => m.id === currentMethod) || config.auth.methods[0]
                return <div key={s} style={{ marginBottom: '1rem', padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{s}</strong>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {config.auth.methods.map(m => (
                      <button
                        key={m.id}
                        className={currentMethod === m.id ? 'btn-primary' : 'btn-ghost'}
                        style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => setCredentials({ ...credentials, [s]: { ...credentials[s], auth_method: m.id } })}
                      >{m.label}</button>
                    ))}
                  </div>
                  {methodConfig.fields.map(f => (
                    <div key={f.key} style={{ marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>{f.label}</label>
                      <input
                        type={f.type}
                        placeholder={f.placeholder}
                        value={credentials[s]?.[f.key] || ''}
                        onChange={(e) => setCredentials({ ...credentials, [s]: { ...credentials[s], [f.key]: e.target.value } })}
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  ))}
                </div>
              })}
            </div>}

            <div className="input-group">
              <input type="text" placeholder="Añadir item..." value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && openWizard()} />
              <button className="btn-primary" onClick={openWizard}><Plus /></button>
            </div>

            <div className="items-container">
              {activeList.items.map((it, idx) => (
                <div key={idx} className="list-item">
                  {editingItemIndex === idx ? (
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <input style={{ flex: 1 }} value={editingItemValue} onChange={(e) => setEditingItemValue(e.target.value)} autoFocus />
                      <button className="btn-primary" onClick={saveEditItem}><Save size={16} /></button>
                      <button className="btn-danger" onClick={() => setEditingItemIndex(null)}><X size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="qty-controls">
                        <button onClick={() => updateQuantity(idx, -1)}><Minus size={14} /></button>
                        <span>{it.quantity}</span>
                        <button onClick={() => updateQuantity(idx, 1)}><Plus size={14} /></button>
                      </div>
                      <div className="item-info">
                        <div className="item-name">{it.query}</div>
                        {it.selectedProduct && (
                          <div className="item-detail">{it.selectedProduct.brand} — {it.selectedProduct.unit}</div>
                        )}
                      </div>
                      <div className="item-actions">
                        <button onClick={() => startEditItem(idx, it.query)}><Edit3 size={14} /></button>
                        <button onClick={() => removeItem(idx)}><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {activeList.items.length > 0 && <button className="btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={calculateComparison} disabled={loading}>
              {loading ? <Loader2 className="spinner" /> : <><Calculator size={20} /> Comparar Precios</>}
            </button>}
            {error && <div className="error-banner">{error}</div>}
          </div>

          {Object.keys(results).length > 0 && <div className="card" style={{ padding: 0 }}>
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem 1.5rem', cursor: 'pointer', userSelect: 'none',
                borderBottom: showResults ? '1px solid var(--border)' : 'none',
              }}
              onClick={() => setShowResults(!showResults)}
            >
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Resultados</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {showResults ? 'Ocultar ▲' : 'Mostrar ▼'}
              </span>
            </div>
            <div className="table-wrapper" style={{ display: showResults ? '' : 'none' }}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  {selectedStores.map(s => <th key={s}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{s}</span>
                      <button className="btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => refreshStore(s)} disabled={loading}><Zap size={12} /> Refrescar</button>
                    </div>
                  </th>)}
                </tr>
              </thead>
              <tbody>
                  {activeList.items.map(it => {
                  const storePrices = selectedStores.map(s => ({ store: s, price: results[it.query]?.[s]?.price ?? Infinity }))
                  const minPrice = Math.min(...storePrices.map(sp => sp.price))
                  const cheapestStores = new Set(storePrices.filter(sp => sp.price === minPrice).map(sp => sp.store))

                  return (
                  <tr key={it.query}>
                    <td style={{ fontWeight: 600 }}>{it.quantity}x {it.query}</td>
                    {selectedStores.map(s => {
                      const cellOverrides = overrides[it.query]?.[s]
                      const isExcluded = cellOverrides?.excluded
                      const overrideProd = cellOverrides?.overrideProduct
                      const p = overrideProd || results[it.query]?.[s]
                      const isCheapest = cheapestStores.has(s) && minPrice !== Infinity && !isExcluded
                      const aClass = ageClass(p?.last_updated)
                      const diff = !overrideProd && it.selectedProduct && p && (
                        it.selectedProduct.brand !== p.brand ||
                        it.selectedProduct.unit !== p.unit
                      )
                      return <td key={s} className={`product-cell${isCheapest ? ' cheapest-cell' : ''}${aClass ? ' ' + aClass : ''}${isExcluded ? ' excluded-cell' : ''}`}>
                        <div className="cell-actions-top">
                          <button className="cell-btn cell-edit" title="Cambiar producto" onClick={() => { setEditCell({ query: it.query, store: s }); setEditQueryInput(it.query); setEditOriginalQuery(it.query) }}><Edit3 size={12} /></button>
                          <button className={`cell-btn ${isExcluded ? 'cell-include' : 'cell-exclude'}`} title={isExcluded ? 'Incluir en comparación' : 'Excluir de comparación'} onClick={() => handleExcludeCell(it.query, s)}>{isExcluded ? <CheckCircle2 size={12} /> : <X size={12} />}</button>
                        </div>
                        {isExcluded ? <span className="na-text">Excluido</span>
                        : p ? <div className="tooltip-container">
                          {diff && <span className="diff-badge" title={`Seleccionaste: ${it.selectedProduct!.brand} - ${it.selectedProduct!.unit}`}>!</span>}
                          {aClass && <div className="age-indicator" title={`Actualizado: ${new Date(p.last_updated!).toLocaleString()}`} />}
                          <div className="prod-name">{p.name}</div>
                          <div className="prod-brand">{p.brand}</div>
                          <div className="prod-price">${p.price * it.quantity}</div>
                          <div className="prod-unit">${p.price} / {p.unit}</div>
                          {isCheapest && <span className="cheapest-badge">Mínimo</span>}
                          {p.url && <a href={p.url} target="_blank" className="prod-link" rel="noreferrer">Ver <ExternalLink size={10} /></a>}
                          <div className="tooltip"><strong>Detalles:</strong><br />{p.details || 'Sin detalles'}</div>
                        </div> : <span className="na-text">No disponible</span>}
                      </td>
                    })}
                  </tr>
                  )}
                )}
              </tbody>
              <tfoot>
                <tr className="total-row"><td><span className="total-label">TOTAL</span></td>{selectedStores.map(s => <td key={s}>${calculateTotal(s)}</td>)}</tr>
                <tr><td></td>{selectedStores.map(s => <td key={s} className="action-cell">
                  <div className="action-buttons">
                    <button className="btn-secondary" onClick={() => handleAddToCart(s)} disabled={loading}><ShoppingCart size={14} /> Carrito</button>
                    <a href={getWhatsAppLink(s)} target="_blank" className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.4rem 0.7rem' }} rel="noreferrer"><Send size={14} /> WhatsApp</a>
                  </div>
                </td>)}</tr>
              </tfoot>
            </table>
            </div>
          </div>}
        </main>
      </div>

      {wizardQuery && (
        <ProductWizard
          query={wizardQuery}
          stores={selectedStores}
          onConfirm={handleWizardConfirm}
          onCancel={() => setWizardQuery(null)}
        />
      )}

      {editCell && editQueryInput !== null && (
        <div className="wizard-overlay" onClick={() => { setEditCell(null); setEditQueryInput(null); setEditOriginalQuery(null) }}>
          <div className="wizard-card query-edit-card" onClick={e => e.stopPropagation()}>
            <div className="wizard-header">
              <h3>Editar búsqueda para {editCell.store}</h3>
              <button className="wizard-close" onClick={() => { setEditCell(null); setEditQueryInput(null); setEditOriginalQuery(null) }}><X size={20} /></button>
            </div>
            <div className="wizard-body">
              <div className="wizard-section">
                <p className="wizard-section-title">Modificá el término de búsqueda:</p>
                <input
                  className="query-input"
                  type="text"
                  value={editQueryInput}
                  onChange={e => setEditQueryInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="wizard-actions" style={{ marginTop: '1rem' }}>
                <button className="btn-primary" onClick={() => { setEditCell(prev => prev ? { ...prev, query: editQueryInput } : prev); setEditQueryInput(null) }}>
                  Buscar
                </button>
                <button className="btn-ghost" onClick={() => { setEditCell(null); setEditQueryInput(null); setEditOriginalQuery(null) }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editCell && editQueryInput === null && editOriginalQuery !== null && (
        <ProductWizard
          key={`${editCell.query}-${editCell.store}-${Date.now()}`}
          query={editCell.query}
          stores={[editCell.store]}
          onConfirm={(product) => handleCellOverride(editOriginalQuery, editCell.store, product)}
          onCancel={() => { setEditCell(null); setEditOriginalQuery(null) }}
        />
      )}
    </div>
  )
}

export default App
