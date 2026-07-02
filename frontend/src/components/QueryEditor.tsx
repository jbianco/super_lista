import { X } from 'lucide-react'

interface QueryEditorProps {
  editQueryInput: string
  onChange: (value: string) => void
  onSearch: () => void
  onCancel: () => void
  storeName: string
}

export function QueryEditor({ editQueryInput, onChange, onSearch, onCancel, storeName }: QueryEditorProps) {
  return (
    <div className="wizard-overlay" onClick={onCancel}>
      <div className="wizard-card query-edit-card" onClick={e => e.stopPropagation()}>
        <div className="wizard-header">
          <h3>Editar búsqueda para {storeName}</h3>
          <button className="wizard-close" onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="wizard-body">
          <div className="wizard-section">
            <p className="wizard-section-title">Modificá el término de búsqueda:</p>
            <input
              className="query-input"
              type="text"
              value={editQueryInput}
              onChange={e => onChange(e.target.value)}
              autoFocus
            />
          </div>
          <div className="wizard-actions" style={{ marginTop: '1rem' }}>
            <button className="btn-primary" onClick={onSearch}>
              Buscar
            </button>
            <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
