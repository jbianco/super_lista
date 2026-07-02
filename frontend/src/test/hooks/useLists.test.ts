import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLists } from '../../hooks/useLists'

beforeEach(() => {
  localStorage.clear()
})

describe('useLists', () => {
  it('returns a default list when localStorage is empty', () => {
    const { result } = renderHook(() => useLists())
    expect(result.current.lists).toHaveLength(1)
    expect(result.current.lists[0].name).toBe('Lista Semanal')
    expect(result.current.lists[0].items).toHaveLength(2)
  })

  it('creates a new list', () => {
    const { result } = renderHook(() => useLists())
    act(() => result.current.createList())
    expect(result.current.lists).toHaveLength(2)
    expect(result.current.lists[1].name).toContain('Nueva Lista')
    expect(result.current.activeListId).toBe(result.current.lists[1].id)
  })

  it('deletes a list', () => {
    const { result } = renderHook(() => useLists())
    const firstId = result.current.lists[0].id
    act(() => result.current.createList())
    expect(result.current.lists).toHaveLength(2)
    act(() => result.current.deleteList(firstId))
    expect(result.current.lists).toHaveLength(1)
  })

  it('does not delete the last list', () => {
    const { result } = renderHook(() => useLists())
    const id = result.current.lists[0].id
    act(() => result.current.deleteList(id))
    expect(result.current.lists).toHaveLength(1)
  })

  it('renames a list', () => {
    const { result } = renderHook(() => useLists())
    const id = result.current.lists[0].id
    act(() => result.current.renameList(id, 'Mi Lista'))
    expect(result.current.lists[0].name).toBe('Mi Lista')
  })

  it('adds an item to the active list', () => {
    const { result } = renderHook(() => useLists())
    act(() => result.current.addItem({ query: 'Arroz', quantity: 2 }))
    expect(result.current.activeList.items).toHaveLength(3)
    expect(result.current.activeList.items[2].query).toBe('Arroz')
  })

  it('removes an item by index', () => {
    const { result } = renderHook(() => useLists())
    act(() => result.current.removeItem(0))
    expect(result.current.activeList.items).toHaveLength(1)
    expect(result.current.activeList.items[0].query).toBe('Pan')
  })

  it('updates item quantity', () => {
    const { result } = renderHook(() => useLists())
    act(() => result.current.updateQuantity(0, 1))
    expect(result.current.activeList.items[0].quantity).toBe(2)
  })

  it('does not reduce quantity below 1', () => {
    const { result } = renderHook(() => useLists())
    act(() => result.current.updateQuantity(0, -10))
    expect(result.current.activeList.items[0].quantity).toBe(1)
  })

  it('updates item query text', () => {
    const { result } = renderHook(() => useLists())
    act(() => result.current.updateItemQuery(0, 'Leche Entera'))
    expect(result.current.activeList.items[0].query).toBe('Leche Entera')
  })

  it('switches active list', () => {
    const { result } = renderHook(() => useLists())
    act(() => result.current.createList())
    const newId = result.current.lists[1].id
    act(() => result.current.setActiveListId(newId))
    expect(result.current.activeListId).toBe(newId)
  })

  it('persists lists to localStorage', () => {
    const { result } = renderHook(() => useLists())
    act(() => result.current.addItem({ query: 'Test', quantity: 1 }))
    const saved = JSON.parse(localStorage.getItem('sl_lists')!)
    expect(saved).toHaveLength(1)
    expect(saved[0].items).toHaveLength(3)
  })

  it('restores lists from localStorage on mount', () => {
    localStorage.setItem('sl_lists', JSON.stringify([{ id: 'x', name: 'Restored', items: [{ query: 'Item1', quantity: 1 }] }]))
    localStorage.setItem('sl_activeId', 'x')
    const { result } = renderHook(() => useLists())
    expect(result.current.lists).toHaveLength(1)
    expect(result.current.lists[0].name).toBe('Restored')
    expect(result.current.activeListId).toBe('x')
  })
})
