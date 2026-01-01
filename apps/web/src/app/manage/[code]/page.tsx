'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Booking } from '@/lib/api';
import { formatPrice, formatDate, formatTime } from '@/lib/utils';

export default function ManageBookingPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.bookings.getByCode(params.code);
      setBooking(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la reserva');
    } finally {
      setLoading(false);
    }
  }, [params.code]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleCancel = async () => {
    if (!booking) return;

    try {
      setCancelling(true);
      await api.bookings.cancel(booking.code);
      
      // Recargar la reserva actualizada
      await loadBooking();
      setShowCancelConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cancelar la reserva');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reserva...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reserva no encontrada</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/manage"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Buscar otra reserva
          </Link>
        </div>
      </div>
    );
  }

  const canBeCancelled = booking.status === 'CONFIRMED' || booking.status === 'HOLD';
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REFUNDED';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/manage"
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Buscar otra reserva
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de reserva: {booking.code}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Estado */}
          <div className={`p-6 text-center ${
            isCancelled ? 'bg-red-50' : 'bg-blue-50'
          }`}>
            <div className="text-5xl mb-3">
              {isCancelled ? '❌' : booking.status === 'USED' ? '✓' : '🎫'}
            </div>
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
              booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
              booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
              booking.status === 'REFUNDED' ? 'bg-purple-100 text-purple-800' :
              booking.status === 'USED' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {getStatusLabel(booking.status)}
            </span>
          </div>

          {/* Detalles */}
          <div className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Detalles de la reserva</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Código</p>
                  <p className="text-lg font-bold font-mono">{booking.code}</p>
                </div>

                {booking.offering && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Oferta</p>
                    <p className="font-medium">{booking.offering.name}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-1">Fecha y hora</p>
                  <p className="font-medium">{formatDate(booking.slotStart)}</p>
                  <p className="font-medium">{formatTime(booking.slotStart)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Cantidad</p>
                  <p className="font-medium">{booking.quantity} {booking.quantity === 1 ? 'entrada' : 'entradas'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatPrice(booking.totalAmount, booking.currency)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Cliente</p>
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-sm text-gray-600">{booking.customerEmail}</p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              {canBeCancelled && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Cancelar reserva
                </button>
              )}
              
              {booking.status === 'CONFIRMED' && (
                <Link
                  href={`/confirm/${booking.code}`}
                  className="flex-1 text-center bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Ver código QR
                </Link>
              )}

              {isCancelled && (
                <Link
                  href="/"
                  className="flex-1 text-center bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Hacer una nueva reserva
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de confirmación de cancelación */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ¿Cancelar reserva?
            </h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer. Se procesará el reembolso según nuestras políticas de cancelación.
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  setError(null);
                }}
                disabled={cancelling}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors font-medium"
              >
                No, mantener
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
              >
                {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    HOLD: 'Pendiente de pago',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
    REFUNDED: 'Reembolsada',
    USED: 'Utilizada',
  };
  return labels[status] || status;
}
