'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Domain = {
  id: string;
  domain: string;
  isPrimary: boolean;
};

type Instance = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  locale: string;
  currency: string;
  timezone: string;
  primaryColor: string;
  secondaryColor: string;
  domains: Domain[];
  _count?: {
    offerings: number;
    bookings: number;
    users: number;
  };
};

type CreateFormState = {
  slug: string;
  name: string;
  primaryDomain: string;
  locale: string;
  currency: string;
  timezone: string;
};

const INITIAL_FORM: CreateFormState = {
  slug: '',
  name: '',
  primaryDomain: '',
  locale: 'es-ES',
  currency: 'EUR',
  timezone: 'Europe/Madrid',
};

export default function AdminInstancesPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-domain': window.location.hostname,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/instances', { headers: authHeaders });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) {
        throw new Error('No se pudieron cargar las instancias');
      }

      const data = (await res.json()) as Instance[];
      setInstances(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las instancias');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, router]);

  useEffect(() => {
    void loadInstances();
  }, [loadInstances]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const slug = form.slug.trim();
      const name = form.name.trim();
      const primaryDomain = form.primaryDomain.trim();

      if (!slug || !name) {
        throw new Error('Nombre y slug son obligatorios');
      }

      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          slug,
          name,
          locale: form.locale.trim(),
          currency: form.currency.trim().toUpperCase(),
          timezone: form.timezone.trim(),
          domains: primaryDomain
            ? [{ domain: primaryDomain, isPrimary: true }]
            : undefined,
        }),
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || 'No se pudo crear la instancia');
      }

      setForm(INITIAL_FORM);
      setSuccess('Instancia creada');
      await loadInstances();
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear la instancia');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (instance: Instance) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/instances/${instance.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ active: !instance.active }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || 'No se pudo actualizar la instancia');
      }

      setInstances((current) =>
        current.map((entry) =>
          entry.id === instance.id
            ? { ...entry, active: !instance.active }
            : entry,
        ),
      );
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la instancia');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-lg text-gray-600">Cargando instancias...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Instancias</h1>
        <p className="mt-2 text-sm text-gray-700">
          Alta y supervisión de tenants desde el panel de super administrador.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {success}
        </div>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Nueva instancia</h2>
        <form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Nombre
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Slug
            <input
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            Dominio principal
            <input
              value={form.primaryDomain}
              onChange={(event) => setForm((current) => ({ ...current, primaryDomain: event.target.value }))}
              placeholder="museo.localhost o reservas.midominio.com"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Locale
            <input
              value={form.locale}
              onChange={(event) => setForm((current) => ({ ...current, locale: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Moneda
            <input
              value={form.currency}
              onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            Zona horaria
            <input
              value={form.timezone}
              onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear instancia'}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {instances.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-gray-500">
            No hay instancias registradas.
          </div>
        ) : (
          instances.map((instance) => {
            const primaryDomain = instance.domains.find((domain) => domain.isPrimary);

            return (
              <article
                key={instance.id}
                className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{instance.name}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          instance.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {instance.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-sm text-gray-500">{instance.slug}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(instance)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      instance.active
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {instance.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>

                <dl className="mt-5 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                  <div>
                    <dt className="text-gray-500">Dominio principal</dt>
                    <dd className="font-medium text-gray-900">
                      {primaryDomain?.domain || 'Sin dominio principal'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Locale / Moneda</dt>
                    <dd className="font-medium text-gray-900">
                      {instance.locale} / {instance.currency}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Zona horaria</dt>
                    <dd className="font-medium text-gray-900">{instance.timezone}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Conteos</dt>
                    <dd className="font-medium text-gray-900">
                      {instance._count?.offerings ?? 0} ofertas, {instance._count?.bookings ?? 0} reservas, {instance._count?.users ?? 0} usuarios
                    </dd>
                  </div>
                </dl>

                {instance.domains.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700">Dominios</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {instance.domains.map((domain) => (
                        <span
                          key={domain.id}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                        >
                          {domain.domain}{domain.isPrimary ? ' · principal' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}