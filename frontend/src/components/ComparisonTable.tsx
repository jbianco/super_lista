import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Edit3, X, CheckCircle2, Zap, ExternalLink, ShoppingCart, Send, ChevronDown, ChevronUp, TrendingUp, ImageOff } from 'lucide-react'
import type { ShoppingItem, OverridesMap, ResultsMap, AlternativesMap } from '../types'
import { ageClass, calculateTotal } from '../utils'
import type { PriceHistoryEntry, ProductResult } from '../api'
import { fetchPriceHistory } from '../api'

interface ComparisonTableProps {
  items: ShoppingItem[]
  selectedStores: string[]
  results: ResultsMap
  alternatives: AlternativesMap
  overrides: OverridesMap
  loading: boolean
  onRefreshStore: (store: string) => void
  onEditCell: (query: string, store: string) => void
  onExcludeCell: (query: string, store: string) => void
  onAddToCart: (store: string) => void
  getWhatsAppLinkFn: (store: string) => string
}

function ProductDetailModal({ product, onClose }: { product: ProductResult; onClose: () => void }) {
  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}><X size={20} /></button>
        {product.image_url ? (
          <img
            className="detail-image"
            src={product.image_url}
            alt={product.name}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="detail-image-placeholder">
            <ImageOff size={48} />
          </div>
        )}
        <div className="detail-info">
          <h3 className="detail-name">{product.name}</h3>
          <div className="detail-meta">
            <span className="detail-brand">{product.brand}</span>
            <span className="detail-unit">{product.unit}</span>
          </div>
          <div className="detail-price">${product.price}</div>
          <div className="detail-store">en {product.store}</div>
          {product.url && (
            <a href={product.url} target="_blank" className="detail-link" rel="noreferrer">
              <ExternalLink size={14} /> Ver en {product.store}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function PriceChart({ history }: { history: PriceHistoryEntry[] }) {
  const sorted = [...history].reverse()
  const prices = sorted.map(e => e.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const width = 160
  const height = 50
  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1 || 1)) * width
    const y = height - ((p - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })

  return (
    <div style={{ padding: '0.5rem' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#863bff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((pt, i) => (
          <circle key={i} cx={pt.split(',')[0]} cy={pt.split(',')[1]} r="2.5" fill="#863bff">
            <title>{`${sorted[i].recorded_at.slice(0, 10)}: $${sorted[i].price}`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        ${min.toFixed(2)} — ${max.toFixed(2)}
      </div>
    </div>
  )
}

export function ComparisonTable({
  items, selectedStores, results, alternatives, overrides,
  loading, onRefreshStore, onEditCell, onExcludeCell,
  onAddToCart, getWhatsAppLinkFn,
}: ComparisonTableProps) {
  const [showResults, setShowResults] = useState(true)
  const [openSuggestions, setOpenSuggestions] = useState<Set<string>>(new Set())
  const [priceHistoryData, setPriceHistoryData] = useState<Record<string, PriceHistoryEntry[]>>({})
  const [priceHistoryLoading, setPriceHistoryLoading] = useState<Record<string, boolean>>({})
  const [activeHistory, setActiveHistory] = useState<string | null>(null)
  const [detailProduct, setDetailProduct] = useState<ProductResult | null>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setActiveHistory(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadPriceHistory = useCallback(async (query: string, store: string) => {
    const key = `${query}|${store}`
    if (priceHistoryData[key]) {
      setActiveHistory(key)
      return
    }
    setPriceHistoryLoading(prev => ({ ...prev, [key]: true }))
    setActiveHistory(key)
    try {
      const data = await fetchPriceHistory(store, query)
      setPriceHistoryData(prev => ({ ...prev, [key]: data }))
    } catch {
      setPriceHistoryData(prev => ({ ...prev, [key]: [] }))
    } finally {
      setPriceHistoryLoading(prev => ({ ...prev, [key]: false }))
    }
  }, [priceHistoryData])

  const toggleSuggestion = (key: string) => {
    setOpenSuggestions(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const storeTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const s of selectedStores) {
      totals[s] = calculateTotal(s, items, results, overrides)
    }
    return totals
  }, [selectedStores, items, results, overrides])

  if (Object.keys(results).length === 0) return null

  return (
    <div className="card" style={{ padding: 0 }}>
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
              {selectedStores.map(s => (
                <th key={s}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{s}</span>
                    <button className="btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => onRefreshStore(s)} disabled={loading}><Zap size={12} /> Refrescar</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(it => {
              const storePrices = selectedStores.map(s => ({
                store: s,
                price: (() => {
                  const cellOverrides = overrides[it.query]?.[s]
                  if (cellOverrides?.excluded) return Infinity
                  const p = cellOverrides?.overrideProduct || results[it.query]?.[s]
                  return p?.price ?? Infinity
                })(),
              }))
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

                    return (
                      <td key={s} className={`product-cell${isCheapest ? ' cheapest-cell' : ''}${aClass ? ' ' + aClass : ''}${isExcluded ? ' excluded-cell' : ''}`}>
                        <div className="cell-actions-top">
                          <button className="cell-btn cell-edit" title="Cambiar producto" onClick={() => onEditCell(it.query, s)}><Edit3 size={12} /></button>
                          <button className={`cell-btn ${isExcluded ? 'cell-include' : 'cell-exclude'}`} title={isExcluded ? 'Incluir en comparación' : 'Excluir de comparación'} onClick={() => onExcludeCell(it.query, s)}>{isExcluded ? <CheckCircle2 size={12} /> : <X size={12} />}</button>
                        </div>
                        {isExcluded ? (
                          <span className="na-text">Excluido</span>
                        ) : p ? (
                          <div className="tooltip-container">
                            {diff && <span className="diff-badge" title={`Seleccionaste: ${it.selectedProduct!.brand} - ${it.selectedProduct!.unit}`}>!</span>}
                            {p.price_change_pct != null && (
                              <span className={`price-change ${p.price_change_pct < 0 ? 'price-down' : 'price-up'}`} title={p.price_change_pct < 0 ? 'Precio bajó' : 'Precio subió'}>
                                {p.price_change_pct < 0 ? '🔻' : '🔺'}{Math.abs(p.price_change_pct).toFixed(1)}%
                              </span>
                            )}
                            {aClass && <div className="age-indicator" title={`Actualizado: ${new Date(p.last_updated!).toLocaleString()}`} />}
                            <div className="prod-header">
                              {p.image_url ? (
                                <img
                                  className="product-thumbnail"
                                  src={p.image_url}
                                  alt={p.name}
                                  onClick={() => setDetailProduct(p)}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              ) : (
                                <div className="product-thumbnail placeholder" onClick={() => setDetailProduct(p)}>
                                  <ImageOff size={16} />
                                </div>
                              )}
                              <div className="prod-name" onClick={() => setDetailProduct(p)}>{p.name}</div>
                            </div>
                            <div className="prod-brand">{p.brand}</div>
                            <div className="prod-price">
                              ${p.price * it.quantity}
                              <button
                                className="cell-btn history-btn"
                                title="Historial de precios"
                                onClick={(e) => { e.stopPropagation(); loadPriceHistory(it.query, s) }}
                              >
                                <TrendingUp size={10} />
                              </button>
                            </div>
                            <div className="prod-unit">${p.price} / {p.unit}</div>
                            {isCheapest && <span className="cheapest-badge">Mínimo</span>}
                            {p.url && <a href={p.url} target="_blank" className="prod-link" rel="noreferrer">Ver <ExternalLink size={10} /></a>}
                            <div className="tooltip"><strong>Detalles:</strong><br />{p.details || 'Sin detalles'}</div>
                            {activeHistory === `${it.query}|${s}` && (
                              <div className="history-popup" ref={historyRef}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.25rem' }}>Historial de precios</div>
                                {priceHistoryLoading[`${it.query}|${s}`] ? (
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Cargando...</div>
                                ) : priceHistoryData[`${it.query}|${s}`]?.length ? (
                                  <PriceChart history={priceHistoryData[`${it.query}|${s}`]} />
                                ) : (
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Sin datos históricos</div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : alternatives[it.query]?.[s] ? (
                          <div className="no-stock-cell">
                            <span className="no-stock-text">Sin stock</span>
                            <button
                              className="btn-suggestion"
                              onClick={(e) => { e.stopPropagation(); toggleSuggestion(`${it.query}|${s}`) }}
                            >
                              Sugerencias {openSuggestions.has(`${it.query}|${s}`) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            {openSuggestions.has(`${it.query}|${s}`) && (
                              <div className="suggestions-dropdown">
                                {alternatives[it.query][s].map((alt, i) => (
                                  <div key={i} className="suggestion-item">
                                    <span className="suggestion-name">{alt.name}</span>
                                    <span className="suggestion-price">${alt.price}</span>
                                    <span className="suggestion-store">{alt.store}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="na-text">No disponible</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td><span className="total-label">TOTAL</span></td>
              {selectedStores.map(s => <td key={s}>${storeTotals[s]}</td>)}
            </tr>
            <tr>
              <td></td>
              {selectedStores.map(s => (
                <td key={s} className="action-cell">
                  <div className="action-buttons">
                    <button className="btn-secondary" onClick={() => onAddToCart(s)} disabled={loading}><ShoppingCart size={14} /> Carrito</button>
                    <a href={getWhatsAppLinkFn(s)} target="_blank" className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.4rem 0.7rem' }} rel="noreferrer"><Send size={14} /> WhatsApp</a>
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      {detailProduct && <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} />}
    </div>
  )
}
