'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function AdminOfferingNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'CAPACITY' | 'RESOURCE' | 'APPOINTMENT' | 'SEATS'>('CAPACITY');
  const [basePriceEuros, setBasePriceEuros] = useState(formatCentsToEuros(0));
  const [capacity, setCapacity] = useState<string>('');
  const [active, setActive] = useState(true);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'x-tenant-domain': window.location.hostname,
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError('');

    try {
      const basePrice = parseEurosToCents(basePriceEuros);
      if (basePrice === null || basePrice < 0) {
        throw new Error('Precio base inválido');
      }

      const trimmedSlug = slug.trim();
      if (!trimmedSlug) {
        throw new Error('Slug requerido');
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('Nombre requerido');
      }

      const capacityValue = capacity.trim() === '' ? null : Number(capacity);
      if (capacityValue !== null && (!Number.isInteger(capacityValue) || capacityValue < 0)) {
        throw new Error('Capacidad inválida');
      }

      const res = await fetch('/api/offerings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          slug: trimmedSlug,
          name: trimmedName,
          description: description.trim() ? description : undefined,
          type,
          basePrice,
          capacity: capacityValue,
          active,
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
          throw new Error(payload?.message || 'Error al crear la oferta');
        }
        throw new Error('Error al crear la oferta');
      }

      router.push('/admin/offerings');
    } catch (err: any) {
      setError(err?.message || 'Error al crear la oferta');
    } finally {
      setSaving(false);
    }
  };

  const showCapacity = type === 'CAPACITY' || type === 'APPOINTMENT';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Nueva oferta</h1>
            <p className="mt-1 text-sm text-gray-600">Crea una oferta para tu catálogo</p>
          </div>
          <Link href="/admin/offerings" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Volver
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ej: entradas-museo"
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="CAPACITY">Capacidad</option>
                <option value="RESOURCE">Recurso</option>
                <option value="APPOINTMENT">Cita</option>
                <option value="SEATS">Asientos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Precio base (EUR)</label>
              <input
                value={basePriceEuros}
                onChange={(e) => setBasePriceEuros(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {showCapacity && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Capacidad</label>
              <input
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          )}

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

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
