import { useState, useEffect } from 'react'
import type { ProductResult } from './api'
import ProductWizard from './ProductWizard'
import { useLists } from './hooks/useLists'
import { useComparison } from './hooks/useComparison'
import { useCredentials } from './hooks/useCredentials'
import { Sidebar } from './components/Sidebar'
import { ListEditor } from './components/ListEditor'
import { ComparisonTable } from './components/ComparisonTable'
import { QueryEditor } from './components/QueryEditor'
import { getWhatsAppLink } from './utils'
import './App.css'

function App() {
  const {
    lists, activeListId, setActiveListId, activeList,
    createList, deleteList, renameList,
    addItem, removeItem, updateQuantity, updateItemQuery,
  } = useLists()

  const {
    selectedStores, setSelectedStores,
    results,
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
  } = useComparison()

  const { credentials, setCredentials, showCreds, setShowCreds } = useCredentials()

  const [wizardQuery, setWizardQuery] = useState<string | null>(null)

  useEffect(() => {
    localStorage.removeItem('sl_creds')
  }, [])

  const handleOpenWizard = (query: string) => {
    setWizardQuery(query)
  }

  const handleWizardConfirm = (product: ProductResult) => {
    addItem({ query: product.name, quantity: 1, selectedProduct: product })
    setWizardQuery(null)
  }

  const handleStartComparison = () => {
    calculateComparison(activeList.items)
  }

  const handleRefreshStore = (store: string) => {
    refreshStore(store, activeList.items)
  }

  const handleCartClick = (store: string) => {
    handleAddToCart(store, activeList.items, credentials)
  }

  const handleQuerySearch = () => {
    if (editCell && editQueryInput) {
      setEditCell({ ...editCell, query: editQueryInput })
      setEditQueryInput(null)
    }
  }

  const toggleStore = (store: string) => {
    setSelectedStores(
      selectedStores.includes(store)
        ? selectedStores.filter(x => x !== store)
        : [...selectedStores, store]
    )
  }

  const handleEditCell = (query: string, store: string) => {
    setEditCell({ query, store })
    setEditQueryInput(query)
    setEditOriginalQuery(query)
  }

  return (
    <div className="container">
      <header className="header">
        <h1>SuperLista 🚀</h1>
        <p>Gestiona tus compras y ahorra en segundos</p>
      </header>

      <div className="main-layout">
        <aside>
          <Sidebar
            lists={lists}
            activeListId={activeListId}
            onSelectList={setActiveListId}
            onCreateList={createList}
            onDeleteList={deleteList}
            onRenameList={renameList}
          />
        </aside>

        <main>
          <ListEditor
            activeList={activeList}
            selectedStores={selectedStores}
            onToggleStore={toggleStore}
            credentials={credentials}
            showCreds={showCreds}
            onUpdateCredentials={setCredentials}
            onToggleCreds={() => setShowCreds(!showCreds)}
            onOpenWizard={handleOpenWizard}
            onRemoveItem={removeItem}
            onUpdateQuantity={updateQuantity}
            onUpdateItemQuery={updateItemQuery}
            onStartComparison={handleStartComparison}
            loading={loading}
            error={error}
          />

          <ComparisonTable
            items={activeList.items}
            selectedStores={selectedStores}
            results={results}
            alternatives={alternatives}
            overrides={overrides}
            loading={loading}
            onRefreshStore={handleRefreshStore}
            onEditCell={handleEditCell}
            onExcludeCell={handleExcludeCell}
            onAddToCart={handleCartClick}
            getWhatsAppLinkFn={(store) => getWhatsAppLink(store, activeList.items, results, overrides)}
          />
        </main>
      </div>

      {wizardQuery && (
        <ProductWizard
          query={wizardQuery}
          stores={selectedStores}
          onConfirm={handleWizardConfirm}
          onCancel={() => setWizardQuery(null)}
        />
      )}

      {editCell && editQueryInput !== null && (
        <QueryEditor
          editQueryInput={editQueryInput}
          onChange={setEditQueryInput}
          onSearch={handleQuerySearch}
          onCancel={() => { setEditCell(null); setEditQueryInput(null); setEditOriginalQuery(null) }}
          storeName={editCell.store}
        />
      )}

      {editCell && editQueryInput === null && editOriginalQuery !== null && (
        <ProductWizard
          key={`${editCell.query}-${editCell.store}-${Date.now()}`}
          query={editCell.query}
          stores={[editCell.store]}
          onConfirm={(product) => handleCellOverride(editOriginalQuery, editCell.store, product)}
          onCancel={() => { setEditCell(null); setEditOriginalQuery(null) }}
        />
      )}
    </div>
  )
}

export default App
