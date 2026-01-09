'use client';

import { useEffect, useMemo, useState } from 'react';

type OfferingListItem = {
  id: string;
  name: string;
  active?: boolean;
};

type BatchCreateResponse = {
  count: number;
  percentOff: number;
  offeringId: string | null;
  batchId: string | null;
  codes: string[];
};

type BatchListItem = {
  code: string;
  percentOff: number;
  offeringId: string | null;
  active: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: string | null;
  endsAt: string | null;
};

type BatchListResponse = {
  batchId: string;
  codes: BatchListItem[];
};

type DeactivateBatchResponse = {
  batchId: string;
  updated: number;
};

type SetCodeActiveResponse = {
  code: string;
  updated: number;
  active: boolean;
};

type ValidateResponse = {
  id: string;
  code: string;
  percentOff: number;
  offeringId?: string | null;
  maxRedemptions?: number | null;
  redemptionCount?: number;
  startsAt?: string | null;
  endsAt?: string | null;
};

export default function AdminDiscountsPage() {
  const [count, setCount] = useState(50);
  const [percentOff, setPercentOff] = useState(100);
  const [prefix, setPrefix] = useState('');
  const [offeringId, setOfferingId] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState<number | ''>('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [batchId, setBatchId] = useState('');

  const [offerings, setOfferings] = useState<OfferingListItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [created, setCreated] = useState<BatchCreateResponse | null>(null);

  const [loadBatchId, setLoadBatchId] = useState('');
  const [loadedBatch, setLoadedBatch] = useState<BatchListResponse | null>(null);

  const [validateCode, setValidateCode] = useState('');
  const [validateOfferingId, setValidateOfferingId] = useState('');
  const [validateLoading, setValidateLoading] = useState(false);
  const [validateResult, setValidateResult] = useState<ValidateResponse | null>(null);
  const [validateError, setValidateError] = useState<string>('');

  useEffect(() => {
    // Default batch id for convenience
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setBatchId(`batch-${y}${m}${d}`);

    // Load offerings for picker
    fetchOfferings();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-tenant-domain': window.location.hostname,
    } as Record<string, string>;
  };

  const offeringNameById = useMemo(() => {
    const map = new Map<string, OfferingListItem>();
    for (const offering of offerings) map.set(offering.id, offering);
    return map;
  }, [offerings]);

  const fetchOfferings = async () => {
    try {
      const res = await fetch('/api/offerings?activeOnly=false', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-domain': window.location.hostname,
        },
      });
      if (!res.ok) return;
      const data = (await res.json()) as OfferingListItem[];
      if (Array.isArray(data)) setOfferings(data);
    } catch {
      // Non-fatal: picker can stay empty
    }
  };

  const normalizedCodesText = useMemo(() => {
    const codes = created?.codes || [];
    return codes.join('\n');
  }, [created]);

  const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('es-ES');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copiado al portapapeles');
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Copiado al portapapeles');
    }
  };

  const downloadCsv = (filename: string, rows: Array<Record<string, any>>) => {
    const headers = Object.keys(rows[0] || { code: '' });
    const escape = (v: any) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const createBatch = async () => {
    setLoading(true);
    setError('');
    setCreated(null);

    try {
      const response = await fetch('/api/discounts/batch', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          count,
          percentOff,
          prefix: prefix || undefined,
          offeringId: offeringId || undefined,
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
          maxRedemptions: typeof maxRedemptions === 'number' ? maxRedemptions : undefined,
          batchId: batchId || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'No se pudo crear el batch');
      }

      const data = (await response.json()) as BatchCreateResponse;
      setCreated(data);
      if (data.batchId) {
        setLoadBatchId(data.batchId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatch = async () => {
    setLoading(true);
    setError('');
    setLoadedBatch(null);

    try {
      const id = loadBatchId.trim();
      if (!id) {
        setError('batchId requerido');
        return;
      }

      const response = await fetch(`/api/discounts/batch?batchId=${encodeURIComponent(id)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-domain': window.location.hostname,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'No se pudo cargar el batch');
      }

      const data = (await response.json()) as BatchListResponse;
      setLoadedBatch(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const validateDiscount = async () => {
    setValidateLoading(true);
    setValidateError('');
    setValidateResult(null);

    try {
      const code = validateCode.trim();
      if (!code) {
        setValidateError('Código requerido');
        return;
      }

      const response = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          code,
          offeringId: validateOfferingId || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Código inválido');
      }

      const data = (await response.json()) as ValidateResponse;
      setValidateResult(data);
    } catch (e) {
      setValidateError(e instanceof Error ? e.message : 'Error');
    } finally {
      setValidateLoading(false);
    }
  };

  const deactivateLoadedBatch = async () => {
    const id = (loadedBatch?.batchId || loadBatchId).trim();
    if (!id) {
      alert('batchId requerido');
      return;
    }

    const ok = confirm(`¿Desactivar todos los códigos del batch ${id}?`);
    if (!ok) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/discounts/batch/deactivate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ batchId: id }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'No se pudo desactivar el batch');
      }

      const data = (await response.json()) as DeactivateBatchResponse;
      alert(`Batch desactivado. Códigos actualizados: ${data.updated}`);
      await fetchBatch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const setCodeActive = async (code: string, active: boolean) => {
    const ok = confirm(`${active ? '¿Activar' : '¿Desactivar'} el código ${code}?`);
    if (!ok) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/discounts/code', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ code, active }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'No se pudo actualizar el código');
      }

      const data = (await response.json()) as SetCodeActiveResponse;
      if (data.updated > 0) {
        await fetchBatch();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Códigos de descuento</h1>
        <p className="text-sm text-gray-600 mt-1">
          Genera códigos en batch. Soporta 100% (reservas gratis).
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Validar código</h2>

        {validateError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {validateError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
            <input
              value={validateCode}
              onChange={(e) => setValidateCode(e.target.value)}
              placeholder="PROMO-ABC123..."
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oferta (opcional)</label>
            <select
              value={validateOfferingId}
              onChange={(e) => setValidateOfferingId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Sin oferta (validación general)</option>
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}{o.active === false ? ' (inactiva)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={validateDiscount}
            disabled={validateLoading}
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:bg-gray-300"
          >
            {validateLoading ? 'Validando...' : 'Validar'}
          </button>
        </div>

        {validateResult && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded">
            <p className="text-sm">
              Válido · %: <strong>{validateResult.percentOff}</strong> · Oferta:{' '}
              <strong>
                {validateResult.offeringId
                  ? (offeringNameById.get(validateResult.offeringId)?.name || validateResult.offeringId)
                  : 'Todas'}
              </strong>
            </p>
            <p className="text-xs text-green-800 mt-1">
              Usos:{' '}
              {typeof validateResult.redemptionCount === 'number' ? validateResult.redemptionCount : 0}/
              {typeof validateResult.maxRedemptions === 'number' ? validateResult.maxRedemptions : '∞'} · Ventana:{' '}
              {formatDateTime(validateResult.startsAt ?? null)} → {formatDateTime(validateResult.endsAt ?? null)}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Crear batch</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (1-500)</label>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || '0', 10))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">% Descuento (0-100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={percentOff}
              onChange={(e) => setPercentOff(parseInt(e.target.value || '0', 10))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prefijo (opcional)</label>
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="PROMO"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oferta (opcional)</label>
            <select
              value={offeringId}
              onChange={(e) => setOfferingId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Todas las ofertas</option>
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}{o.active === false ? ' (inactiva)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Si eliges una oferta, el descuento solo aplica a esa oferta.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max redenciones (opcional)</label>
            <input
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => {
                const v = e.target.value;
                setMaxRedemptions(v === '' ? '' : parseInt(v, 10));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch ID (opcional)</label>
            <input
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empieza (opcional)</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Termina (opcional)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={createBatch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? 'Creando...' : 'Crear batch'}
          </button>
        </div>

        {created && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-semibold text-gray-900">Resultado</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(normalizedCodesText)}
                  className="px-3 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  Copiar
                </button>
                <button
                  onClick={() =>
                    downloadCsv(
                      `${created.batchId || 'discount-codes'}.csv`,
                      created.codes.map((c) => ({
                        code: c,
                        percentOff: created.percentOff,
                        offeringId: created.offeringId || '',
                        batchId: created.batchId || '',
                        maxRedemptions: typeof maxRedemptions === 'number' ? maxRedemptions : '',
                        redemptionCount: 0,
                        remaining:
                          typeof maxRedemptions === 'number'
                            ? maxRedemptions
                            : '',
                        startsAt: startsAt ? new Date(startsAt).toISOString() : '',
                        endsAt: endsAt ? new Date(endsAt).toISOString() : '',
                      })),
                    )
                  }
                  className="px-3 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  Descargar CSV
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-1">
              Creados: <strong>{created.count}</strong> · %: <strong>{created.percentOff}</strong> · batchId:{' '}
              <strong>{created.batchId || '-'}</strong>
            </p>

            <textarea
              readOnly
              value={normalizedCodesText}
              className="mt-3 w-full h-48 font-mono text-sm px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cargar batch</h2>

        <div className="flex gap-2">
          <input
            value={loadBatchId}
            onChange={(e) => setLoadBatchId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded"
            placeholder="batch-20260108"
          />
          <button
            onClick={fetchBatch}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 disabled:bg-gray-300"
          >
            {loading ? 'Cargando...' : 'Cargar'}
          </button>
        </div>

        {loadedBatch && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              batchId: <strong>{loadedBatch.batchId}</strong> · códigos: <strong>{loadedBatch.codes.length}</strong>
            </p>

            <div className="mt-3">
              <button
                onClick={deactivateLoadedBatch}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
              >
                {loading ? 'Procesando...' : 'Desactivar batch'}
              </button>
            </div>

            <div className="mt-3 overflow-auto border border-gray-200 rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Offering</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usos</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Restantes</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ventana</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadedBatch.codes.map((c) => (
                    (() => {
                      const max = c.maxRedemptions;
                      const used = c.redemptionCount ?? 0;
                      const remaining = typeof max === 'number' ? Math.max(0, max - used) : null;
                      return (
                    <tr key={c.code}>
                      <td className="px-4 py-2 font-mono text-sm">{c.code}</td>
                      <td className="px-4 py-2 text-sm">{c.percentOff}</td>
                      <td className="px-4 py-2 text-sm">
                        {c.offeringId
                          ? (offeringNameById.get(c.offeringId)?.name || c.offeringId)
                          : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {used}/{typeof max === 'number' ? max : '∞'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {typeof remaining === 'number' ? remaining : '∞'}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {formatDateTime(c.startsAt)} → {formatDateTime(c.endsAt)}
                      </td>
                      <td className="px-4 py-2 text-sm">{c.active ? 'Sí' : 'No'}</td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          onClick={() => setCodeActive(c.code, !c.active)}
                          disabled={loading}
                          className={
                            c.active
                              ? 'px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:bg-gray-100'
                              : 'px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:bg-gray-100'
                          }
                        >
                          {c.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() =>
                  copyToClipboard(loadedBatch.codes.map((c) => c.code).join('\n'))
                }
                className="px-3 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                Copiar códigos
              </button>
              <button
                onClick={() =>
                  downloadCsv(
                    `${loadedBatch.batchId}.csv`,
                    loadedBatch.codes.map((c) => ({
                      code: c.code,
                      percentOff: c.percentOff,
                      offeringId: c.offeringId || '',
                      active: c.active,
                      batchId: loadedBatch.batchId,
                      maxRedemptions: typeof c.maxRedemptions === 'number' ? c.maxRedemptions : '',
                      redemptionCount: c.redemptionCount ?? 0,
                      remaining:
                        typeof c.maxRedemptions === 'number'
                          ? Math.max(0, c.maxRedemptions - (c.redemptionCount ?? 0))
                          : '',
                      startsAt: c.startsAt || '',
                      endsAt: c.endsAt || '',
                    })),
                  )
                }
                className="px-3 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                Descargar CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
