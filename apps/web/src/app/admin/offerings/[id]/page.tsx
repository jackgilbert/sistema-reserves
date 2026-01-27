'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface PriceVariant {
  // Matches DB/API: priceVariants Json @default("[]") // [{name, price, description}]
  name: string;
  price: number; // cents
  description?: string;
}

interface Offering {
  id: string;
  name: string;
  description: string | null;
  type: string;
  basePrice: number;
  currency: string;
  capacity: number | null;
  active: boolean;
  imageUrl?: string | null;
  priceVariants?: PriceVariant[];
  // Note: Prisma schema doesn't include translations on Offering
}

const CATALAN_FLAG_SVG =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MTAiIGhlaWdodD0iNTQwIj48cmVjdCB3aWR0aD0iODEwIiBoZWlnaHQ9IjU0MCIgZmlsbD0iI0ZDREQwOSIvPjxwYXRoIHN0cm9rZT0iI0RBMTIxQSIgc3Ryb2tlLXdpZHRoPSI2MCIgZD0iTTAsOTBIODEwbTAsMTIwSDBtMCwxMjBIODEwbTAsMTIwSDAiLz48L3N2Zz4=';

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ca', label: 'Català', flag: CATALAN_FLAG_SVG },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

function formatCentsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseEurosToCents(input: string): number | null {
  const normalized = input.replace(',', '.').trim();
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function normalizePriceVariants(input: unknown): PriceVariant[] {
  if (!Array.isArray(input)) return [];
  return input.map((v: any) => ({
    // Some older payloads may have { label }, so fall back to it
    name: String(v?.name ?? v?.label ?? ''),
    price: Number.isFinite(Number(v?.price)) ? Math.trunc(Number(v.price)) : 0,
    description: v?.description ? String(v.description) : '',
  }));
}

function sanitizePriceVariants(variants: PriceVariant[]): PriceVariant[] {
  return variants
    .map((v) => ({
      name: String(v.name ?? '').trim(),
      price: Math.max(0, Number.isFinite(Number(v.price)) ? Math.trunc(Number(v.price)) : 0),
      description: v.description ? String(v.description) : '',
    }))
    .filter((v) => v.name.length > 0);
}

export default function AdminOfferingEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [offering, setOffering] = useState<Offering | null>(null);
  const [currentLang, setCurrentLang] = useState('es');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePriceEuros, setBasePriceEuros] = useState('');
  const [capacity, setCapacity] = useState<string>('');
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [priceVariants, setPriceVariants] = useState<PriceVariant[]>([]);
  const [translations, setTranslations] = useState<Record<string, { name: string; description?: string }>>({});

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'x-tenant-domain': window.location.hostname,
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      setLoading(true);
      setError('');

      try {
        const res = await fetch(`/api/offerings/${id}`, { headers: authHeaders });

        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }

        if (!res.ok) {
          throw new Error('Error al cargar la oferta');
        }

        const data = (await res.json()) as any;
        setOffering(data as Offering);

        setName(data?.name ?? '');
        setDescription(data?.description ?? '');
        setBasePriceEuros(formatCentsToEuros(data?.basePrice ?? 0));
        setCapacity(data?.capacity === null || data?.capacity === undefined ? '' : String(data.capacity));
        setActive(!!data?.active);
        setImageUrl(data?.imageUrl ?? '');
        setPriceVariants(normalizePriceVariants(data?.priceVariants));

        // Keep UI state for now, but don't assume backend supports it
        setTranslations(data?.translations ?? {});
      } catch (err: any) {
        setError(err?.message || 'Error al cargar la oferta');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, authHeaders, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/uploads/image', {
        method: 'POST',
        headers: {
          'x-tenant-domain': window.location.hostname,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Error al subir imagen');

      const data = await res.json();
      setImageUrl(data.url);
    } catch (err: any) {
      setError(err?.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleAddVariant = () => {
    setPriceVariants([
      ...priceVariants,
      {
        name: '',
        price: 0,
        description: '',
      },
    ]);
  };

  const handleUpdateVariant = (index: number, field: keyof PriceVariant, value: any) => {
    const updated = [...priceVariants];
    updated[index] = { ...updated[index], [field]: value };
    setPriceVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    setPriceVariants(priceVariants.filter((_, i) => i !== index));
  };

  const handleTranslationChange = (lang: string, field: 'name' | 'description', value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    setError('');

    try {
      const basePrice = parseEurosToCents(basePriceEuros);
      if (basePrice === null || basePrice < 0) {
        throw new Error('Precio base inválido');
      }

      const capacityValue = capacity.trim() === '' ? null : Number(capacity);
      if (capacityValue !== null && (!Number.isInteger(capacityValue) || capacityValue < 0)) {
        throw new Error('Capacidad inválida');
      }

      const res = await fetch(`/api/offerings/${id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          name,
          description,
          basePrice,
          capacity: capacityValue,
          active,
          imageUrl,
          // Only send what DB/API supports
          priceVariants: sanitizePriceVariants(priceVariants),
          // Do NOT send translations unless backend explicitly supports it
        }),
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.message || 'Error al guardar la oferta');
        }
        throw new Error('Error al guardar la oferta');
      }

      router.push('/admin/offerings');
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la oferta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando oferta...</div>
      </div>
    );
  }

  if (!offering) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error || 'Error al cargar la oferta'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Editar oferta</h1>
            <p className="mt-1 text-sm text-gray-600">Tipo: {offering.type}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Language selector */}
            <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2">
              <span className="text-sm text-gray-600">Idioma:</span>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setCurrentLang(lang.code)}
                  className={`transition-all ${currentLang === lang.code ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}
                  title={lang.label}
                >
                  {lang.flag.startsWith('data:image') ? (
                    <img
                      src={lang.flag}
                      alt={lang.label}
                      style={{ width: '1.5em', height: '1.5em', display: 'inline-block' }}
                    />
                  ) : (
                    <span className="text-2xl">{lang.flag}</span>
                  )}
                </button>
              ))}
            </div>
            <Link href="/admin/offerings" className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Volver
            </Link>
          </div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

        <div className="space-y-6">
          {/* Photo Upload Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📷 Imagen</h2>
            <div className="space-y-4">
              {imageUrl && (
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div>
                <label className="block">
                  <span className="sr-only">Seleccionar imagen</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      disabled:opacity-50"
                  />
                </label>
                {uploading && <p className="mt-2 text-sm text-gray-600">Subiendo imagen...</p>}
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Información básica</h2>

            {currentLang === 'es' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre ({LANGUAGES.find((l) => l.code === currentLang)?.label})
                  </label>
                  <input
                    value={translations[currentLang]?.name || ''}
                    onChange={(e) => handleTranslationChange(currentLang, 'name', e.target.value)}
                    placeholder={name}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Descripción ({LANGUAGES.find((l) => l.code === currentLang)?.label})
                  </label>
                  <textarea
                    value={translations[currentLang]?.description || ''}
                    onChange={(e) => handleTranslationChange(currentLang, 'description', e.target.value)}
                    placeholder={description}
                    rows={4}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Precio estándar (EUR)</label>
                <input
                  value={basePriceEuros}
                  onChange={(e) => setBasePriceEuros(e.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Precio sin variantes aplicadas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Capacidad</label>
                <input
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="active" className="text-sm text-gray-700">
                Activa
              </label>
            </div>
          </div>

          {/* Price Variants Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">💰 Variantes de precio</h2>
              <button
                type="button"
                onClick={handleAddVariant}
                className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded hover:bg-blue-100"
              >
                + Añadir variante
              </button>
            </div>

            {priceVariants.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No hay variantes definidas. Añade variantes para precios diferenciados (Adulto, Niño, Senior, etc.)
              </p>
            ) : (
              <div className="space-y-4">
                {priceVariants.map((variant, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700">Variante {index + 1}</h3>
                      <button onClick={() => handleRemoveVariant(index)} className="text-red-600 hover:text-red-800 text-sm">
                        Eliminar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Nombre</label>
                        <input
                          value={variant.name}
                          onChange={(e) => handleUpdateVariant(index, 'name', e.target.value)}
                          placeholder="Adulto"
                          className="mt-1 w-full text-sm rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600">Precio (EUR)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(Number.isFinite(variant.price) ? variant.price : 0) / 100}
                          onChange={(e) => {
                            const cents = parseEurosToCents(e.target.value);
                            handleUpdateVariant(index, 'price', Math.max(0, cents ?? 0));
                          }}
                          className="mt-1 w-full text-sm rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600">Descripción</label>
                      <input
                        value={variant.description || ''}
                        onChange={(e) => handleUpdateVariant(index, 'description', e.target.value)}
                        placeholder="Ej: Entrada para mayores de 65 años"
                        className="mt-1 w-full text-sm rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Availability Configuration Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">📅 Configuración de disponibilidad</h2>
            <p className="text-sm text-gray-700 mb-4">
              Para configurar horarios, abrir/cerrar ventas, fechas de bloqueo y ajustes de capacidad, utiliza la sección
              de <strong>Calendario de disponibilidad</strong> en la API.
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• <strong>Horarios y franjas:</strong> Define schedules para esta oferta</p>
              <p>• <strong>Bloqueos:</strong> Crea availability overrides con type=BLOCKED</p>
              <p>• <strong>Ajustes de capacidad:</strong> Usa overrides con capacityOverride</p>
              <p>• <strong>Precios especiales:</strong> Usa overrides con priceOverride</p>
            </div>
            <div className="mt-4">
              <Link href={`/admin/offerings/${id}/availability`} className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800">
                → Gestionar disponibilidad
              </Link>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
