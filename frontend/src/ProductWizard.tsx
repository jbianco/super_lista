import { useState, useEffect } from 'react'
import { Loader2, Check, Zap, X } from 'lucide-react'
import { fetchProductOptions, type ProductResult, type CharacteristicOption } from './api'
import './ProductWizard.css'

interface ProductWizardProps {
  query: string;
  stores: string[];
  onConfirm: (product: ProductResult) => void;
  onCancel: () => void;
}

type Step = 'characteristic' | 'brand' | 'price' | 'done' | 'confirm_lowest';

const UNIT_LABELS: Record<string, string> = {
  '1L': '1 litro',
  '2L': '2 litros',
  '1.5L': '1.5 litros',
  '2.25L': '2.25 litros',
  '500ml': '500 ml',
  '473ml': '473 ml',
  '355ml': '355 ml',
  '725ml': '725 ml',
  '500g': '500 gramos',
  '400g': '400 gramos',
  '600g': '600 gramos',
  '800g': '800 gramos',
  '1kg': '1 kilo',
  'u': 'Unidad',
  '4u': '4 unidades',
  '6u': '6 unidades',
  '12u': '12 unidades',
};

function unitLabel(unit: string): string {
  if (unit === 'Sin característica') return unit
  return UNIT_LABELS[unit] || unit
}

