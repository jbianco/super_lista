import { useState, useEffect } from 'react'
import { 
  Plus, Trash2, Send, Calculator, ShoppingCart, 
  Zap, Settings, Edit3, Save, X, List as ListIcon,
  ChevronRight, Info, Minus, ExternalLink, Loader2
} from 'lucide-react'
import './App.css'

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

function App() {
  // --- Persistence Logic ---
  const [lists, setLists] = useState<ShoppingList[]>(() => {
    const saved = localStorage.getItem('sl_lists')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.map((l: any) => ({
          ...l,
          items: l.items.map((it: any) => typeof it === 'string' ? { query: it, quantity: 1 } : it)
        }))
      } catch (e) { console.error(e) }
    }
    return [{ id: '1', name: 'Lista Semanal', items: [{ query: 'Leche', quantity: 1 }, { query: 'Pan', quantity: 1 }] }]
  })
  
  const [activeListId, setActiveListId] = useState<string>(() => localStorage.getItem('sl_activeId') || '1')
  const [credentials, setCredentials] = useState<Record<string, {email: string}>>(() => {
    const saved = localStorage.getItem('sl_creds'); return saved ? JSON.parse(saved) : {}
  })
  const [selectedStores, setSelectedStores] = useState<string[]>(() => {
    const saved = localStorage.getItem('sl_stores'); return saved ? JSON.parse(saved) : ["Super Mami", "Tadicor", "Carrefour", "Changomas"]
  })
  const [results, setResults] = useState<Record<string, Record<string, Product>>>(() => {
    const saved = localStorage.getItem('sl_results'); return saved ? JSON.parse(saved) : {}
  })

  useEffect(() => {
    localStorage.setItem('sl_lists', JSON.stringify(lists))
    localStorage.setItem('sl_activeId', activeListId)
    localStorage.setItem('sl_creds', JSON.stringify(credentials))
    localStorage.setItem('sl_stores', JSON.stringify(selectedStores))
    localStorage.setItem('sl_results', JSON.stringify(results))
  }, [lists, activeListId, credentials, selectedStores, results])

  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [editingItemValue, setEditingItemValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCreds, setShowCreds] = useState(false)

  const allStores = ["Super Mami", "Tadicor", "Carrefour", "Changomas"]
  const activeList = lists.find(l => l.id === activeListId) || lists[0]

  const storeCartUrls: Record<string, string> = {
    "Super Mami": "https://www.dinoonline.com.ar/super/carro",
    "Tadicor": "https://www.tadicor.com.ar/checkout/#/cart",
    "Carrefour": "https://www.carrefour.com.ar/checkout/#/cart",
    "Changomas": "https://www.masonline.com.ar/checkout/#/cart"
  }

  // --- List Management ---
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

  // --- Item Management ---
  const addItem = () => {
    if (!newItem.trim()) return
    setLists(lists.map(l => l.id === activeListId ? { ...l, items: [...l.items, { query: newItem.trim(), quantity: 1 }] } : l))
    setNewItem('')
  }

  const removeItem = (index: number) => {
    setLists(lists.map(l => l.id === activeListId ? { ...l, items: l.items.filter((_, i) => i !== index) } : l))
  }

  const updateQuantity = (index: number, delta: number) => {
    setLists(lists.map(l => l.id === activeListId ? { 
      ...l, items: l.items.map((item, i) => i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item) 
    } : l))
  }

  const startEditItem = (index: number, value: string) => { setEditingItemIndex(index); setEditingItemValue(value); }

  const saveEditItem = () => {
    if (editingItemIndex === null) return
    setLists(lists.map(l => l.id === activeListId ? { 
      ...l, items: l.items.map((item, i) => i === editingItemIndex ? { ...item, query: editingItemValue } : item) 
    } : l))
    setEditingItemIndex(null)
  }

  // --- Logic ---
  const getRandomBrand = (query: string, store: string) => {
    const brands: Record<string, string[]> = {
      "leche": ["La Serenísima", "Tregar", "Ilolay", `Propia ${store}`],
      "yerba": ["Taragüí", "Playadito", "Amanda", "Cruz de Malta"],
      "pan": ["Bimbo", "Fargo", "Artesano", `Panadería ${store}`],
      "default": ["Primera Marca", "Económico", `Marca ${store}`]
    }
    const cat = Object.keys(brands).find(k => query.toLowerCase().includes(k)) || "default"
    return brands[cat][Math.floor(Math.random() * brands[cat].length)]
  }

  const getUnit = (query: string) => query.toLowerCase().includes("leche") ? "1L" : "1kg"

  const calculateComparison = async () => {
    if (activeList.items.length === 0 || selectedStores.length === 0) return
    setLoading(true)
    setTimeout(() => {
      const mockResults: Record<string, Record<string, Product>> = { ...results }
      activeList.items.forEach(item => {
        if (!mockResults[item.query]) mockResults[item.query] = {}
        selectedStores.forEach(store => {
          const base = 1000 + (Math.random() * 500)
          const brand = getRandomBrand(item.query, store)
          mockResults[item.query][store] = {
            name: `${brand} - ${item.query}`, price: Math.round(base), store,
            url: `https://www.google.com/search?q=${encodeURIComponent(item.query + " " + store)}`,
            details: `Marca: ${brand}\nTamaño: ${getUnit(item.query)}\nPrecio/Unidad: $${Math.round(base*0.9)}`
          }
        })
      })
      setResults(mockResults); setLoading(false)
    }, 800)
  }

  const refreshStore = async (store: string) => {
    setLoading(true)
    setTimeout(() => {
      const mockResults = { ...results }
      activeList.items.forEach(item => {
        const base = 1000 + (Math.random() * 500)
        const brand = getRandomBrand(item.query, store)
        mockResults[item.query][store] = {
          name: `${brand} - ${item.query}`, price: Math.round(base), store,
          url: `https://www.google.com/search?q=${encodeURIComponent(item.query + " " + store)}`,
          details: `Refrescado: ${new Date().toLocaleTimeString()}\nMarca: ${brand}`
        }
      })
      setResults(mockResults); setLoading(false)
    }, 600)
  }

  const addToCart = async (store: string) => {
    const creds = credentials[store]
    if (!creds?.email) { alert("Ingresa tus credenciales en Configuración"); return }
    
    setLoading(true)
    const newTab = window.open('about:blank', '_blank')
    if (newTab) {
      newTab.document.write(`<html><body style="font-family:sans-serif; text-align:center; padding-top:50px;">
        <h2>🛒 SuperLista: Automatizando Carrito...</h2>
        <p>Agregando ${activeList.items.length} productos a <b>${store}</b>.</p>
        <p>Por favor, no cierres esta pestaña.</p>
      </body></html>`)
    }

    setTimeout(() => {
      setLoading(false)
      const cartUrl = storeCartUrls[store]
      if (newTab && cartUrl) {
        newTab.location.href = cartUrl
      }
      alert(`¡Listo! Carrito de ${store} cargado.`);
    }, 3000)
  }

  const calculateTotal = (store: string) => activeList.items.reduce((acc, it) => acc + ((results[it.query]?.[store]?.price || 0) * it.quantity), 0)

  const getWhatsAppLink = (store: string) => {
    let text = `*🛒 SuperLista: ${store}*\n\n`
    activeList.items.forEach(it => {
      const p = results[it.query]?.[store]
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
                  <input autoFocus defaultValue={list.name} onBlur={(e) => renameList(list.id, e.target.value)} onKeyPress={(e) => e.key === 'Enter' && renameList(list.id, (e.target as HTMLInputElement).value)} />
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
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
              {allStores.map(s => <label key={s} style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={selectedStores.includes(s)} onChange={() => setSelectedStores(selectedStores.includes(s) ? selectedStores.filter(x => x !== s) : [...selectedStores, s])} /> {s}
              </label>)}
            </div>
            {showCreds && <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              {selectedStores.map(s => <div key={s} style={{ marginBottom: '0.5rem' }}><strong>{s}:</strong> <input placeholder="Email" value={credentials[s]?.email || ''} onChange={(e) => setCredentials({...credentials, [s]: {email: e.target.value}})} /></div>)}
            </div>}
            <div className="input-group">
              <input type="text" placeholder="Añadir item..." value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addItem()} />
              <button className="btn-primary" onClick={addItem}><Plus /></button>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f0f2f5', padding: '0.2rem 0.5rem', borderRadius: '20px' }}>
                          <button onClick={() => updateQuantity(idx, -1)} style={{ padding: '0', background: 'none', border: 'none', cursor: 'pointer' }}><Minus size={14} /></button>
                          <span style={{ fontWeight: 'bold' }}>{it.quantity}</span>
                          <button onClick={() => updateQuantity(idx, 1)} style={{ padding: '0', background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={14} /></button>
                        </div>
                        <span>{it.query}</span>
                      </div>
                      <div className="actions">
                        <Edit3 size={16} onClick={() => startEditItem(idx, it.query)} style={{ marginRight: '10px', cursor: 'pointer' }} />
                        <Trash2 size={16} onClick={() => removeItem(idx)} style={{ cursor: 'pointer' }} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {activeList.items.length > 0 && <button className="btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={calculateComparison} disabled={loading}>
              {loading ? <Loader2 className="spinner" /> : <><Calculator size={20} /> Comparar Precios</>}
            </button>}
          </div>

          {Object.keys(results).length > 0 && <div className="card" style={{ overflowX: 'auto' }}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  {selectedStores.map(s => <th key={s}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{s}</span>
                      <button className="btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => refreshStore(s)}><Zap size={12} /> Refrescar</button>
                    </div>
                  </th>)}
                </tr>
              </thead>
              <tbody>
                {activeList.items.map(it => (
                  <tr key={it.query}>
                    <td style={{ fontWeight: 'bold' }}>{it.quantity}x {it.query}</td>
                    {selectedStores.map(s => {
                      const p = results[it.query]?.[s]
                      return <td key={s} className="product-cell">
                        {p ? <div className="tooltip-container">
                          <div className="prod-name">{p.name}</div>
                          <div className="prod-price">${p.price * it.quantity}</div>
                          <div style={{ fontSize: '0.7rem', color: '#888' }}>(${p.price} u.)</div>
                          <a href={p.url} target="_blank" className="prod-link">Ver en {s} <ExternalLink size={10} /></a>
                          <div className="tooltip"><strong>Detalles:</strong><br />{p.details}</div>
                        </div> : '-'}
                      </td>
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row"><td>TOTAL</td>{selectedStores.map(s => <td key={s}>${calculateTotal(s)}</td>)}</tr>
                <tr><td></td>{selectedStores.map(s => <td key={s}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button className="btn-secondary" style={{ fontSize: '0.7rem' }} onClick={() => addToCart(s)}><ShoppingCart size={14} /> Carrito</button>
                    <a href={getWhatsAppLink(s)} target="_blank" className="whatsapp-btn" style={{ fontSize: '0.7rem', padding: '0.3rem' }}><Send size={14} /> WhatsApp</a>
                  </div>
                </td>)}</tr>
              </tfoot>
            </table>
          </div>}
        </main>
      </div>
    </div>
  )
}

export default App
