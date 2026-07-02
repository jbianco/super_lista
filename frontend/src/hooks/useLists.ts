import { useState, useEffect, useCallback } from 'react'
import type { ShoppingList, ShoppingItem } from '../types'

function loadLists(): ShoppingList[] {
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
}

export function useLists() {
  const [lists, setLists] = useState<ShoppingList[]>(loadLists)
  const [activeListId, setActiveListId] = useState<string>(() => localStorage.getItem('sl_activeId') || '1')

  const activeList = lists.find(l => l.id === activeListId) || lists[0]

  useEffect(() => {
    localStorage.setItem('sl_lists', JSON.stringify(lists))
    localStorage.setItem('sl_activeId', activeListId)
  }, [lists, activeListId])

  const createList = useCallback(() => {
    const newId = Math.random().toString(36).substr(2, 9)
    setLists(prev => [...prev, { id: newId, name: `Nueva Lista ${prev.length + 1}`, items: [] }])
    setActiveListId(newId)
  }, [])

  const deleteList = useCallback((id: string) => {
    setLists(prev => {
      if (prev.length === 1) return prev
      const next = prev.filter(l => l.id !== id)
      if (activeListId === id) setActiveListId(next[0].id)
      return next
    })
  }, [activeListId])

  const renameList = useCallback((id: string, newName: string) => {
    setLists(prev => prev.map(l => l.id === id ? { ...l, name: newName } : l))
  }, [])

  const addItem = useCallback((item: ShoppingItem) => {
    setLists(prev => prev.map(l => l.id === activeListId ? { ...l, items: [...l.items, item] } : l))
  }, [activeListId])

  const removeItem = useCallback((index: number) => {
    setLists(prev => prev.map(l => l.id === activeListId ? { ...l, items: l.items.filter((_, i) => i !== index) } : l))
  }, [activeListId])

  const updateQuantity = useCallback((index: number, delta: number) => {
    setLists(prev => prev.map(l => l.id === activeListId ? {
      ...l, items: l.items.map((item, i) => i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
    } : l))
  }, [activeListId])

  const updateItemQuery = useCallback((index: number, query: string) => {
    setLists(prev => prev.map(l => l.id === activeListId ? {
      ...l, items: l.items.map((item, i) => i === index ? { ...item, query } : item)
    } : l))
  }, [activeListId])

  return {
    lists, setLists, activeListId, setActiveListId, activeList,
    createList, deleteList, renameList,
    addItem, removeItem, updateQuantity, updateItemQuery,
  }
}
