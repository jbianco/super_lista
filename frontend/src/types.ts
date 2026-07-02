import type { ProductResult } from './api'

export interface StoreConfig {
  auth: {
    methods: { id: string; label: string; fields: { key: string; label: string; type: string; placeholder: string }[] }[]
  }
}

export interface ShoppingItem {
  query: string
  quantity: number
  selectedProduct?: ProductResult
}

export interface ShoppingList {
  id: string
  name: string
  items: ShoppingItem[]
}

export interface CellOverride {
  overrideProduct?: ProductResult
  excluded: boolean
}

export interface BudgetItem {
  query: string
  product?: ProductResult | null
  alternatives?: ProductResult[]
}

export type OverridesMap = Record<string, Record<string, CellOverride>>
export type ResultsMap = Record<string, Record<string, ProductResult>>
export type AlternativesMap = Record<string, Record<string, ProductResult[]>>