export default function ProductWizard({ query, stores, onConfirm, onCancel }: ProductWizardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<CharacteristicOption[]>([])
  const [cheapest, setCheapest] = useState<ProductResult | null>(null)
  const [step, setStep] = useState<Step>('characteristic')
  const [lowestPrice, setLowestPrice] = useState(false)

  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null)

  useEffect(() => {
    fetchProductOptions(query, stores)
      .then(res => {
        setOptions(res.characteristics)
        setCheapest(res.cheapest)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Error al cargar opciones'))
      .finally(() => setLoading(false))
  }, [query, stores])

  const currentChar = options.find(c => c.unit === selectedUnit)

  const handleSelectBrand = (brand: string) => {
    setSelectedBrand(brand)
    setStep('price')
  }

  const handleSelectProduct = (product: ProductResult) => {
    setSelectedProduct(product)
    setStep('done')
  }

  const goBack = () => {
    if (step === 'brand') {
      setStep('characteristic')
      setSelectedUnit(null)
    } else if (step === 'price') {
      setStep('brand')
      setSelectedBrand(null)
      setSelectedProduct(null)
    } else if (step === 'confirm_lowest') {
      setStep('characteristic')
      setSelectedUnit(null)
      setSelectedProduct(null)
      setLowestPrice(false)
    }
  }

  const handleConfirm = () => {
    if (selectedProduct) {
      onConfirm(selectedProduct)
    }
  }

  const handlePickManually = () => {
    setLowestPrice(false)
    setStep('brand')
  }

  if (loading) {
    return (
      <div className="wizard-overlay">
        <div className="wizard-card">
          <div className="wizard-loading">
            <Loader2 className="spinner" size={32} />
            <p>Buscando opciones para <strong>"{query}"</strong>...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="wizard-overlay">
        <div className="wizard-card">
          <div className="wizard-error">
            <p>{error}</p>
            <button className="btn-secondary" onClick={onCancel}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  const stepLabels = ['Característica', 'Marca', 'Precio']
  const stepIndex = step === 'characteristic' ? 0 : step === 'brand' ? 1 : step === 'price' ? 2 : step === 'confirm_lowest' ? 2 : 3

  return (
    <div className="wizard-overlay" onClick={onCancel}>
      <div className="wizard-card" onClick={e => e.stopPropagation()}>
        <div className="wizard-header">
          <h3>Agregar: {query}</h3>
          <button className="wizard-close" onClick={onCancel}><X size={20} /></button>
        </div>

        {step !== 'done' && (
          <div className="wizard-steps">
            {stepLabels.map((label, i) => (
              <div key={label} className={`wizard-step ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}>
                <div className="step-circle">{i < stepIndex ? <Check size={14} /> : i + 1}</div>
                <span className="step-label">{label}</span>
              </div>
            ))}
          </div>
        )}

        {step === 'characteristic' && (
          <div className="wizard-body">
            {options.length === 0 && <p className="wizard-empty">No se encontraron opciones para "{query}"</p>}

            {options.length > 1 && (
              <div className="wizard-section">
                <label className="lowest-price-toggle">
                  <input type="checkbox" checked={lowestPrice} onChange={e => setLowestPrice(e.target.checked)} />
                  <span>Menor precio <Zap size={14} /></span>
                  {lowestPrice && cheapest && (
                    <span className="cheapest-hint">
                      ({cheapest.name} — ${cheapest.price} en {cheapest.store})
                    </span>
                  )}
                </label>
              </div>
            )}

            {options.length > 0 && (
              <div className="wizard-section">
                <p className="wizard-section-title">Seleccioná la característica (peso, tamaño):</p>
                <div className="option-grid">
                  {options.map(c => (
                    <button
                      key={c.unit}
                      className={`option-card ${selectedUnit === c.unit ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedUnit(c.unit)
                        setSelectedBrand(null)
                        setSelectedProduct(null)
                        if (lowestPrice) {
                          const allProds = c.brands.flatMap(b => b.products)
                          const cheapestProd = allProds.reduce((a, b) => a.price < b.price ? a : b)
                          setSelectedProduct(cheapestProd)
                          setStep('confirm_lowest')
                        } else {
                          setStep('brand')
                        }
                      }}
                    >
                      <span className="option-unit">{unitLabel(c.unit)}</span>
                      <span className="option-sub">{c.brands.length} {c.brands.length === 1 ? 'marca' : 'marcas'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(step === 'brand' || step === 'price' || step === 'confirm_lowest') && (
          <button className="wizard-back" onClick={goBack}>
            ← Volver
          </button>
        )}

        {step === 'brand' && currentChar && (
          <div className="wizard-body">
            <div className="wizard-section">
              <p className="wizard-section-title">
                Marcas disponibles para <strong>{selectedUnit ? unitLabel(selectedUnit) : selectedUnit}</strong>:
              </p>
              <div className="brand-list">
                {currentChar.brands.map(b => (
                  <button
                    key={b.name}
                    className={`brand-card ${b.common_count > 1 ? 'common' : ''}`}
                    onClick={() => handleSelectBrand(b.name)}
                  >
                    <div className="brand-info">
                      <span className="brand-name">{b.name}</span>
                      {b.common_count > 1 && (
                        <span className="brand-common">Común en {b.common_count} {b.common_count === 1 ? 'tienda' : 'tiendas'}</span>
                      )}
                      {b.common_count === 1 && (
                        <span className="brand-exclusive">Exclusiva</span>
                      )}
                    </div>
                    <span className="brand-price">
                      Desde ${Math.min(...b.products.map(p => p.price))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'price' && currentChar && selectedBrand && (
          <div className="wizard-body">
            <div className="wizard-section">
              <p className="wizard-section-title">
                {selectedBrand} — Precios por tienda:
              </p>
              <div className="price-list">
                {currentChar.brands
                  .find(b => b.name === selectedBrand)
                  ?.products
                  .sort((a, b) => a.price - b.price)
                  .map(p => (
                    <button
                      key={`${p.store}-${p.price}`}
                      className={`price-card ${selectedProduct?.store === p.store && selectedProduct?.price === p.price ? 'selected' : ''}`}
                      onClick={() => handleSelectProduct(p)}
                    >
                      <div className="price-store">
                        <strong>{p.store}</strong>
                        {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="price-link" onClick={e => e.stopPropagation()}>Ver</a>}
                      </div>
                      <span className="price-value">${p.price}</span>
                      {currentChar.brands
                        .find(b => b.name === selectedBrand)
                        ?.products
                        .every(p2 => p2.price >= p.price) && (
                        <span className="price-badge">Menor precio</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
            {selectedProduct && (
              <button className="btn-primary wizard-confirm" onClick={handleConfirm}>
                Agregar a la lista
              </button>
            )}
          </div>
        )}

        {step === 'confirm_lowest' && selectedProduct && (
          <div className="wizard-body">
            <div className="wizard-section">
              <p className="wizard-section-title">
                Menor precio para <strong>{selectedUnit ? unitLabel(selectedUnit) : selectedUnit}</strong>:
              </p>
              <div className="lowest-preview">
                <div className="lowest-product">
                  <div className="lowest-badge"><Zap size={16} /> Menor precio</div>
                  <p className="lowest-name"><strong>{selectedProduct.name}</strong></p>
                  <p className="lowest-brand">Marca: {selectedProduct.brand}</p>
                  <p className="lowest-price-text">${selectedProduct.price}</p>
                  <p className="lowest-store">en {selectedProduct.store}</p>
                  <span className="price-badge" style={{ marginTop: '0.5rem' }}>El más barato</span>
                </div>
              </div>
            </div>
            <div className="wizard-actions">
              <button className="btn-primary wizard-confirm" onClick={handleConfirm}>
                Agregar a la lista
              </button>
              <button className="btn-secondary" onClick={handlePickManually}>
                Elegir otra opción
              </button>
            </div>
          </div>
        )}

        {step === 'done' && selectedProduct && (
          <div className="wizard-body">
            <div className="wizard-done">
              <div className="done-icon"><Check size={32} /></div>
              <p className="done-title">Producto seleccionado</p>
              <div className="done-product">
                <p><strong>{selectedProduct.name}</strong></p>
                <p>Marca: {selectedProduct.brand}</p>
                <p>Precio: ${selectedProduct.price}</p>
                <p>Tienda: {selectedProduct.store}</p>
              </div>
              <div className="wizard-actions" style={{ padding: 0, marginTop: '1rem' }}>
                <button className="btn-primary wizard-confirm" onClick={handleConfirm}>
                  Agregar a la lista
                </button>
                <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {step === 'characteristic' && (
          <div className="wizard-footer">
            <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  )
}
