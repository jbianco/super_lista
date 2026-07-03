import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export interface ProductResult {
  name: string;
  price: number;
  unit: string;
  brand: string;
  store: string;
  url?: string;
  details?: string;
  image_url?: string;
  last_updated?: string;
  price_change_pct?: number | null;
}

export interface BudgetItem {
  query: string;
  product?: ProductResult;
  alternatives?: ProductResult[];
}

export interface StoreBudget {
  items: BudgetItem[];
  total: number;
  whatsapp_message: string;
}

export interface BudgetResponse {
  budgets: Record<string, StoreBudget>;
}

export async function fetchBudget(
  items: string[],
  stores?: string[],
): Promise<BudgetResponse> {
  const { data } = await api.post<BudgetResponse>('/budget', {
    items,
    stores: stores?.length ? stores : undefined,
  });
  return data;
}

export interface BrandOption {
  name: string;
  common_count: number;
  total_stores: number;
  products: ProductResult[];
}

export interface CharacteristicOption {
  unit: string;
  brands: BrandOption[];
}

export interface ProductOptionsResponse {
  characteristics: CharacteristicOption[];
  cheapest: ProductResult | null;
}

export async function fetchProductOptions(
  query: string,
  stores?: string[],
): Promise<ProductOptionsResponse> {
  const { data } = await api.post<ProductOptionsResponse>('/product-options', {
    query,
    stores: stores?.length ? stores : undefined,
  });
  return data;
}

export interface CartItem {
  query: string;
  quantity: number;
  name?: string;
}

export interface CartItemResult {
  query: string;
  status: string;
  error?: string;
}

export interface CartResponse {
  success: boolean;
  results: CartItemResult[];
}

export interface PriceHistoryEntry {
  store: string;
  query: string;
  product_name: string;
  price: number;
  unit: string;
  brand: string;
  recorded_at: string;
}

export async function fetchPriceHistory(
  store: string,
  query?: string,
  product_name?: string,
  limit: number = 30,
): Promise<PriceHistoryEntry[]> {
  const params: Record<string, string | number> = { store, limit };
  if (query) params.query = query;
  if (product_name) params.product_name = product_name;
  const { data } = await api.get<PriceHistoryEntry[]>('/price-history', { params });
  return data;
}

export async function addToCart(
  storeName: string,
  credentials: { email?: string; password?: string; auth_method?: string; token?: string },
  items: CartItem[],
): Promise<CartResponse> {
  const { data } = await api.post<CartResponse>('/cart', {
    store_name: storeName,
    credentials,
    items,
  });
  return data;
}
