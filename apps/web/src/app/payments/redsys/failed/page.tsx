'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function RedsysFailedContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="bg-red-50 px-8 py-10 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Pago no completado</h1>
          <p className="mt-3 text-sm text-gray-600">
            La pasarela no confirmó el pago. La reserva no debe considerarse confirmada hasta ver el estado correcto.
          </p>
        </div>

        <div className="space-y-5 px-8 py-8 text-sm text-gray-700">
          {code ? (
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-gray-500">Código relacionado</p>
              <p className="mt-1 font-mono text-base font-semibold text-gray-900">{code}</p>
            </div>
          ) : null}

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            Si el banco mostró un error o cancelaste la operación, revisa el estado de la reserva antes de intentar otra compra.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {code ? (
              <Link
                href={`/manage/${code}`}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700"
              >
                Revisar mi reserva
              </Link>
            ) : null}
            <Link
              href="/"
              className="flex-1 rounded-lg bg-gray-100 px-4 py-3 text-center font-medium text-gray-800 hover:bg-gray-200"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RedsysFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <RedsysFailedContent />
    </Suspense>
  );
}