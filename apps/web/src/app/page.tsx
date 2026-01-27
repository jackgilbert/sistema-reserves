'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Offering } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useLocale } from '@/components/LocaleProvider';

type PublicSettings = {
  branding?: {
    siteTitle?: string;
  };
  general?: {
    description?: string;
  };
};

export default function HomePage() {
  const { locale } = useLocale();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Sistema de Reservas');
  const [subtitle, setSubtitle] = useState('Selecciona una experiencia para reservar');

  useEffect(() => {
    const load = async () => {
      try {
        const [data, settings] = await Promise.all([
          api.offerings.list(),
          api.settings.getPublic(),
        ]);
        setOfferings(Array.isArray(data) ? data : []);
        const publicSettings = settings as PublicSettings;
        const nextTitle =
          publicSettings?.branding?.siteTitle || 'Sistema de Reservas';
        const nextSubtitle =
          publicSettings?.general?.description ||
          publicSettings?.branding?.siteTitle ||
          'Selecciona una experiencia para reservar';
        setTitle(nextTitle);
        setSubtitle(nextSubtitle);
      } catch (e) {
        console.error('[HomePage] Error fetching offerings:', e);
        setError(e instanceof Error ? e.message : 'Error al cargar las ofertas');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {title}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {subtitle}
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
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando ofertas...</p>
          </div>
        ) : error ? (
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
              <OfferingCard key={offering.id} offering={offering} locale={locale} />
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

function OfferingCard({ offering, locale }: { offering: Offering; locale: string }) {
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
              {formatPrice(offering.basePrice, offering.currency, locale)}
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
