'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, Offering, AvailabilitySlot } from '@/lib/api';
import { formatPrice, formatDate, formatTime, addDays, toISODate } from '@/lib/utils';

export default function OfferingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [offering, setOffering] = useState<Offering | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [slotVariantKey, setSlotVariantKey] = useState<string>('');
  const [standardQty, setStandardQty] = useState(0);
  const [variantQty, setVariantQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotVariants = Array.isArray(offering?.metadata?.slotVariants)
    ? (offering?.metadata?.slotVariants as Array<{ key: string; label?: string }>).filter(
        (v) => v && typeof v.key === 'string' && v.key.trim().length > 0,
      )
    : [];

  const variants = offering?.priceVariants ?? [];
  const normalizeVariantName = (name: string) => name.trim().toLowerCase();
  const adultVariantName = variants.find((v) => {
    const n = normalizeVariantName(v.name);
    return n === 'adult' || n === 'adulto';
  })?.name;
  const includeStandard = !adultVariantName;
  const effectiveStandardQty = includeStandard ? standardQty : 0;
  const available = selectedSlot ? selectedSlot.available : 0;
  const totalSelected =
    effectiveStandardQty +
    Object.values(variantQty).reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);

  const totalAmount =
    (offering?.basePrice ?? 0) * effectiveStandardQty +
    variants.reduce((acc, v) => acc + v.price * (variantQty[v.name] || 0), 0);

  const clampChange = (current: number, next: number, otherSum: number) => {
    const maxForThis = Math.max(0, available - otherSum);
    return Math.max(0, Math.min(next, maxForThis));
  };

  // Cargar oferta
  useEffect(() => {
    async function loadOffering() {
      try {
        const data = await api.offerings.getById(params.id);
        setOffering(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar la oferta');
      } finally {
        setLoading(false);
      }
    }
    loadOffering();
  }, [params.id]);

  // Reset cantidades al cambiar de oferta
  useEffect(() => {
    if (!offering) return;
    setVariantQty({});
    const nextAdultVariantName = Array.isArray(offering.priceVariants)
      ? (offering.priceVariants as Array<{ name: string; price: number }>).find((v) => {
          const n = typeof v?.name === 'string' ? normalizeVariantName(v.name) : '';
          return n === 'adult' || n === 'adulto';
        })?.name
      : undefined;
    setStandardQty(nextAdultVariantName ? 0 : 1);

    const initialVariantKey = slotVariants.length > 0 ? slotVariants[0].key : '';
    setSlotVariantKey(initialVariantKey);
    setSelectedSlot(null);
  }, [offering?.id]);

  // Reset selección al cambiar idioma
  useEffect(() => {
    setSelectedSlot(null);
    setVariantQty({});
    setStandardQty(includeStandard ? 1 : 0);
  }, [slotVariantKey]);

  // Cargar disponibilidad cuando cambia la fecha
  useEffect(() => {
    if (!offering) return;
    if (slotVariants.length > 0 && !slotVariantKey) return;

    async function loadAvailability() {
      setLoadingSlots(true);
      try {
        const startDate = toISODate(selectedDate);
        const endDate = toISODate(addDays(selectedDate, 1));
        const data = await api.availability.get(params.id, startDate, endDate, slotVariantKey);
        
        // El API retorna un objeto con fechas como keys: { "2025-01-01": [...slots] }
        // Extraer los slots del primer día
        const dateKey = Object.keys(data)[0];
        const daySlots = dateKey ? data[dateKey] : [];
        setSlots(Array.isArray(daySlots) ? daySlots : []);
      } catch (e) {
        console.error('Error al cargar disponibilidad:', e);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadAvailability();
  }, [offering, selectedDate, params.id, slotVariantKey, slotVariants.length]);

  const handleReserve = async () => {
    if (!selectedSlot || !offering) return;

    if (slotVariants.length > 0 && !slotVariantKey) {
      setError('Selecciona un idioma');
      return;
    }

    if (totalSelected < 1) {
      setError('Selecciona al menos 1 entrada');
      return;
    }

    try {
      setLoading(true);
      const hold = await api.holds.create({
        offeringId: offering.id,
        slotStart: selectedSlot.start,
        slotEnd: selectedSlot.end,
        quantity: totalSelected,
        slotVariantKey: slotVariantKey || undefined,
        ticketQuantities: {
          standard: effectiveStandardQty,
          variants: variantQty,
        },
      });

      // Guardar en sessionStorage y redirigir a checkout
      sessionStorage.setItem('currentHold', JSON.stringify({
        hold,
        offering,
        quantity: totalSelected,
        slotVariantKey,
        ticketQuantities: {
          standard: effectiveStandardQty,
          variants: variantQty,
        },
        totalAmount,
      }));
      
      router.push('/checkout');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la reserva');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !offering) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Oferta no encontrada'}</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{offering.name}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información de la oferta */}
          <div className="lg:col-span-2 space-y-6">
            {/* Imagen */}
            <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg overflow-hidden">
              {offering.images && offering.images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={offering.images[0]}
                  alt={offering.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-white text-6xl">🎫</span>
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Descripción</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {offering.description || 'Sin descripción disponible'}
              </p>
            </div>

            {/* Selección de fecha */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Selecciona una fecha</h2>
              <DateSelector
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </div>

            {/* Franjas horarias */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Horarios disponibles - {formatDate(selectedDate)}
              </h2>

              {slotVariants.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma
                  </label>
                  <select
                    value={slotVariantKey}
                    onChange={(e) => setSlotVariantKey(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {slotVariants.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label || v.key}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {loadingSlots ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Cargando horarios...</p>
                </div>
              ) : slots.length === 0 ? (
                <p className="text-gray-600 py-8 text-center">
                  No hay horarios disponibles para esta fecha
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {slots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSlot(slot)}
                      disabled={slot.available === 0}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedSlot === slot
                          ? 'border-blue-600 bg-blue-50'
                          : slot.available === 0
                          ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-sm font-semibold">{formatTime(slot.start)}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {slot.available > 0 ? `${slot.available} disponibles` : 'Agotado'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar de reserva */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Resumen de reserva</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad
                  </label>
                  <div className="space-y-2">
                    {includeStandard && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-medium">Estándar</div>
                          <div className="text-xs text-gray-600">{formatPrice(offering.basePrice, offering.currency)}</div>
                        </div>
                        <select
                          value={standardQty}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            const otherSum = totalSelected - standardQty;
                            setStandardQty(clampChange(standardQty, next, otherSum));
                          }}
                          disabled={!selectedSlot}
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                          {(() => {
                            const otherSum = totalSelected - standardQty;
                            const maxForThis = selectedSlot ? Math.max(0, available - otherSum) : 0;
                            const options: number[] = [];
                            for (let i = 0; i <= Math.min(maxForThis, 20); i++) options.push(i);
                            return options;
                          })().map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {variants.map((v) => {
                      const current = variantQty[v.name] || 0;
                      return (
                        <div key={v.name} className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium">{v.name}</div>
                            <div className="text-xs text-gray-600">{formatPrice(v.price, offering.currency)}</div>
                          </div>
                          <select
                            value={current}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              const otherSum = totalSelected - current;
                              const clamped = clampChange(current, next, otherSum);
                              setVariantQty((prev) => ({ ...prev, [v.name]: clamped }));
                            }}
                            disabled={!selectedSlot}
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                          >
                            {(() => {
                              const otherSum = totalSelected - current;
                              const maxForThis = selectedSlot ? Math.max(0, available - otherSum) : 0;
                              const options: number[] = [];
                              for (let i = 0; i <= Math.min(maxForThis, 20); i++) options.push(i);
                              return options;
                            })().map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedSlot && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-1">Fecha y hora</p>
                    <p className="font-medium">{formatDate(selectedDate)}</p>
                    <p className="font-medium">{formatTime(selectedSlot.start)}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Entradas</span>
                    <span className="font-medium">{totalSelected}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">{formatPrice(totalAmount, offering.currency)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleReserve}
                disabled={!selectedSlot || loading || totalSelected < 1}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Procesando...' : 'Continuar con la reserva'}
              </button>

              {error && (
                <p className="text-red-600 text-sm mt-3">{error}</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DateSelector({
  selectedDate,
  onDateChange,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(new Date(), i));
  }

  return (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      {days.map((day, index) => {
        const isSelected =
          day.toDateString() === selectedDate.toDateString();
        return (
          <button
            key={index}
            onClick={() => onDateChange(day)}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-lg border-2 transition-all ${
              isSelected
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <span className="text-xs text-gray-600 mb-1">
              {new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(day)}
            </span>
            <span className="text-xl font-bold">
              {day.getDate()}
            </span>
            <span className="text-xs text-gray-600">
              {new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(day)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
