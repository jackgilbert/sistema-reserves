'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Booking } from '@/lib/api';
import { formatPrice, formatDate, formatTime } from '@/lib/utils';
import QRCode from 'qrcode';

export default function ConfirmPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBooking() {
      try {
        const data = await api.bookings.getByCode(params.code);
        setBooking(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Reserva no encontrada');
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [params.code]);

  useEffect(() => {
    let cancelled = false;

    async function generateQr() {
      if (!booking?.code) return;
      setQrError(null);

      try {
        // Encodamos SOLO el código para que el escáner admin lo pueda consumir directamente.
        const dataUrl = await QRCode.toDataURL(booking.code, {
          width: 192,
          margin: 1,
          errorCorrectionLevel: 'M',
        });

        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (e) {
        if (!cancelled) {
          setQrDataUrl(null);
          setQrError('No se pudo generar el código QR');
        }
      }
    }

    generateQr();

    return () => {
      cancelled = true;
    };
  }, [booking?.code]);

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
            href="/"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const isConfirmed = booking.status === 'CONFIRMED';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-6xl mb-4">
              {isConfirmed ? '✅' : '⏳'}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isConfirmed ? '¡Reserva confirmada!' : 'Reserva pendiente de confirmación'}
            </h1>
            <p className="text-gray-600">
              {isConfirmed
                ? 'Tu reserva ha sido confirmada correctamente'
                : 'Tu reserva está siendo procesada'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* QR Code */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-center">
            <div className="bg-white inline-block p-6 rounded-lg">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR de la reserva ${booking.code}`}
                  className="w-48 h-48 rounded"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-200 flex items-center justify-center rounded">
                  <div className="text-center px-4">
                    <div className="text-3xl mb-2">⚠️</div>
                    <div className="text-sm text-gray-600">
                      {qrError || 'Generando QR...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-white mt-4 font-medium">
              Muestra este código en la entrada
            </p>
          </div>

          {/* Detalles de la reserva */}
          <div className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Detalles de la reserva</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Código de reserva</p>
                  <p className="text-lg font-bold font-mono">{booking.code}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Estado</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    isConfirmed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusLabel(booking.status)}
                  </span>
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
                  <p className="text-sm text-gray-600 mb-1">Total pagado</p>
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

            {isConfirmed && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-blue-900 mb-1">Información importante</p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Guarda este código de reserva o haz una captura de pantalla</li>
                      <li>• Llegaremos enviado una copia a tu email: <strong>{booking.customerEmail}</strong></li>
                      <li>• Presenta el código QR en la entrada el día de tu visita</li>
                      <li>• Llega 10 minutos antes de tu horario reservado</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
              <Link
                href={`/manage/${booking.code}`}
                className="flex-1 text-center bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Gestionar reserva
              </Link>
              <Link
                href="/"
                className="flex-1 text-center bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Hacer otra reserva
              </Link>
            </div>
          </div>
        </div>

        {/* Botón para descargar/imprimir */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir reserva</span>
          </button>
        </div>
      </main>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    HOLD: 'Pendiente',
    PENDING_PAYMENT: 'Pendiente de pago',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
    REFUNDED: 'Reembolsada',
    USED: 'Utilizada',
  };
  return labels[status] || status;
}
