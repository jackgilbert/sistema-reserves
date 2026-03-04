'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Schedule {
  id: string;
  offeringId: string;
  daysOfWeek: number[]; // 0=Monday, 6=Sunday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  slotDuration: number;
  validFrom: string;
  validTo?: string;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  cutoffMinutes: number;
  metadata?: {
    language?: string;
    guide?: string;
    description?: string;
    [key: string]: any;
  };
}

interface AvailabilityOverride {
  id: string;
  offeringId: string;
  dateFrom: string;
  dateTo: string;
  type: 'BLOCKED' | 'CAPACITY_OVERRIDE' | 'PRICE_OVERRIDE';
  capacityOverride?: number;
  priceOverride?: number;
  reason?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  override?: AvailabilityOverride;
  isSelected: boolean;
}

export default function OfferingAvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeTab, setActiveTab] = useState<'schedules' | 'overrides'>('schedules');
  
  // Schedule form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [slotDuration, setSlotDuration] = useState(60);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [scheduleLanguage, setScheduleLanguage] = useState('');
  const [scheduleDescription, setScheduleDescription] = useState('');
  
  // Calendar state (for overrides)
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  
  // Batch operation state
  const [batchType, setBatchType] = useState<'BLOCKED' | 'CAPACITY_OVERRIDE' | 'PRICE_OVERRIDE'>('BLOCKED');
  const [batchCapacity, setBatchCapacity] = useState('');
  const [batchPrice, setBatchPrice] = useState('');
  const [batchReason, setBatchReason] = useState('');

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-domain': window.location.hostname,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/offerings/${id}/schedules`, {
        headers,
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) {
        // Silently fail if endpoint doesn't exist yet
        setSchedules([]);
        return;
      }

      const data = await res.json();
      setSchedules(data);
    } catch (err: any) {
      // Silently fail - schedules endpoint might not exist yet
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchOverrides = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-domain': window.location.hostname,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/availability-calendar/offering/${id}`, {
        headers,
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Error al cargar disponibilidad');
      }

      const data = await res.json();
      setOverrides(data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar disponibilidad');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchData = useCallback(async () => {
    await Promise.all([fetchOverrides(), fetchSchedules()]);
  }, [fetchOverrides, fetchSchedules]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Calendar generation
  const generateCalendar = (): CalendarDay[][] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const weeks: CalendarDay[][] = [];
    let currentWeek: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const override = overrides.find(o => {
        const oStart = new Date(o.dateFrom);
        const oEnd = new Date(o.dateTo);
        return date >= oStart && date <= oEnd;
      });

      currentWeek.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        override,
        isSelected: selectedDates.has(dateStr),
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return weeks;
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const newSelected = new Set(selectedDates);
    
    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }
    
    setSelectedDates(newSelected);
  };

  const handleBatchApply = async () => {
    if (selectedDates.size === 0) {
      setError('Selecciona al menos una fecha');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-domain': window.location.hostname,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const sortedDates = Array.from(selectedDates).sort();
      
      // Group consecutive dates into ranges
      const ranges: { start: string; end: string }[] = [];
      let rangeStart = sortedDates[0];
      let rangeEnd = sortedDates[0];

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
          rangeEnd = sortedDates[i];
        } else {
          ranges.push({ start: rangeStart, end: rangeEnd });
          rangeStart = sortedDates[i];
          rangeEnd = sortedDates[i];
        }
      }
      ranges.push({ start: rangeStart, end: rangeEnd });

      // Create overrides for each range
      for (const range of ranges) {
        const body: any = {
          offeringId: id,
          dateFrom: range.start,
          dateTo: range.end,
          type: batchType,
        };

        if (batchType === 'CAPACITY_OVERRIDE' && batchCapacity) {
          body.capacityOverride = parseInt(batchCapacity);
        }

        if (batchType === 'PRICE_OVERRIDE' && batchPrice) {
          body.priceOverride = Math.round(parseFloat(batchPrice) * 100);
        }

        if (batchReason) {
          body.reason = batchReason;
        }

        const res = await fetch('/api/availability-calendar', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error('Error al aplicar cambios');
        }
      }

      // Reset
      setSelectedDates(new Set());
      setBatchCapacity('');
      setBatchPrice('');
      setBatchReason('');

      await fetchOverrides();
    } catch (err: any) {
      setError(err?.message || 'Error al aplicar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (selectedDays.length === 0 || !validFrom) {
      setError('Selecciona al menos un día y una fecha de inicio');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-domain': window.location.hostname,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body: any = {
        offeringId: id,
        daysOfWeek: selectedDays,
        startTime,
        endTime,
        slotDuration,
        validFrom,
        validTo: validTo || null,
        minAdvanceMinutes: 0,
        maxAdvanceDays: 90,
        cutoffMinutes: 0,
        metadata: {},
      };

      if (scheduleLanguage || scheduleDescription) {
        body.metadata = {
          ...(scheduleLanguage && { language: scheduleLanguage }),
          ...(scheduleDescription && { description: scheduleDescription }),
        };
      }

      const res = await fetch(`/api/offerings/${id}/schedules`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('Error al crear horario');
      }

      // Reset form
      setSelectedDays([]);
      setStartTime('09:00');
      setEndTime('18:00');
      setSlotDuration(60);
      setValidFrom('');
      setValidTo('');
      setScheduleLanguage('');
      setScheduleDescription('');
      setShowScheduleForm(false);

      await fetchSchedules();
    } catch (err: any) {
      setError(err?.message || 'Error al crear horario');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('¿Eliminar este horario?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'x-tenant-domain': window.location.hostname,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/offerings/${id}/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        throw new Error('Error al eliminar');
      }

      await fetchSchedules();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar');
    }
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const getDayName = (day: number) => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return days[day];
  };

  const handleClearSelection = () => {
    setSelectedDates(new Set());
  };

  const handleSelectWeekend = () => {
    const weeks = generateCalendar();
    const newSelected = new Set(selectedDates);
    
    weeks.forEach(week => {
      week.forEach((day, index) => {
        if (day.isCurrentMonth && (index === 0 || index === 6)) {
          newSelected.add(day.date.toISOString().split('T')[0]);
        }
      });
    });
    
    setSelectedDates(newSelected);
  };

  const handleSelectMonth = () => {
    const weeks = generateCalendar();
    const newSelected = new Set<string>();
    
    weeks.forEach(week => {
      week.forEach(day => {
        if (day.isCurrentMonth) {
          newSelected.add(day.date.toISOString().split('T')[0]);
        }
      });
    });
    
    setSelectedDates(newSelected);
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm('¿Eliminar este override?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'x-tenant-domain': window.location.hostname,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/availability-calendar/${overrideId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        throw new Error('Error al eliminar');
      }

      await fetchOverrides();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar');
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando calendario...</div>
      </div>
    );
  }

  const calendar = generateCalendar();
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Calendario de disponibilidad</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gestiona horarios recurrentes y excepciones
            </p>
          </div>
          <Link
            href={`/admin/offerings/${id}`}
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            ← Volver a la oferta
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('schedules')}
              className={`${
                activeTab === 'schedules'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              🕐 Horarios recurrentes ({schedules.length})
            </button>
            <button
              onClick={() => setActiveTab('overrides')}
              className={`${
                activeTab === 'overrides'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              📅 Excepciones ({overrides.length})
            </button>
          </nav>
        </div>

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            {/* Create Schedule Button */}
            <div>
              <button
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showScheduleForm ? '✕ Cancelar' : '+ Nuevo horario recurrente'}
              </button>
            </div>

            {/* Schedule Form */}
            {showScheduleForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Crear horario recurrente</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Define franjas horarias que se repiten cada semana (ej: visitas en alemán cada sábado a las 10:00)
                </p>
                
                <div className="space-y-4">
                  {/* Days of Week */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Días de la semana
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2, 3, 4, 5, 6].map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            selectedDays.includes(day)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {getDayName(day)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora inicio
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora fin
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duración (min)
                      </label>
                      <select
                        value={slotDuration}
                        onChange={(e) => setSlotDuration(Number(e.target.value))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value={30}>30 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                        <option value={120}>120 min</option>
                        <option value={180}>180 min</option>
                      </select>
                    </div>
                  </div>

                  {/* Valid Date Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Válido desde
                      </label>
                      <input
                        type="date"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        required
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Válido hasta (opcional)
                      </label>
                      <input
                        type="date"
                        value={validTo}
                        onChange={(e) => setValidTo(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Modifiers/Metadata */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idioma/Modalidad (opcional)
                    </label>
                    <input
                      type="text"
                      value={scheduleLanguage}
                      onChange={(e) => setScheduleLanguage(e.target.value)}
                      placeholder="Ej: Alemán, Español, Inglés..."
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción (opcional)
                    </label>
                    <input
                      type="text"
                      value={scheduleDescription}
                      onChange={(e) => setScheduleDescription(e.target.value)}
                      placeholder="Ej: Visita guiada con audioguía..."
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowScheduleForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateSchedule}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Creando...' : 'Crear horario'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Schedules List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Horarios activos ({schedules.length})
                </h2>
              </div>
              
              {schedules.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No hay horarios configurados.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Crea horarios recurrentes para definir cuándo está disponible esta oferta.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex gap-1">
                              {schedule.daysOfWeek.map(day => (
                                <span
                                  key={day}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {getDayName(day)}
                                </span>
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({schedule.slotDuration} min)
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            <strong>Válido:</strong> {new Date(schedule.validFrom).toLocaleDateString('es-ES')}
                            {schedule.validTo && ` - ${new Date(schedule.validTo).toLocaleDateString('es-ES')}`}
                          </div>
                          
                          {schedule.metadata?.language && (
                            <div className="text-sm text-gray-600 mt-1">
                              <strong>Idioma:</strong> {schedule.metadata.language}
                            </div>
                          )}
                          
                          {schedule.metadata?.description && (
                            <div className="text-sm text-gray-500 mt-1 italic">
                              {schedule.metadata.description}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overrides Tab (existing calendar) */}
        {activeTab === 'overrides' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              {/* Calendar Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  ←
                </button>
                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                  {monthName}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  →
                </button>
              </div>

              {/* Quick Actions */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
                <button
                  onClick={handleSelectWeekend}
                  className="text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
                >
                  Fines de semana
                </button>
                <button
                  onClick={handleSelectMonth}
                  className="text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
                >
                  Todo el mes
                </button>
                <button
                  onClick={handleClearSelection}
                  className="text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
                >
                  Limpiar ({selectedDates.size})
                </button>
                <div className="ml-auto flex gap-2">
                  <span className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span> Bloqueado
                  </span>
                  <span className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></span> Capacidad
                  </span>
                  <span className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span> Precio
                  </span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="p-6">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="space-y-1">
                  {calendar.map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-7 gap-1">
                      {week.map((day, dayIdx) => {
                        const bgColor = day.override
                          ? day.override.type === 'BLOCKED'
                            ? 'bg-red-100 border-red-300'
                            : day.override.type === 'CAPACITY_OVERRIDE'
                            ? 'bg-yellow-100 border-yellow-300'
                            : 'bg-green-100 border-green-300'
                          : day.isSelected
                          ? 'bg-blue-100 border-blue-400'
                          : 'bg-white border-gray-200';

                        return (
                          <button
                            key={dayIdx}
                            onClick={() => handleDateClick(day.date)}
                            disabled={!day.isCurrentMonth}
                            className={`
                              aspect-square p-2 border rounded text-sm
                              ${bgColor}
                              ${!day.isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:border-blue-400 cursor-pointer'}
                              ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                              ${day.isSelected ? 'font-bold' : ''}
                              transition-all
                            `}
                          >
                            <div className="flex flex-col items-center">
                              <span className={day.isToday ? 'text-blue-600' : ''}>{day.date.getDate()}</span>
                              {day.override && (
                                <span className="text-[8px] mt-1">
                                  {day.override.type === 'BLOCKED'
                                    ? '🚫'
                                    : day.override.type === 'CAPACITY_OVERRIDE'
                                    ? '📊'
                                    : '💰'}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="space-y-6">
            {/* Batch Operations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Operación en lote
              </h3>
              
              {selectedDates.size === 0 ? (
                <p className="text-sm text-gray-500 mb-4">
                  Selecciona fechas en el calendario para aplicar cambios en lote
                </p>
              ) : (
                <p className="text-sm text-gray-700 mb-4">
                  <strong>{selectedDates.size}</strong> fechas seleccionadas
                </p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <select
                    value={batchType}
                    onChange={(e) => setBatchType(e.target.value as any)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="BLOCKED">🚫 Bloquear fechas</option>
                    <option value="CAPACITY_OVERRIDE">📊 Ajustar capacidad</option>
                    <option value="PRICE_OVERRIDE">💰 Precio especial</option>
                  </select>
                </div>

                {batchType === 'CAPACITY_OVERRIDE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacidad</label>
                    <input
                      type="number"
                      value={batchCapacity}
                      onChange={(e) => setBatchCapacity(e.target.value)}
                      min="0"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>
                )}

                {batchType === 'PRICE_OVERRIDE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Precio (EUR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={batchPrice}
                      onChange={(e) => setBatchPrice(e.target.value)}
                      min="0"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Motivo (opcional)</label>
                  <input
                    type="text"
                    value={batchReason}
                    onChange={(e) => setBatchReason(e.target.value)}
                    placeholder="Ej: Festivo, Mantenimiento..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>

                <button
                  onClick={handleBatchApply}
                  disabled={saving || selectedDates.size === 0}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {saving ? 'Aplicando...' : 'Aplicar a selección'}
                </button>
              </div>
            </div>

            {/* Active Overrides */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Overrides activos ({overrides.length})
              </h3>
              
              {overrides.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No hay overrides configurados
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {overrides.slice(0, 10).map((override) => (
                    <div key={override.id} className="border border-gray-200 rounded-lg p-3 text-xs">
                      <div className="flex items-start justify-between mb-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            override.type === 'BLOCKED'
                              ? 'bg-red-100 text-red-800'
                              : override.type === 'CAPACITY_OVERRIDE'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {override.type === 'BLOCKED'
                            ? '🚫'
                            : override.type === 'CAPACITY_OVERRIDE'
                            ? '📊'
                            : '💰'}
                        </span>
                        <button
                          onClick={() => handleDeleteOverride(override.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-gray-700">
                        {new Date(override.dateFrom).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        {' → '}
                        {new Date(override.dateTo).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                      </div>
                      {override.reason && (
                        <div className="text-gray-500 italic mt-1">{override.reason}</div>
                      )}
                    </div>
                  ))}
                  {overrides.length > 10 && (
                    <p className="text-center text-gray-500">
                      y {overrides.length - 10} más...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
