import Link from 'next/link';
import { api, Offering } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

export default async function HomePage() {
  let offerings: Offering[] = [];
  let error: string | null = null;

  try {
    offerings = await api.offerings.list();
  } catch (e) {
    console.error('[HomePage] Error fetching offerings:', e);
    error = e instanceof Error ? e.message : 'Error al cargar las ofertas';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Sistema de Reservas
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Selecciona una experiencia para reservar
              </p>
            </div>
            <Link
              href="/admin/login"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Administrar
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : offerings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No hay ofertas disponibles en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offerings.map((offering) => (
              <OfferingCard key={offering.id} offering={offering} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              © 2025 Sistema de Reservas
            </p>
            <Link
              href="/manage"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Gestionar mi reserva
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function OfferingCard({ offering }: { offering: Offering }) {
  return (
    <Link
      href={`/o/${offering.id}`}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Imagen */}
      <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 relative">
        {offering.images && offering.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offering.images[0]}
            alt={offering.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-white text-4xl">🎫</span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {offering.name}
        </h3>
        
        {offering.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {offering.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Desde</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(offering.basePrice, offering.currency)}
            </p>
          </div>
          
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {getOfferingTypeLabel(offering.type)}
          </span>
        </div>

        <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium">
          Reservar ahora
        </button>
      </div>
    </Link>
  );
}

function getOfferingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CAPACITY: 'Por grupo',
    RESOURCE: 'Recurso',
    APPOINTMENT: 'Cita',
    SEATS: 'Asientos',
  };
  return labels[type] || type;
}

