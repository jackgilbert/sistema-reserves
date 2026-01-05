'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Offering {
  id: string;
  name: string;
  description: string;
  type: string;
  basePrice: number;
  capacity: number | null;
  active: boolean;
  schedules: Array<{
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    slotDuration: number;
  }>;
  variants: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

export default function AdminOfferingsPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOfferings();
  }, []);

  const fetchOfferings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        '/api/offerings?activeOnly=false',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-domain': window.location.hostname,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar ofertas');

      const data = await response.json();
      setOfferings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/offerings/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-domain': window.location.hostname,
        },
        body: JSON.stringify({ active: !currentState }),
      });

      if (!response.ok) throw new Error('Error al actualizar oferta');

      fetchOfferings(); // Recargar lista
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount / 100);
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      CAPACITY: { label: 'Capacidad', color: 'bg-blue-100 text-blue-800' },
      RESOURCE: { label: 'Recurso', color: 'bg-purple-100 text-purple-800' },
      APPOINTMENT: { label: 'Cita', color: 'bg-green-100 text-green-800' },
      SEATS: { label: 'Asientos', color: 'bg-yellow-100 text-yellow-800' },
    };

    const typeInfo = types[type] || { label: type, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}>
        {typeInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando ofertas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Ofertas</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestiona las ofertas y servicios disponibles
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            + Nueva Oferta
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {offerings.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No hay ofertas registradas
          </div>
        ) : (
          offerings.map((offering) => (
            <div
              key={offering.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                offering.active ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {offering.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {offering.description}
                  </p>
                </div>
                {getTypeBadge(offering.type)}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Precio base:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(offering.basePrice)}
                  </span>
                </div>

                {offering.capacity && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Capacidad:</span>
                    <span className="font-medium text-gray-900">
                      {offering.capacity} personas
                    </span>
                  </div>
                )}

                {offering.variants.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">Variantes:</span>
                    <div className="mt-1 space-y-1">
                      {offering.variants.map((variant) => (
                        <div key={variant.id} className="flex justify-between text-xs">
                          <span>{variant.name}</span>
                          <span className="font-medium">
                            {formatCurrency(variant.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {offering.schedules.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">Horario:</span>
                    <div className="text-xs mt-1">
                      {offering.schedules[0].startTime} - {offering.schedules[0].endTime}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => toggleActive(offering.id, offering.active)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                    offering.active
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {offering.active ? 'Desactivar' : 'Activar'}
                </button>
                <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100">
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
