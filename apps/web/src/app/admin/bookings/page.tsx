'use client';

import { useEffect, useState } from 'react';

interface Booking {
  id: string;
  code: string;
  status: string;
  name: string;
  email: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    offering: {
      name: string;
    };
    slot: string;
    quantity: number;
  }>;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-domain': window.location.hostname,
        },
      });

      if (!response.ok) throw new Error('Error al cargar reservas');

      const data = await response.json();
      setBookings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      USED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      PENDING_PAYMENT: 'Pendiente Pago',
      CONFIRMED: 'Confirmada',
      USED: 'Utilizada',
      CANCELLED: 'Cancelada',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando reservas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Reservas</h1>
          <p className="mt-2 text-sm text-gray-700">
            Listado de todas las reservas realizadas
          </p>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Código
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Cliente
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Oferta
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Fecha/Hora
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Cantidad
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Total
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No hay reservas registradas
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          {booking.code}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div>{booking.name}</div>
                          <div className="text-xs text-gray-400">{booking.email}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {booking.items[0]?.offering.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {booking.items[0] && formatDate(booking.items[0].slot)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {booking.items[0]?.quantity}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatCurrency(booking.totalAmount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getStatusBadge(booking.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
