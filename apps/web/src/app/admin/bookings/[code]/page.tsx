'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

type BookingItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type BookingDetail = {
  id: string;
  code: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  totalAmount: number;
  currency: string;
  quantity: number;
  slotStart: string;
  slotEnd: string;
  createdAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  offering?: {
    id: string;
    name: string;
    type?: string;
  };
  items?: BookingItem[];
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amount / 100);
}

function getStatusStyles(status: string) {
  const map: Record<string, string> = {
    HOLD: 'bg-yellow-100 text-yellow-800',
    PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    USED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-purple-100 text-purple-800',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export default function AdminBookingDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params?.code;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-domain': window.location.hostname,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const loadBooking = useCallback(async () => {
    if (!code) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/bookings/code/${code}`, {
        headers: authHeaders,
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || 'No se pudo cargar la reserva');
      }

      const data = (await res.json()) as BookingDetail;
      setBooking(data);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar la reserva');
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, code, router]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const handleCancel = async () => {
    if (!booking) return;

    const confirmed = window.confirm(`¿Cancelar la reserva ${booking.code}?`);
    if (!confirmed) return;

    setCancelling(true);
    setError('');

    try {
      const res = await fetch(`/api/bookings/code/${booking.code}/cancel`, {
        method: 'PATCH',
        headers: authHeaders,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || 'No se pudo cancelar la reserva');
      }

      await loadBooking();
    } catch (err: any) {
      setError(err?.message || 'No se pudo cancelar la reserva');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-lg text-gray-600">Cargando reserva...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h1 className="text-lg font-semibold">Reserva no disponible</h1>
          <p className="mt-2">{error || 'No se pudo encontrar la reserva solicitada.'}</p>
          <Link
            href="/admin/bookings"
            className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-300"
          >
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  const cancellable = booking.status === 'CONFIRMED' || booking.status === 'HOLD';

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-800">
            ← Volver a reservas
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            Reserva {booking.code}
          </h1>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/manage/${booking.code}`}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
          >
            Vista cliente
          </Link>
          {cancellable && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelling ? 'Cancelando...' : 'Cancelar reserva'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusStyles(booking.status)}`}>
            {booking.status}
          </span>
          <span className="text-sm text-gray-500">
            Creada {formatDateTime(booking.createdAt)}
          </span>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Detail label="Cliente" value={booking.customerName} extra={booking.customerEmail} />
          <Detail label="Teléfono" value={booking.customerPhone || '-'} />
          <Detail label="Oferta" value={booking.offering?.name || '-'} />
          <Detail label="Inicio" value={formatDateTime(booking.slotStart)} />
          <Detail label="Fin" value={formatDateTime(booking.slotEnd)} />
          <Detail label="Cantidad" value={String(booking.quantity)} />
          <Detail label="Total" value={formatMoney(booking.totalAmount, booking.currency)} />
          <Detail label="Confirmada" value={formatDateTime(booking.confirmedAt)} />
          <Detail label="Cancelada" value={formatDateTime(booking.cancelledAt)} />
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Líneas de reserva</h2>
        {booking.items && booking.items.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Descripción</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cantidad</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unitario</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {booking.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatMoney(item.unitPrice, booking.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatMoney(item.totalPrice, booking.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No hay líneas detalladas para esta reserva.</p>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-medium text-gray-900">{value}</p>
      {extra && <p className="mt-1 text-sm text-gray-600">{extra}</p>}
    </div>
  );
}