'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

export default function AdminCheckinPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);

  const codeReader = useMemo(() => new BrowserQRCodeReader(), []);

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

  const performCheckIn = async (scannedCode: string) => {
    const normalizedCode = scannedCode.trim().toUpperCase();
    if (!normalizedCode) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-domain': window.location.hostname,
        },
        body: JSON.stringify({ code: normalizedCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al procesar check-in');
      }

      const data = await response.json();
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
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/checkin/verify/${normalizedCode}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-domain': window.location.hostname,
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
