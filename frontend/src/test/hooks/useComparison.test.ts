import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComparison } from '../../hooks/useComparison'
import * as api from '../../api'
import type { BudgetResponse } from '../../api'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useComparison', () => {
  it('initializes with all stores selected', () => {
    const { result } = renderHook(() => useComparison())
    expect(result.current.selectedStores).toEqual(['Carrefour', 'Changomas', 'Disco', 'Jumbo', 'MercadoLibre'])
  })

  it('toggles a store selection', () => {
    const { result } = renderHook(() => useComparison())
    act(() => result.current.setSelectedStores(['Carrefour', 'Changomas']))
    expect(result.current.selectedStores).toEqual(['Carrefour', 'Changomas'])
  })

  it('handles cell override', () => {
    const { result } = renderHook(() => useComparison())
    const product = { name: 'Override Product', price: 999, brand: 'Brand', unit: '1L', store: 'Carrefour' }
    act(() => result.current.handleCellOverride('Leche', 'Carrefour', product))
    expect(result.current.overrides['Leche']['Carrefour'].overrideProduct).toEqual(product)
    expect(result.current.overrides['Leche']['Carrefour'].excluded).toBe(false)
    expect(result.current.editCell).toBeNull()
  })

  it('toggles cell exclusion', () => {
    const { result } = renderHook(() => useComparison())
    act(() => result.current.handleExcludeCell('Leche', 'Carrefour'))
    expect(result.current.overrides['Leche']['Carrefour'].excluded).toBe(true)
    act(() => result.current.handleExcludeCell('Leche', 'Carrefour'))
    expect(result.current.overrides['Leche']['Carrefour'].excluded).toBe(false)
  })

  it('persists selectedStores and overrides to localStorage', () => {
    const { result } = renderHook(() => useComparison())
    act(() => result.current.setSelectedStores(['Carrefour']))
    act(() => result.current.handleExcludeCell('Leche', 'Carrefour'))
    expect(JSON.parse(localStorage.getItem('sl_stores')!)).toEqual(['Carrefour'])
    expect(localStorage.getItem('sl_overrides')).toContain('Leche')
  })

  it('restores selectedStores from localStorage', () => {
    localStorage.setItem('sl_stores', JSON.stringify(['Disco', 'Jumbo']))
    const { result } = renderHook(() => useComparison())
    expect(result.current.selectedStores).toEqual(['Disco', 'Jumbo'])
  })

  it('filters out unknown stores from localStorage', () => {
    localStorage.setItem('sl_stores', JSON.stringify(['Carrefour', 'Tadicor', 'Super Mami']))
    const { result } = renderHook(() => useComparison())
    expect(result.current.selectedStores).toEqual(['Carrefour'])
  })

  it('performs calculateComparison and transforms results', async () => {
    const mockResponse: BudgetResponse = {
      budgets: {
        Carrefour: {
          items: [{ query: 'Leche', product: { name: 'Leche 1L', price: 1200, brand: 'Ser', unit: '1L', store: 'Carrefour', details: 'Detalle' } }],
          total: 1200,
          whatsapp_message: '',
        },
      },
    }
    vi.spyOn(api, 'fetchBudget').mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useComparison())
    await act(async () => {
      await result.current.calculateComparison([{ query: 'Leche', quantity: 1 }])
    })

    expect(result.current.results['Leche']['Carrefour'].name).toBe('Leche 1L')
    expect(result.current.results['Leche']['Carrefour'].price).toBe(1200)
  })

  it('sets error when calculateComparison fails', async () => {
    vi.spyOn(api, 'fetchBudget').mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useComparison())
    await act(async () => {
      await result.current.calculateComparison([{ query: 'Leche', quantity: 1 }])
    })

    expect(result.current.error).toBe('Network error')
  })

  it('refreshes a single store', async () => {
    const mockResponse: BudgetResponse = {
      budgets: {
        Carrefour: {
          items: [{ query: 'Leche', product: { name: 'Leche Fresca 1L', price: 1250, brand: 'Ser', unit: '1L', store: 'Carrefour' } }],
          total: 1250,
          whatsapp_message: '',
        },
      },
    }
    vi.spyOn(api, 'fetchBudget').mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useComparison())
    await act(async () => {
      await result.current.refreshStore('Carrefour', [{ query: 'Leche', quantity: 1 }])
    })

    expect(result.current.results['Leche']['Carrefour'].name).toBe('Leche Fresca 1L')
    expect(result.current.results['Leche']['Carrefour'].price).toBe(1250)
  })

  it('handles addToCart with missing credentials', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const { result } = renderHook(() => useComparison())

    await act(async () => {
      await result.current.handleAddToCart('Carrefour', [{ query: 'Leche', quantity: 1 }], {})
    })

    expect(alertSpy).toHaveBeenCalled()
    alertSpy.mockRestore()
  })
})
