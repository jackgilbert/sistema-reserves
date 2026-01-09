'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Offering {
  id: string;
  name: string;
  description: string | null;
  type: string;
  basePrice: number;
  currency: string;
  capacity: number | null;
  active: boolean;
}

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

export default function AdminOfferingEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [offering, setOffering] = useState<Offering | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePriceEuros, setBasePriceEuros] = useState('');
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

        const data = (await res.json()) as Offering;
        setOffering(data);

        setName(data.name ?? '');
        setDescription(data.description ?? '');
        setBasePriceEuros(formatCentsToEuros(data.basePrice ?? 0));
        setCapacity(data.capacity === null || data.capacity === undefined ? '' : String(data.capacity));
        setActive(!!data.active);
      } catch (err: any) {
        setError(err?.message || 'Error al cargar la oferta');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, authHeaders, router]);

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    setError('');

    try {
      const basePrice = parseEurosToCents(basePriceEuros);
      if (basePrice === null) {
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Editar oferta</h1>
            <p className="mt-1 text-sm text-gray-600">Tipo: {offering.type}</p>
          </div>
          <Link
            href="/admin/offerings"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
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
              <label className="block text-sm font-medium text-gray-700">Precio base (EUR)</label>
              <input
                value={basePriceEuros}
                onChange={(e) => setBasePriceEuros(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
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

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
