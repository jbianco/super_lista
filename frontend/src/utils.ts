import type { StoreConfig, ShoppingItem, OverridesMap, ResultsMap } from './types'

export const ALL_STORES = ["Carrefour", "Changomas", "Disco", "Jumbo", "MercadoLibre"]

export const STORE_CONFIGS: Record<string, StoreConfig> = {
  Carrefour: {
    auth: {
      methods: [
        { id: 'password', label: 'Email + Contraseña', fields: [{ key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' }, { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' }] },
        { id: 'google', label: 'Google', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
        { id: 'facebook', label: 'Facebook', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
      ],
    },
  },
  Changomas: {
    auth: {
      methods: [
        { id: 'password', label: 'Email + Contraseña', fields: [{ key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' }, { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' }] },
        { id: 'google', label: 'Google', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
        { id: 'facebook', label: 'Facebook', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
      ],
    },
  },
  Disco: {
    auth: {
      methods: [
        { id: 'password', label: 'Email + Contraseña', fields: [{ key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' }, { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' }] },
        { id: 'google', label: 'Google', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
        { id: 'facebook', label: 'Facebook', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
      ],
    },
  },
  Jumbo: {
    auth: {
      methods: [
        { id: 'password', label: 'Email + Contraseña', fields: [{ key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' }, { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' }] },
        { id: 'google', label: 'Google', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
        { id: 'facebook', label: 'Facebook', fields: [{ key: 'token', label: 'Token de acceso', type: 'text', placeholder: 'pegar token aquí' }] },
      ],
    },
  },
  MercadoLibre: {
    auth: {
      methods: [
        { id: 'password', label: 'Email + Contraseña', fields: [{ key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' }, { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' }] },
      ],
    },
  },
}

export const STORE_CART_URLS: Record<string, string> = {
  Carrefour: "https://www.carrefour.com.ar/checkout/#/cart",
  Changomas: "https://www.masonline.com.ar/checkout/#/cart",
  Disco: "https://www.disco.com.ar/checkout/#/cart",
  Jumbo: "https://www.jumbo.com.ar/checkout/#/cart",
  MercadoLibre: "https://www.mercadolibre.com.ar/cart",
}

export function ageClass(lastUpdated?: string): string {
  if (!lastUpdated) return ''
  const now = Date.now()
  const updated = new Date(lastUpdated).getTime()
  const days = (now - updated) / (1000 * 60 * 60 * 24)
  if (days >= 7) return 'age-stale'
  if (days >= 3) return 'age-aging'
  if (days >= 1) return 'age-day'
  return ''
}

export function calculateTotal(
  store: string,
  items: ShoppingItem[],
  results: ResultsMap,
  overrides: OverridesMap,
): number {
  return items.reduce((acc, it) => {
    const cellOverrides = overrides[it.query]?.[store]
    if (cellOverrides?.excluded) return acc
    if (cellOverrides?.overrideProduct) return acc + cellOverrides.overrideProduct.price * it.quantity
    return acc + ((results[it.query]?.[store]?.price || 0) * it.quantity)
  }, 0)
}

export function getWhatsAppLink(
  store: string,
  items: ShoppingItem[],
  results: ResultsMap,
  overrides: OverridesMap,
): string {
  let text = `*🛒 SuperLista: ${store}*\n\n`
  items.forEach(it => {
    const cellOverrides = overrides[it.query]?.[store]
    if (cellOverrides?.excluded) return
    const p = cellOverrides?.overrideProduct || results[it.query]?.[store]
    if (p) text += `• ${it.quantity}x ${p.name}: *$${p.price * it.quantity}*\n`
  })
  text += `\n💰 *TOTAL: $${calculateTotal(store, items, results, overrides)}*`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
