import { useState } from 'react'
import { Plus, Trash2, List as ListIcon } from 'lucide-react'
import type { ShoppingList } from '../types'

interface SidebarProps {
  lists: ShoppingList[]
  activeListId: string
  onSelectList: (id: string) => void
  onCreateList: () => void
  onDeleteList: (id: string) => void
  onRenameList: (id: string, name: string) => void
}

export function Sidebar({ lists, activeListId, onSelectList, onCreateList, onDeleteList, onRenameList }: SidebarProps) {
  const [editingListId, setEditingListId] = useState<string | null>(null)

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}><ListIcon size={18} /> Mis Listas</h3>
        <button className="btn-primary" onClick={onCreateList} style={{ padding: '0.3rem' }}><Plus size={16} /></button>
      </div>
      {lists.map(list => (
        <div key={list.id} onClick={() => onSelectList(list.id)} className={`list-item-sidebar ${activeListId === list.id ? 'active' : ''}`}>
          {editingListId === list.id ? (
            <input
              autoFocus
              defaultValue={list.name}
              onBlur={(e) => { onRenameList(list.id, e.target.value); setEditingListId(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onRenameList(list.id, (e.target as HTMLInputElement).value); setEditingListId(null) } }}
            />
          ) : (
            <> <span onDoubleClick={() => setEditingListId(list.id)}>{list.name}</span> <Trash2 size={14} onClick={(e) => { e.stopPropagation(); onDeleteList(list.id) }} /> </>
          )}
        </div>
      ))}
    </div>
  )
}
