'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice, formatDate, formatTime } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const [holdData, setHoldData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!holdData) return;

    setLoading(true);
    setError(null);

    try {
      // Aquí iría la integración con Redsys o Stripe
      // Por ahora, simulamos el proceso de pago
      
      // En producción, aquí se crearía el checkout session con Redsys
      // y se redirigiría al usuario a la pasarela de pago
      
      // Simulación: esperar 2 segundos y "confirmar"
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generar código de reserva simulado
      const bookingCode = `RES-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      // Limpiar sessionStorage
      sessionStorage.removeItem('currentHold');
      
      // Redirigir a página de confirmación
      router.push(`/confirm/${bookingCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el pago');
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

  const { hold, offering, quantity } = holdData;
  const totalAmount = offering.basePrice * quantity;

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

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⏱️ Tu reserva expira en <strong>10 minutos</strong>. Completa el pago para confirmarla.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                {loading ? 'Procesando...' : 'Proceder al pago'}
              </button>

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
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Fecha y hora</p>
                  <p className="font-medium">{formatDate(hold.slotStart)}</p>
                  <p className="font-medium">{formatTime(hold.slotStart)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Cantidad</p>
                  <p className="font-medium">{quantity} {quantity === 1 ? 'entrada' : 'entradas'}</p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {formatPrice(totalAmount, offering.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">
                      {formatPrice(totalAmount, offering.currency)}
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
