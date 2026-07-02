import { useState } from 'react'
import { Plus, Settings, Calculator, CheckCircle2, Loader2, Edit3, Save, X, Trash2, Minus } from 'lucide-react'
import type { ShoppingList } from '../types'
import { STORE_CONFIGS, ALL_STORES } from '../utils'

interface ListEditorProps {
  activeList: ShoppingList
  selectedStores: string[]
  onToggleStore: (store: string) => void
  credentials: Record<string, Record<string, string>>
  showCreds: boolean
  onUpdateCredentials: (creds: Record<string, Record<string, string>>) => void
  onToggleCreds: () => void
  onOpenWizard: (query: string) => void
  onRemoveItem: (index: number) => void
  onUpdateQuantity: (index: number, delta: number) => void
  onUpdateItemQuery: (index: number, query: string) => void
  onStartComparison: () => void
  loading: boolean
  error: string | null
}

export function ListEditor({
  activeList, selectedStores, onToggleStore,
  credentials, showCreds, onUpdateCredentials, onToggleCreds,
  onOpenWizard, onRemoveItem, onUpdateQuantity, onUpdateItemQuery,
  onStartComparison, loading, error,
}: ListEditorProps) {
  const [newItem, setNewItem] = useState('')
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [editingItemValue, setEditingItemValue] = useState('')

  const handleAdd = () => {
    if (!newItem.trim()) return
    onOpenWizard(newItem.trim())
    setNewItem('')
  }

  const startEditItem = (index: number, value: string) => {
    setEditingItemIndex(index)
    setEditingItemValue(value)
  }

  const saveEditItem = () => {
    if (editingItemIndex === null) return
    onUpdateItemQuery(editingItemIndex, editingItemValue)
    setEditingItemIndex(null)
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{activeList.name}</h2>
        <button className="btn-secondary" onClick={onToggleCreds}><Settings size={18} /> {showCreds ? 'Ocultar' : 'Cuentas'}</button>
      </div>

      <div className="store-pills">
        {ALL_STORES.map(s => (
          <span
            key={s}
            className={`store-pill ${selectedStores.includes(s) ? 'active' : ''}`}
            onClick={() => onToggleStore(s)}
          >
            <span className="pill-icon">
              {selectedStores.includes(s) ? <CheckCircle2 size={12} /> : ''}
            </span>
            {s}
          </span>
        ))}
      </div>

      {showCreds && (
        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem' }}>Credenciales por tienda</h4>
          {selectedStores.filter(s => STORE_CONFIGS[s]).map(s => {
            const config = STORE_CONFIGS[s]
            const currentMethod = credentials[s]?.auth_method || 'password'
            const methodConfig = config.auth.methods.find(m => m.id === currentMethod) || config.auth.methods[0]
            return (
              <div key={s} style={{ marginBottom: '1rem', padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{s}</strong>
                <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {config.auth.methods.map(m => (
                    <button
                      key={m.id}
                      className={currentMethod === m.id ? 'btn-primary' : 'btn-ghost'}
                      style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                      onClick={() => onUpdateCredentials({ ...credentials, [s]: { ...credentials[s], auth_method: m.id } })}
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
                      onChange={(e) => onUpdateCredentials({ ...credentials, [s]: { ...credentials[s], [f.key]: e.target.value } })}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <div className="input-group">
        <input type="text" placeholder="Añadir item..." value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <button className="btn-primary" onClick={handleAdd}><Plus /></button>
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
                  <button onClick={() => onUpdateQuantity(idx, -1)}><Minus size={14} /></button>
                  <span>{it.quantity}</span>
                  <button onClick={() => onUpdateQuantity(idx, 1)}><Plus size={14} /></button>
                </div>
                <div className="item-info">
                  <div className="item-name">{it.query}</div>
                  {it.selectedProduct && (
                    <div className="item-detail">{it.selectedProduct.brand} — {it.selectedProduct.unit}</div>
                  )}
                </div>
                <div className="item-actions">
                  <button onClick={() => startEditItem(idx, it.query)}><Edit3 size={14} /></button>
                  <button onClick={() => onRemoveItem(idx)}><Trash2 size={14} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {activeList.items.length > 0 && (
        <button className="btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={onStartComparison} disabled={loading}>
          {loading ? <Loader2 className="spinner" /> : <><Calculator size={20} /> Comparar Precios</>}
        </button>
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  )
}
