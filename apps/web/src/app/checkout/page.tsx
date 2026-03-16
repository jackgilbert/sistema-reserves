'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice, formatDate, formatTime } from '@/lib/utils';
import { useLocale } from '@/components/LocaleProvider';
import { api } from '@/lib/api';

type AppliedDiscount = {
  id: string;
  code: string;
  percentOff: number;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [holdData, setHoldData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });

  // Cargar datos del hold desde sessionStorage
  useEffect(() => {
    const data = sessionStorage.getItem('currentHold');
    if (!data) {
      router.push('/');
      return;
    }
    setHoldData(JSON.parse(data));
  }, [router]);

  useEffect(() => {
    if (!holdData?.hold?.expiresAt) {
      setRemainingMs(null);
      return;
    }

    const expiresAt = new Date(holdData.hold.expiresAt).getTime();
    const tick = () => {
      const next = expiresAt - Date.now();
      setRemainingMs(next > 0 ? next : 0);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [holdData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!holdData) return;

    if (remainingMs !== null && remainingMs <= 0) {
      setError('El hold ha expirado. Vuelve a seleccionar un horario.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const holdId = holdData.hold?.id;
      if (!holdId) {
        throw new Error('Hold inválido o expirado. Vuelve a seleccionar un horario.');
      }

      const response = await api.payments.checkout({
        holdId: holdData.hold.id,
        email: formData.customerEmail,
        name: formData.customerName,
        phone: formData.customerPhone || undefined,
        discountCode: appliedDiscount?.code,
      });

      // Limpiar hold local (evita reintentos accidentales si el usuario vuelve atrás)
      sessionStorage.removeItem('currentHold');

      if (response.provider === 'none') {
        router.push(`/confirm/${response.bookingCode}`);
        return;
      }

      // Redsys: construir un form POST y auto-enviarlo.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = response.actionUrl;

      for (const [key, value] of Object.entries(response.fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago');
      setLoading(false);
    }
  };

  if (!holdData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const { hold, offering, quantity, totalAmount: storedTotalAmount, ticketQuantities } = holdData;
  const subtotalAmount = typeof storedTotalAmount === 'number'
    ? storedTotalAmount
    : offering.basePrice * quantity;
  const discountAmount = appliedDiscount
    ? Math.min(subtotalAmount, Math.round((subtotalAmount * appliedDiscount.percentOff) / 100))
    : 0;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);
  const holdExpired = remainingMs !== null && remainingMs <= 0;
  const countdown = remainingMs === null
    ? null
    : `${String(Math.floor(remainingMs / 60000)).padStart(2, '0')}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0')}`;

  const handleApplyDiscount = async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      setDiscountError('Introduce un código de descuento');
      return;
    }

    setDiscountLoading(true);
    setDiscountError(null);

    try {
      const result = await api.discounts.validate({
        code,
        offeringId: offering.id,
      });
      setAppliedDiscount(result);
      setDiscountCode(result.code);
    } catch (err: any) {
      setAppliedDiscount(null);
      setDiscountError(err?.message || 'No se pudo validar el código');
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError(null);
    setDiscountCode('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Finalizar reserva</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Datos del cliente</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      id="customerName"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Juan Pérez"
                    />
                  </div>

                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="customerEmail"
                      required
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="juan@ejemplo.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recibirás la confirmación de tu reserva en este email
                    </p>
                  </div>

                  <div>
                    <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono (opcional)
                    </label>
                    <input
                      type="tel"
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-gray-900">Código promocional</h3>
                    <p className="text-sm text-gray-500">Aplica un descuento antes de pagar.</p>
                  </div>
                  {appliedDiscount && (
                    <button
                      type="button"
                      onClick={handleRemoveDiscount}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase());
                      setDiscountError(null);
                    }}
                    placeholder="PROMO2026"
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2"
                    disabled={discountLoading || !!appliedDiscount}
                  />
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={discountLoading || !!appliedDiscount}
                    className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {discountLoading ? 'Validando...' : 'Aplicar'}
                  </button>
                </div>

                {discountError && <p className="text-sm text-red-700">{discountError}</p>}
                {appliedDiscount && (
                  <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                    Código <strong>{appliedDiscount.code}</strong> aplicado: {appliedDiscount.percentOff}% de descuento.
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⏱️ Tu reserva expira en <strong>{countdown || '00:00'}</strong>.
                  {holdExpired
                    ? ' El hold ya no es válido. Debes volver a seleccionar un horario.'
                    : ' Completa el pago para confirmarla.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || holdExpired}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                {holdExpired ? 'Hold expirado' : loading ? 'Procesando...' : 'Proceder al pago'}
              </button>

              {holdExpired && (
                <button
                  type="button"
                  onClick={() => router.push(`/o/${offering.id}`)}
                  className="w-full rounded-lg border border-gray-300 py-3 px-4 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Elegir otro horario
                </button>
              )}

              <p className="text-xs text-gray-500 text-center">
                Al continuar, aceptas nuestros términos y condiciones
              </p>
            </form>
          </div>

          {/* Resumen */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Resumen de compra</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Oferta</p>
                  <p className="font-semibold">{offering.name}</p>
                  {ticketQuantities && (
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      {(ticketQuantities.standard || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Estándar x{ticketQuantities.standard}</span>
                          <span>
                            {formatPrice(
                              offering.basePrice * ticketQuantities.standard,
                              offering.currency,
                              locale,
                            )}
                          </span>
                        </div>
                      )}
                      {Object.entries((ticketQuantities.variants || {}) as Record<string, number>)
                        .filter(([, q]) => (q || 0) > 0)
                        .map(([name, q]) => {
                          const variant = (offering.priceVariants || []).find((v: any) => v.name === name);
                          const unit = variant?.price ?? 0;
                          return (
                            <div key={name} className="flex justify-between">
                              <span>{name} x{q}</span>
                              <span>{formatPrice(unit * q, offering.currency, locale)}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Fecha y hora</p>
                  <p className="font-medium">{formatDate(hold.slotStart, undefined, locale)}</p>
                  <p className="font-medium">{formatTime(hold.slotStart, locale)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Cantidad</p>
                  <p className="font-medium">{quantity} {quantity === 1 ? 'entrada' : 'entradas'}</p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {formatPrice(subtotalAmount, offering.currency, locale)}
                    </span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between mb-2 text-green-700">
                      <span>Descuento {appliedDiscount.code}</span>
                      <span>-{formatPrice(discountAmount, offering.currency, locale)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">
                      {formatPrice(totalAmount, offering.currency, locale)}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Pago seguro con Redsys</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
