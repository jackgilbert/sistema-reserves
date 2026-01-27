'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { formatTime } from '@/lib/utils';

type CheckInSlot = {
  slotStart: string;
  slotEnd: string;
  count: number;
};

type CheckInBooking = {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string | null;
  status: string;
  usedAt?: string | null;
  quantity: number;
  offering: string;
  slotStart: string;
  slotEnd: string;
};

function getTodayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminCheckinPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);

  const [listDate, setListDate] = useState(getTodayInputValue());
  const [slots, setSlots] = useState<CheckInSlot[]>([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState('');
  const [bookings, setBookings] = useState<CheckInBooking[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [checkingCode, setCheckingCode] = useState<string | null>(null);

  const codeReader = useMemo(() => new BrowserQRCodeReader(), []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-tenant-domain': window.location.hostname,
    } as Record<string, string>;
  };

  const stopCamera = () => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkInByCode = async (normalizedCode: string) => {
    const response = await fetch('/api/checkin', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: normalizedCode }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al procesar check-in');
    }

    return response.json();
  };

  const performCheckIn = async (scannedCode: string) => {
    const normalizedCode = scannedCode.trim().toUpperCase();
    if (!normalizedCode) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await checkInByCode(normalizedCode);
      setResult(data);
      setCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const performVerify = async (scannedCode: string) => {
    const normalizedCode = scannedCode.trim().toUpperCase();
    if (!normalizedCode) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/api/checkin/verify/${normalizedCode}`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Reserva no encontrada');
      }

      const data = await response.json();
      setResult({ ...data, isVerification: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSlotKey = (slot: CheckInSlot) => `${slot.slotStart}|${slot.slotEnd}`;

  const loadSlots = async (date: string) => {
    setListLoading(true);
    setListError('');
    try {
      const res = await fetch(`/api/checkin/slots?date=${encodeURIComponent(date)}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('No se pudieron cargar los horarios');
      }
      const data = (await res.json()) as CheckInSlot[];
      setSlots(data);

      if (data.length === 0) {
        setSelectedSlotKey('');
        setBookings([]);
        return;
      }

      const currentKey = selectedSlotKey;
      const exists = data.some((slot) => getSlotKey(slot) === currentKey);
      const nextKey = exists ? currentKey : getSlotKey(data[0]);
      setSelectedSlotKey(nextKey);
    } catch (err: any) {
      setListError(err?.message || 'Error al cargar horarios');
      setSlots([]);
      setBookings([]);
      setSelectedSlotKey('');
    } finally {
      setListLoading(false);
    }
  };

  const loadBookings = async (date: string, slotKey: string) => {
    if (!slotKey) return;
    const [slotStart, slotEnd] = slotKey.split('|');
    setListLoading(true);
    setListError('');
    try {
      const res = await fetch(
        `/api/checkin/list?date=${encodeURIComponent(date)}&slotStart=${encodeURIComponent(
          slotStart,
        )}&slotEnd=${encodeURIComponent(slotEnd)}`,
        { headers: getAuthHeaders() },
      );
      if (!res.ok) {
        throw new Error('No se pudieron cargar las reservas');
      }
      const data = (await res.json()) as CheckInBooking[];
      setBookings(data);
    } catch (err: any) {
      setListError(err?.message || 'Error al cargar reservas');
      setBookings([]);
    } finally {
      setListLoading(false);
    }
  };

  const handleListCheckIn = async (codeValue: string) => {
    if (!codeValue) return;
    setCheckingCode(codeValue);
    setListError('');
    try {
      await checkInByCode(codeValue.trim().toUpperCase());
      setBookings((prev) =>
        prev.map((booking) =>
          booking.code === codeValue
            ? { ...booking, status: 'USED', usedAt: new Date().toISOString() }
            : booking,
        ),
      );
    } catch (err: any) {
      setListError(err?.message || 'Error al realizar check-in');
    } finally {
      setCheckingCode(null);
    }
  };

  useEffect(() => {
    void loadSlots(listDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listDate]);

  useEffect(() => {
    if (!selectedSlotKey) return;
    void loadBookings(listDate, selectedSlotKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlotKey]);

  const startCamera = async () => {
    setCameraError('');

    if (!videoRef.current) {
      setCameraError('No se pudo inicializar la cámara');
      return;
    }

    // Reset cualquier sesión previa
    stopCamera();

    try {
      setCameraActive(true);

      const controls = await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, err, controls) => {
          if (result) {
            const text = result.getText().trim().toUpperCase();
            setCode(text);
            controls.stop();
            scannerControlsRef.current = null;
            setCameraActive(false);
            await performCheckIn(text);
          }
        },
      );

      scannerControlsRef.current = controls;
    } catch (e: any) {
      setCameraActive(false);
      setCameraError(
        e?.message ||
          'No se pudo acceder a la cámara. Revisa permisos del navegador.',
      );
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    await performCheckIn(code);
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    await performVerify(code);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Check-in</h1>
          <p className="mt-2 text-sm text-gray-600">
            Escanea o introduce el código de la reserva
          </p>
        </div>

        <div className="mt-8 bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-medium text-gray-900">
                Check-in rápido por lista
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Selecciona fecha y horario para ver las reservas confirmadas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadSlots(listDate)}
              className="py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Actualizar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fecha
              </label>
              <input
                type="date"
                value={listDate}
                onChange={(e) => setListDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Horario
              </label>
              <select
                value={selectedSlotKey}
                onChange={(e) => setSelectedSlotKey(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                disabled={slots.length === 0}
              >
                {slots.length === 0 && (
                  <option value="">Sin reservas para la fecha</option>
                )}
                {slots.map((slot) => (
                  <option key={getSlotKey(slot)} value={getSlotKey(slot)}>
                    {formatTime(slot.slotStart)} - {formatTime(slot.slotEnd)} ({slot.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {listError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {listError}
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Código</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Teléfono</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Cantidad</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {listLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      Cargando reservas...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      No hay reservas confirmadas en este horario.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-4 py-2 text-gray-900">{booking.customerName}</td>
                      <td className="px-4 py-2 font-mono text-gray-700">{booking.code}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {booking.customerPhone || '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{booking.quantity}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'USED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {booking.status === 'USED' ? 'Check-in' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => handleListCheckIn(booking.code)}
                          disabled={booking.status === 'USED' || checkingCode === booking.code}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          {checkingCode === booking.code ? 'Procesando...' : 'Marcar check-in'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 bg-white shadow-sm rounded-lg p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">Escáner QR (cámara)</h2>
              <div className="flex gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={loading}
                    className="py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Iniciar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Detener
                  </button>
                )}
              </div>
            </div>

            {cameraError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {cameraError}
              </div>
            )}

            <div className="mt-3">
              <video
                ref={videoRef}
                className="w-full rounded-md border border-gray-200 bg-black"
                style={{ aspectRatio: '16 / 9' }}
                muted
                playsInline
              />
              <p className="mt-2 text-xs text-gray-500">
                Al detectar un QR válido, se ejecuta el check-in automáticamente.
              </p>
            </div>
          </div>

          <form onSubmit={handleScan}>
            <div className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Código de Reserva
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC12345"
                  className="mt-1 block w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 uppercase"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : '✓ Realizar Check-in'}
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading || !code.trim()}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  👁️ Solo Verificar
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-3xl mr-3">❌</span>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && !result.isVerification && (
            <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-4xl mr-3">✅</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-900">Check-in Exitoso</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Código:</span>
                      <span className="font-medium">{result.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Oferta:</span>
                      <span className="font-medium">{result.offering}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cantidad:</span>
                      <span className="font-medium">{result.quantity}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {result && result.isVerification && (
            <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-4xl mr-3">ℹ️</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-blue-900">Información de Reserva</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Código:</span>
                      <span className="font-medium">{result.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className={`font-medium ${
                        result.status === 'CONFIRMED' ? 'text-green-600' :
                        result.status === 'USED' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {result.status}
                      </span>
                    </div>
                    {result.checkInEvents && result.checkInEvents.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <span className="text-gray-600">
                          Check-ins previos: {result.checkInEvents.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900">💡 Instrucciones</h3>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>• Introduce o escanea el código de 8 caracteres</li>
            <li>• &quot;Realizar Check-in&quot; marca la reserva como utilizada</li>
            <li>• &quot;Solo Verificar&quot; consulta el estado sin modificar</li>
            <li>• El código se limpia automáticamente tras cada operación</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
