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
  last_updated?: string;
}

export interface BudgetItem {
  query: string;
  product: ProductResult;
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

export async function addToCart(
  storeName: string,
  credentials: { email?: string; password?: string; auth_method?: string; token?: string },
  items: string[],
): Promise<{ success: boolean }> {
  const { data } = await api.post<{ success: boolean }>('/cart', {
    store_name: storeName,
    credentials,
    items,
  });
  return data;
}
