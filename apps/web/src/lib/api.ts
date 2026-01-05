// Cliente API para comunicarse con el backend

// Para server-side (SSR), siempre usar localhost
// Para client-side, usar la URL pública o localhost
function getApiUrl(): string {
  // Si estamos en el servidor (Node.js)
  if (typeof window === 'undefined') {
    return process.env.API_URL || 'http://localhost:3001';
  }

  // Si estamos en el cliente (browser)
  // En el navegador, preferimos usar un proxy same-origin (/api/...)
  // para no depender de que el puerto 3001 sea público (Codespaces/port-forwarding)
  // y para evitar problemas de mixed content.
  return '';
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  const API_URL = getApiUrl();

  // En cliente, enrutar via proxy Next: /api/<endpoint>
  const isBrowser = typeof window !== 'undefined';
  const proxiedEndpoint = isBrowser && !endpoint.startsWith('/api')
    ? `/api${endpoint}`
    : endpoint;
  
  // Construir URL con parámetros
  let url = `${API_URL}${proxiedEndpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // Obtener el dominio actual para el header de tenant
  const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';


  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-domain': domain,
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    console.error(`[API] Error ${response.status} from ${url}`);
    const contentType = response.headers.get('content-type');
    
    // Si la respuesta no es JSON (por ejemplo, HTML de error), loguear el contenido
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`[API] Response is not JSON. Content-Type: ${contentType}`);
      console.error(`[API] Response body (first 500 chars):`, text.substring(0, 500));
      throw new Error(`API returned ${response.status}: Expected JSON but got ${contentType || 'unknown type'}`);
    }
    
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    console.error(`[API] Error details:`, error);
    throw new Error(error.message || `Error ${response.status}`);
  }

  // Verificar que la respuesta exitosa también sea JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`[API] Success response is not JSON. Content-Type: ${contentType}`);
    console.error(`[API] Response body (first 500 chars):`, text.substring(0, 500));
    throw new Error(`API returned HTML instead of JSON. The API might not be running or the URL might be incorrect.`);
  }

  return response.json();
}

// Helpers específicos
export const api = {
  offerings: {
    list: () => fetchApi<Offering[]>('/offerings'),
    getById: (id: string) => fetchApi<Offering>(`/offerings/public/${id}`),
  },
  
  availability: {
    get: (offeringId: string, startDate: string, endDate: string) =>
      fetchApi<Record<string, AvailabilitySlot[]>>('/availability', {
        params: { offeringId, startDate, endDate },
      }),
  },

  holds: {
    create: (data: CreateHoldData) =>
      fetchApi<Hold>('/holds', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  bookings: {
    getByCode: (code: string) => fetchApi<Booking>(`/bookings/public/${code}`),
    cancel: (code: string) =>
      fetchApi<Booking>(`/bookings/public/${code}/cancel`, {
        method: 'POST',
      }),
  },
};

// Tipos
export interface Offering {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: 'CAPACITY' | 'RESOURCE' | 'APPOINTMENT' | 'SEATS';
  basePrice: number;
  currency: string;
  active: boolean;
  images: string[];
  metadata: Record<string, any>;
  schedule?: Schedule;
}

export interface Schedule {
  id: string;
  offeringId: string;
  openingHours: any;
  slotDuration: number;
  minAdvanceBooking: number;
  maxAdvanceBooking: number;
  cutoffTime: number;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: number;
  total: number;
}

export interface CreateHoldData {
  offeringId: string;
  slotStart: string;
  slotEnd: string;
  quantity: number;
}

export interface Hold {
  id: string;
  offeringId: string;
  slotStart: string;
  slotEnd: string;
  quantity: number;
  expiresAt: string;
}

export interface Booking {
  id: string;
  code: string;
  offeringId: string;
  slotStart: string;
  slotEnd: string;
  quantity: number;
  status: string;
  totalAmount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  qrCode?: string;
  offering?: Offering;
}
