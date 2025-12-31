// Cliente API para comunicarse con el backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  // Construir URL con parámetros
  let url = `${API_URL}${endpoint}`;
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
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || `Error ${response.status}`);
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
      fetchApi<AvailabilitySlot[]>('/availability', {
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
