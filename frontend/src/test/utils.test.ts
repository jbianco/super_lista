import { describe, it, expect } from 'vitest'
import { ageClass, calculateTotal, getWhatsAppLink } from '../utils'
import type { ShoppingItem, OverridesMap, ResultsMap } from '../types'

const mockResults: ResultsMap = {
  'Leche': {
    Carrefour: { name: 'Leche Entera 1L', price: 1200, brand: 'La Serenísima', unit: '1L', store: 'Carrefour', last_updated: new Date().toISOString() },
    Changomas: { name: 'Leche Entera 1L', price: 1150, brand: 'La Serenísima', unit: '1L', store: 'Changomas', last_updated: new Date().toISOString() },
  },
  'Pan': {
    Carrefour: { name: 'Pan Lactal 500g', price: 800, brand: 'Bimbo', unit: '500g', store: 'Carrefour', last_updated: new Date().toISOString() },
    Changomas: { name: 'Pan Lactal 500g', price: 750, brand: 'Bimbo', unit: '500g', store: 'Changomas', last_updated: new Date().toISOString() },
  },
}

const mockItems: ShoppingItem[] = [
  { query: 'Leche', quantity: 2 },
  { query: 'Pan', quantity: 1 },
]

describe('calculateTotal', () => {
  it('sums prices with quantities for a store', () => {
    const total = calculateTotal('Carrefour', mockItems, mockResults, {})
    expect(total).toBe(1200 * 2 + 800)
  })

  it('returns 0 when no results match', () => {
    const total = calculateTotal('Disco', mockItems, mockResults, {})
    expect(total).toBe(0)
  })

  it('replaces price with override product price', () => {
    const overrides: OverridesMap = {
      'Leche': {
        Carrefour: { overrideProduct: { name: 'Leche Descremada 1L', price: 1300, brand: 'Ilolay', unit: '1L', store: 'Carrefour' }, excluded: false },
      },
    }
    const total = calculateTotal('Carrefour', mockItems, mockResults, overrides)
    expect(total).toBe(1300 * 2 + 800)
  })

  it('excludes items marked as excluded', () => {
    const overrides: OverridesMap = {
      'Leche': {
        Carrefour: { excluded: true },
      },
    }
    const total = calculateTotal('Carrefour', mockItems, mockResults, overrides)
    expect(total).toBe(800)
  })

  it('excluded items are skipped even with override product', () => {
    const overrides: OverridesMap = {
      'Leche': {
        Carrefour: { overrideProduct: { name: 'Leche Descremada 1L', price: 1300, brand: 'Ilolay', unit: '1L', store: 'Carrefour' }, excluded: true },
      },
    }
    const total = calculateTotal('Carrefour', mockItems, mockResults, overrides)
    expect(total).toBe(800)
  })
})

describe('ageClass', () => {
  it('returns empty string when no date', () => {
    expect(ageClass(undefined)).toBe('')
  })

  it('returns empty string for fresh data (<1 day)', () => {
    const date = new Date().toISOString()
    expect(ageClass(date)).toBe('')
  })

  it('returns age-day for data 1-3 days old', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(ageClass(date)).toBe('age-day')
  })

  it('returns age-aging for data 3-7 days old', () => {
    const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(ageClass(date)).toBe('age-aging')
  })

  it('returns age-stale for data 7+ days old', () => {
    const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    expect(ageClass(date)).toBe('age-stale')
  })
})

describe('getWhatsAppLink', () => {
  it('generates a whatsapp link with product list', () => {
    const link = getWhatsAppLink('Carrefour', mockItems, mockResults, {})
    expect(link).toContain('wa.me')
    expect(link).toContain('SuperLista')
    expect(link).toContain('Carrefour')
    expect(link).toContain('TOTAL')
  })

  it('skips excluded items', () => {
    const overrides: OverridesMap = {
      'Leche': { Carrefour: { excluded: true } },
    }
    const link = getWhatsAppLink('Carrefour', mockItems, mockResults, overrides)
    expect(link).not.toContain('Leche')
    expect(link).toContain('Pan')
  })

  it('uses override product name when present', () => {
    const overrides: OverridesMap = {
      'Leche': {
        Carrefour: { overrideProduct: { name: 'Leche Descremada', price: 1300, brand: 'Ilolay', unit: '1L', store: 'Carrefour' }, excluded: false },
      },
    }
    const link = decodeURIComponent(getWhatsAppLink('Carrefour', mockItems, mockResults, overrides))
    expect(link).toContain('Leche Descremada')
  })
})
