'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatPrice, formatTime } from '@/lib/utils';
import { api } from '@/lib/api';

type StoredHoldData = {
  hold: { id: string; slotStart: string; slotEnd: string; expiresAt?: string };
  offering: any;
  quantity: number;
  totalAmount?: number;
  ticketQuantities?: {
    standard?: number;
    variants?: Record<string, number>;
  };
  slotVariantKey?: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [holdData, setHoldData] = useState<StoredHoldData | null>(null);
  const [freshOffering, setFreshOffering] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentsProvider, setPaymentsProvider] = useState<
    'redsys' | 'stripe' | 'none' | null
  >(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });

  const [discountInput, setDiscountInput] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<
    { code: string; percentOff: number } | null
  >(null);

  useEffect(() => {
    const data = sessionStorage.getItem('currentHold');
    if (!data) {
      router.push('/');
      return;
    }

    try {
      const parsed = JSON.parse(data) as StoredHoldData;
      const holdId = parsed?.hold?.id;
      if (!holdId) {
        sessionStorage.removeItem('currentHold');
        router.push('/');
        return;
      }

      const expiresAt = parsed?.hold?.expiresAt;
      if (typeof expiresAt === 'string' && expiresAt) {
        const exp = new Date(expiresAt);
        if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
          sessionStorage.removeItem('currentHold');
          const offeringId = parsed?.offering?.id;
          router.push(offeringId ? `/o/${offeringId}` : '/');
          return;
        }
      }

      setHoldData(parsed);
    } catch {
      sessionStorage.removeItem('currentHold');
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (!holdData?.offering?.id) return;
    let cancelled = false;

    api.offerings
      .getById(String(holdData.offering.id))
      .then((o) => {
        if (cancelled) return;
        setFreshOffering(o);
      })
      .catch(() => {
        // Silencioso: si falla, seguimos con el offering del storage.
      });

    return () => {
      cancelled = true;
    };
  }, [holdData?.offering?.id]);

  useEffect(() => {
    let cancelled = false;

    api.settings
      .getPublic()
      .then((settings) => {
        if (cancelled) return;
        const provider = settings?.features?.paymentsProvider;
        if (provider === 'redsys' || provider === 'stripe' || provider === 'none') {
          setPaymentsProvider(provider);
        }
      })
      .catch(() => {
        // Silencioso: solo es un hint visual.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!holdData) return;

    setLoading(true);
    setError(null);

    try {
      const holdId = holdData.hold?.id;
      if (!holdId) {
        throw new Error('Hold inválido o expirado. Vuelve a seleccionar un horario.');
      }

      const expiresAt = holdData?.hold?.expiresAt;
      if (typeof expiresAt === 'string' && expiresAt) {
        const exp = new Date(expiresAt);
        if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
          sessionStorage.removeItem('currentHold');
          throw new Error('Hold expirado. Vuelve a seleccionar un horario.');
        }
      }

      const response = await api.payments.checkout({
        holdId,
        email: formData.customerEmail,
        name: formData.customerName,
        phone: formData.customerPhone || undefined,
        discountCode: appliedDiscount?.code || undefined,
      });

      sessionStorage.removeItem('currentHold');

      if (response.provider === 'none') {
        router.push(`/confirm/${response.bookingCode}`);
        return;
      }

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  if (!holdData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const { hold, offering: storedOffering, quantity, totalAmount: storedTotalAmount, ticketQuantities } = holdData;
  const offering = freshOffering || storedOffering;
  const totalAmount =
    typeof storedTotalAmount === 'number'
      ? storedTotalAmount
      : (offering?.basePrice ?? 0) * quantity;

  const discountPercent = appliedDiscount ? Math.max(0, Math.min(100, Math.floor(appliedDiscount.percentOff))) : 0;
  const discountedTotal = appliedDiscount
    ? Math.max(0, Math.round((totalAmount * (100 - discountPercent)) / 100))
    : totalAmount;

  const slotVariantKey = (holdData.slotVariantKey || '').trim();
  const slotVariantLabel = (() => {
    if (!slotVariantKey) return undefined;
    const variants = offering?.metadata?.slotVariants;
    if (!Array.isArray(variants)) return slotVariantKey;
    const match = variants.find(
      (v: any) => v && typeof v.key === 'string' && v.key === slotVariantKey,
    );
    const label = match && typeof match.label === 'string' ? match.label.trim() : '';
    return label || slotVariantKey;
  })();

  const submitLabel = (() => {
    if (paymentsProvider === 'redsys') return 'Proceder al pago';
    if (paymentsProvider === 'none') return 'Confirmar reserva';
    if (paymentsProvider === 'stripe') return 'Proceder al pago';
    return 'Continuar';
  })();

  const expiryNotice = (() => {
    if (paymentsProvider === 'none') {
      return (
        <>
          ⏱️ Tu reserva expira en <strong>10 minutos</strong>. Confirma para finalizarla.
        </>
      );
    }

    return (
      <>
        ⏱️ Tu reserva expira en <strong>10 minutos</strong>. Completa el pago para confirmarla.
      </>
    );
  })();

  const applyDiscount = async () => {
    setDiscountError(null);
    const code = discountInput.trim();
    if (!code) {
      setAppliedDiscount(null);
      return;
    }

    try {
      const res = await api.discounts.validate({
        code,
        offeringId: offering?.id ? String(offering.id) : undefined,
      });
      setAppliedDiscount({ code: res.code, percentOff: res.percentOff });
    } catch (e) {
      setAppliedDiscount(null);
      setDiscountError(e instanceof Error ? e.message : 'Código no válido');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Finalizar reserva</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Datos del cliente</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre completo
                    </label>
                    <input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono (opcional)
                    </label>
                    <input
                      id="customerPhone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Descuento</h2>
                <div className="flex gap-2">
                  <input
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Código de descuento"
                  />
                  <button
                    type="button"
                    onClick={applyDiscount}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                  >
                    Aplicar
                  </button>
                </div>

                {discountError && (
                  <p className="text-sm text-red-700 mt-2">{discountError}</p>
                )}
                {appliedDiscount && (
                  <p className="text-sm text-green-700 mt-2">
                    Código aplicado: <strong>{appliedDiscount.code}</strong> ({appliedDiscount.percentOff}%
                    )
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  {expiryNotice}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                {loading ? 'Procesando...' : submitLabel}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Al continuar, aceptas nuestros términos y condiciones
              </p>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Resumen de compra</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Oferta</p>
                  <p className="font-semibold">{offering?.name}</p>

                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {ticketQuantities && (
                      <>
                        {(ticketQuantities.standard || 0) > 0 && (
                          <div className="flex justify-between">
                            <span>Estándar x{ticketQuantities.standard}</span>
                            <span>
                              {formatPrice(
                                (offering?.basePrice ?? 0) * (ticketQuantities.standard || 0),
                                offering?.currency,
                              )}
                            </span>
                          </div>
                        )}

                        {Object.entries((ticketQuantities.variants || {}) as Record<string, number>)
                          .filter(([, q]) => (q || 0) > 0)
                          .map(([name, q]) => {
                            const variant = (offering?.priceVariants || []).find(
                              (v: any) => v.name === name,
                            );
                            const unit = variant?.price ?? 0;
                            return (
                              <div key={name} className="flex justify-between">
                                <span>
                                  {name} x{q}
                                </span>
                                <span>{formatPrice(unit * q, offering?.currency)}</span>
                              </div>
                            );
                          })}
                      </>
                    )}

                    {!ticketQuantities && (
                      <div className="flex justify-between">
                        <span>Entradas x{quantity}</span>
                        <span>{formatPrice(totalAmount, offering?.currency)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Fecha y hora</p>
                  <p className="font-medium">{formatDate(hold.slotStart)}</p>
                  <p className="font-medium">{formatTime(hold.slotStart)}</p>
                </div>

                {slotVariantLabel && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Idioma</p>
                    <p className="font-medium">{slotVariantLabel}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-1">Cantidad</p>
                  <p className="font-medium">{quantity} {quantity === 1 ? 'entrada' : 'entradas'}</p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatPrice(totalAmount, offering?.currency)}</span>
                  </div>

                  {appliedDiscount && (
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Descuento ({discountPercent}%)</span>
                      <span className="font-medium">-{formatPrice(totalAmount - discountedTotal, offering?.currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">{formatPrice(discountedTotal, offering?.currency)}</span>
                  </div>
                </div>

                {paymentsProvider === 'redsys' && (
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Pago seguro con Redsys</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
