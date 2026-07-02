import { useState, useEffect, useCallback } from 'react'
import { fetchBudget, addToCart as apiAddToCart } from '../api'
import type { ProductResult } from '../api'
import type { ShoppingItem, OverridesMap, ResultsMap, AlternativesMap } from '../types'
import { ALL_STORES, STORE_CART_URLS } from '../utils'

function loadSelectedStores(): string[] {
  const saved = localStorage.getItem('sl_stores')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed.filter(s => ALL_STORES.includes(s))
    } catch (e) { /* ignore */ }
  }
  return [...ALL_STORES]
}

function loadResults(): ResultsMap {
  const saved = localStorage.getItem('sl_results')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      const cleaned: ResultsMap = {}
      for (const [q, stores] of Object.entries(parsed)) {
        const filtered: Record<string, ProductResult> = {}
        for (const s of ALL_STORES) {
          if ((stores as Record<string, ProductResult>)[s]) filtered[s] = (stores as Record<string, ProductResult>)[s]
        }
        if (Object.keys(filtered).length) cleaned[q] = filtered
      }
      return cleaned
    } catch (e) { /* ignore */ }
  }
  return {}
}

function loadOverrides(): OverridesMap {
  const saved = localStorage.getItem('sl_overrides')
  if (saved) {
    try { return JSON.parse(saved) }
    catch (e) { /* ignore */ }
  }
  return {}
}

export function useComparison() {
  const [selectedStores, setSelectedStores] = useState<string[]>(loadSelectedStores)
  const [results, setResults] = useState<ResultsMap>(loadResults)
  const [overrides, setOverrides] = useState<OverridesMap>(loadOverrides)
  const [editCell, setEditCell] = useState<{ query: string; store: string } | null>(null)
  const [editQueryInput, setEditQueryInput] = useState<string | null>(null)
  const [editOriginalQuery, setEditOriginalQuery] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alternatives, setAlternatives] = useState<AlternativesMap>({})

  useEffect(() => {
    localStorage.setItem('sl_stores', JSON.stringify(selectedStores))
    localStorage.setItem('sl_results', JSON.stringify(results))
    localStorage.setItem('sl_overrides', JSON.stringify(overrides))
  }, [selectedStores, results, overrides])

  const calculateComparison = useCallback(async (items: ShoppingItem[]) => {
    if (items.length === 0 || selectedStores.length === 0) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetchBudget(
        items.map(i => i.query),
        selectedStores,
      )

      const transformed: ResultsMap = {}
      const altMap: AlternativesMap = {}
      for (const [store, budget] of Object.entries(response.budgets)) {
        for (const item of budget.items) {
          if (item.product) {
            if (!transformed[item.query]) transformed[item.query] = {}
            transformed[item.query][store] = {
              ...item.product,
              details: item.product.details || `Precio unitario: $${item.product.price}\nUnidad: ${item.product.unit}`,
            }
          }
          if (item.alternatives?.length) {
            if (!altMap[item.query]) altMap[item.query] = {}
            altMap[item.query][store] = item.alternatives
          }
        }
      }
      setResults(transformed)
      setAlternatives(altMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener presupuesto')
    } finally {
      setLoading(false)
    }
  }, [selectedStores])

  const refreshStore = useCallback(async (store: string, items: ShoppingItem[]) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetchBudget(
        items.map(i => i.query),
        [store],
      )

      setResults(prev => {
        const next = { ...prev }
        const storeBudget = response.budgets[store]
        if (storeBudget) {
          for (const item of storeBudget.items) {
            if (item.product) {
              if (!next[item.query]) next[item.query] = {}
              next[item.query][store] = {
                ...item.product,
                details: `Refrescado: ${new Date().toLocaleTimeString()}\n${item.product.details || ''}\nPrecio: $${item.product.price}`,
              }
            }
          }
        }
        return next
      })
      setAlternatives(prev => {
        const next = { ...prev }
        const storeBudget = response.budgets[store]
        if (storeBudget) {
          for (const item of storeBudget.items) {
            if (item.alternatives?.length) {
              if (!next[item.query]) next[item.query] = {}
              next[item.query][store] = item.alternatives
            } else {
              delete next[item.query]?.[store]
              if (next[item.query] && !Object.keys(next[item.query]).length) delete next[item.query]
            }
          }
        }
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al refrescar')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCellOverride = useCallback((query: string, store: string, product: ProductResult) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (!next[query]) next[query] = {}
      next[query] = { ...next[query], [store]: { overrideProduct: product, excluded: false } }
      return next
    })
    setEditCell(null)
  }, [])

  const handleExcludeCell = useCallback((query: string, store: string) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (!next[query]) next[query] = {}
      const prevOverride = next[query]?.[store]
      next[query] = { ...next[query], [store]: { overrideProduct: prevOverride?.overrideProduct, excluded: !prevOverride?.excluded } }
      return next
    })
  }, [])

  const handleAddToCart = useCallback(async (
    store: string,
    items: ShoppingItem[],
    credentials: Record<string, Record<string, string>>,
  ) => {
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
      const cartItems = items
        .filter(it => !overrides[it.query]?.[store]?.excluded)
        .map(it => {
          const p = overrides[it.query]?.[store]?.overrideProduct || results[it.query]?.[store]
          return { query: it.query, quantity: it.quantity, name: p?.name || it.query }
        })

      const response = await apiAddToCart(
        store,
        { email: creds.email, password: creds.password, auth_method: method, token: creds.token },
        cartItems,
      )

      const failed = response.results.filter(r => r.status !== 'added')
      if (failed.length > 0) {
        setError(`No se pudieron agregar: ${failed.map(f => f.query).join(', ')}`)
      }

      const cartUrl = STORE_CART_URLS[store]
      if (cartUrl) window.open(cartUrl, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar al carrito')
    } finally {
      setLoading(false)
    }
  }, [overrides, results])

  return {
    selectedStores, setSelectedStores,
    results, setResults,
    alternatives,
    overrides,
    editCell, setEditCell,
    editQueryInput, setEditQueryInput,
    editOriginalQuery, setEditOriginalQuery,
    loading, error,
    calculateComparison,
    refreshStore,
    handleCellOverride,
    handleExcludeCell,
    handleAddToCart,
  }
}
