'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ParkingSession = {
  id: string;
  plate: string;
  entryAt: string;
  exitAt?: string | null;
  status: string;
  amountDue: number;
  paidAt?: string | null;
  booking?: {
    code: string;
    customerName: string;
    customerEmail: string;
  };
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format((amount || 0) / 100);
}

export default function AdminParkingPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [status, setStatus] = useState('');
  const [gateId, setGateId] = useState('default');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-domain': window.location.hostname,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const loadSessions = useCallback(async (nextStatus = status) => {
    setLoading(true);
    setError('');

    try {
      const query = nextStatus ? `?status=${encodeURIComponent(nextStatus)}` : '';
      const res = await fetch(`/api/parking/sessions${query}`, { headers: authHeaders });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || 'No se pudieron cargar las sesiones');
      }

      const data = (await res.json()) as ParkingSession[];
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las sesiones');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, router, status]);

  useEffect(() => {
    void loadSessions(status);
  }, [loadSessions, status]);

  const handleManualOpen = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!gateId.trim() || !reason.trim()) {
        throw new Error('Indica barrera y motivo');
      }

      const res = await fetch('/api/parking/admin/open-gate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ gateId: gateId.trim(), reason: reason.trim() }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || 'No se pudo abrir la barrera');
      }

      const payload = await res.json();
      setSuccess(payload?.message || 'Barrera abierta manualmente');
      setReason('');
    } catch (err: any) {
      setError(err?.message || 'No se pudo abrir la barrera');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Parking</h1>
        <p className="mt-2 text-sm text-gray-700">
          Monitor de sesiones y apertura manual de barreras.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">{success}</div>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sesiones</h2>
            <p className="mt-1 text-sm text-gray-500">Últimas 100 sesiones de parking.</p>
          </div>

          <div className="flex items-end gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Estado
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Todos</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
                <option value="PAID">PAID</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => loadSessions(status)}
              className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-800 hover:bg-gray-200"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Reserva</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cliente</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Matrícula</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Entrada</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Salida</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Importe</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando sesiones...</td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay sesiones para el filtro actual.</td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{session.booking?.code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{session.booking?.customerName || '-'}</div>
                      <div className="text-xs text-gray-500">{session.booking?.customerEmail || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{session.plate}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(session.entryAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(session.exitAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatMoney(session.amountDue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{session.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Apertura manual</h2>
        <p className="mt-1 text-sm text-gray-500">Usa esta acción solo para incidencias o control manual.</p>

        <form onSubmit={handleManualOpen} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Gate ID
            <input
              value={gateId}
              onChange={(event) => setGateId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Motivo
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Emergencia, incidencia técnica, validación manual..."
            />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Abriendo...' : 'Abrir barrera'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}