'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING_FONTS, BRANDING_FONT_DEFAULTS } from '@/lib/branding';

interface FeatureFlags {
  bookings: {
    enabled: boolean;
    allowPublicCancellation: boolean;
    requirePaymentOnBooking: boolean;
    maxAdvanceBookingDays: number;
    minAdvanceBookingHours: number;
  };
  checkIn: {
    enabled: boolean;
    requireQRCode: boolean;
    allowManualCheckIn: boolean;
  };
  payments: {
    enabled: boolean;
    provider: 'redsys' | 'stripe' | 'none';
    requireDeposit: boolean;
    depositPercentage: number;
  };
  availability: {
    showRealTimeCapacity: boolean;
    bufferSlots: number;
  };
  notifications: {
    enabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
  };
  analytics: {
    enabled: boolean;
    trackingEnabled: boolean;
  };
  multiLanguage: {
    enabled: boolean;
    supportedLocales: string[];
  };
}

interface TenantSettings {
  general: {
    businessName: string;
    businessType: 'museum' | 'event' | 'restaurant' | 'service' | 'other';
    contactEmail: string;
    contactPhone?: string;
    address?: string;
    description?: string;
  };
  regional: {
    timezone: string;
    locale: string;
    currency: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    primaryFont?: string;
    secondaryFont?: string;
    siteTitle?: string;
    accentColor?: string;
    customCSS?: string;
  };
  policies: {
    cancellationPolicy: string;
    refundPolicy: string;
    termsAndConditions?: string;
    privacyPolicy?: string;
    minBookingNoticeHours: number;
    maxBookingAdvanceDays: number;
  };
  booking: {
    requireCustomerPhone: boolean;
    requireCustomerAddress: boolean;
    maxPartySize: number;
    defaultSlotDuration: number;
    bookingCodePrefix: string;
  };
  notifications: {
    sendBookingConfirmation: boolean;
    sendBookingReminder: boolean;
    reminderHoursBefore: number;
    sendCancellationNotification: boolean;
    fromEmail?: string;
    fromName?: string;
    smtp?: {
      enabled?: boolean;
      host?: string;
      port?: number;
      user?: string;
      pass?: string;
      secure?: boolean;
      cc?: string;
      bcc?: string;
    };
    templates?: {
      bookingConfirmation?: {
        subject?: string;
        body?: string;
        html?: string;
      };
      bookingReminder?: {
        subject?: string;
        body?: string;
        html?: string;
      };
      bookingCancellation?: {
        subject?: string;
        body?: string;
        html?: string;
      };
    };
  };
  integrations: {
    stripeEnabled: boolean;
    stripePublicKey?: string;
    googleAnalyticsId?: string;
    customWebhookUrl?: string;
  };
  tax: {
    businessLegalName: string;
    taxId?: string;
    taxIdType?: 'VAT' | 'NIF' | 'CIF' | 'EIN' | 'OTHER';
    taxRate: number;
    includeTaxInPrice: boolean;
    invoicePrefix: string;
    invoiceNumberStart: number;
    invoiceFooter?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankName?: string;
    swiftBic?: string;
    iban?: string;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };
}

type Tab = 'profile' | 'general' | 'features' | 'booking' | 'notifications' | 'integrations' | 'tax' | 'policies' | 'branding' | 'seo';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [profile, setProfile] = useState<{ name: string; email: string; role: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [testEmail, setTestEmail] = useState({
    to: '',
    subject: 'Test SMTP',
    body: 'Este es un email de prueba.',
    html: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'x-tenant-domain': window.location.hostname,
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const headers = getAuthHeaders();

      const [settingsRes, featuresRes, profileRes] = await Promise.all([
        fetch('/api/settings', { headers }),
        fetch('/api/settings/features', { headers }),
        fetch('/api/auth/profile', { headers }),
      ]);

      if (
        settingsRes.status === 401 ||
        featuresRes.status === 401 ||
        profileRes.status === 401
      ) {
        router.push('/admin/login');
        return;
      }

      if (!settingsRes.ok) {
        throw new Error('Error al cargar configuración');
      }

      if (!featuresRes.ok) {
        throw new Error('Error al cargar feature flags');
      }

      if (!profileRes.ok) {
        throw new Error('Error al cargar perfil');
      }

      const [settingsData, featuresData, profileData] = await Promise.all([
        settingsRes.json(),
        featuresRes.json(),
        profileRes.json(),
      ]);

      setSettings(settingsData);
      setFeatures(featuresData);
      setProfile({
        name: profileData?.name || '',
        email: profileData?.email || '',
        role: profileData?.role || '',
      });
    } catch (err: any) {
      setSettings(null);
      setFeatures(null);
      setProfile(null);
      setError(err?.message || 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(
        `/api/settings`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) throw new Error('Error al guardar configuración');

      setSuccessMessage('Configuración guardada exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    if (!features) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(
        `/api/settings/features`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(features),
        }
      );

      if (!response.ok) throw new Error('Error al guardar feature flags');

      setSuccessMessage('Feature flags guardados exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
        }),
      });

      if (!response.ok) throw new Error('Error al guardar perfil');

      setSuccessMessage('Perfil actualizado');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError('Completa la contraseña actual y la nueva.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('La nueva contraseña no coincide.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) throw new Error('Error al cambiar contraseña');

      setSuccessMessage('Contraseña actualizada');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.to) {
      setError('Indica un email destino para la prueba.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/settings/notifications/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(testEmail),
      });

      if (!response.ok) throw new Error('Error al enviar email de prueba');

      setSuccessMessage('Email de prueba enviado');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (path: string[], value: any) => {
    if (!settings) return;

    const newSettings = { ...settings };
    let current: any = newSettings;

    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    setSettings(newSettings);
  };

  const updateFeatures = (path: string[], value: any) => {
    if (!features) return;

    const newFeatures = { ...features };
    let current: any = newFeatures;

    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    setFeatures(newFeatures);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando configuración...</div>
      </div>
    );
  }

  if (!settings || !features) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: No se pudo cargar la configuración</div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Usuario', icon: '👤' },
    { id: 'general', label: 'General', icon: '🏢' },
    { id: 'features', label: 'Características', icon: '⚡' },
    { id: 'booking', label: 'Reservas', icon: '📅' },
    { id: 'notifications', label: 'Notificaciones', icon: '📧' },
    { id: 'integrations', label: 'Integraciones', icon: '🔌' },
    { id: 'tax', label: 'Impuestos y Facturación', icon: '💰' },
    { id: 'policies', label: 'Políticas', icon: '📋' },
    { id: 'branding', label: 'Marca', icon: '🎨' },
    { id: 'seo', label: 'SEO', icon: '🔍' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="mt-2 text-gray-600">Gestiona la configuración y características de tu tenant</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && profile && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Perfil de Usuario</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol
                  </label>
                  <input
                    type="text"
                    value={profile.role}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Perfil'}
                </button>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Cambiar contraseña</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña actual
                      </label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nueva contraseña
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Actualizar contraseña'}
                  </button>
                </div>
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Información General</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Negocio
                  </label>
                  <input
                    type="text"
                    value={settings.general.businessName}
                    onChange={(e) => updateSettings(['general', 'businessName'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Negocio
                  </label>
                  <select
                    value={settings.general.businessType}
                    onChange={(e) => updateSettings(['general', 'businessType'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="museum">Museo</option>
                    <option value="event">Eventos</option>
                    <option value="restaurant">Restaurante</option>
                    <option value="service">Servicio</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={settings.general.contactEmail}
                    onChange={(e) => updateSettings(['general', 'contactEmail'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="tel"
                    value={settings.general.contactPhone || ''}
                    onChange={(e) => updateSettings(['general', 'contactPhone'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={settings.general.address || ''}
                    onChange={(e) => updateSettings(['general', 'address'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={settings.general.description || ''}
                    onChange={(e) => updateSettings(['general', 'description'], e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <h3 className="text-lg font-semibold mt-8 mb-4">Configuración Regional</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zona Horaria
                    </label>
                    <input
                      type="text"
                      value={settings.regional.timezone}
                      onChange={(e) => updateSettings(['regional', 'timezone'], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idioma
                    </label>
                    <input
                      type="text"
                      value={settings.regional.locale}
                      onChange={(e) => updateSettings(['regional', 'locale'], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Moneda
                    </label>
                    <input
                      type="text"
                      value={settings.regional.currency}
                      onChange={(e) => updateSettings(['regional', 'currency'], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Formato de Hora
                    </label>
                    <select
                      value={settings.regional.timeFormat}
                      onChange={(e) => updateSettings(['regional', 'timeFormat'], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="12h">12 horas</option>
                      <option value="24h">24 horas</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Características del Sistema</h2>

                {/* Bookings Features */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">📅 Reservas</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.bookings.enabled}
                        onChange={(e) => updateFeatures(['bookings', 'enabled'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Módulo de reservas habilitado</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.bookings.allowPublicCancellation}
                        onChange={(e) => updateFeatures(['bookings', 'allowPublicCancellation'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Permitir cancelación pública</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.bookings.requirePaymentOnBooking}
                        onChange={(e) => updateFeatures(['bookings', 'requirePaymentOnBooking'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Requerir pago al reservar</span>
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Días máximos de anticipación
                        </label>
                        <input
                          type="number"
                          value={features.bookings.maxAdvanceBookingDays}
                          onChange={(e) => updateFeatures(['bookings', 'maxAdvanceBookingDays'], parseInt(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Horas mínimas de anticipación
                        </label>
                        <input
                          type="number"
                          value={features.bookings.minAdvanceBookingHours}
                          onChange={(e) => updateFeatures(['bookings', 'minAdvanceBookingHours'], parseInt(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Check-in Features */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">✅ Check-in</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.checkIn.enabled}
                        onChange={(e) => updateFeatures(['checkIn', 'enabled'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Módulo de check-in habilitado</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.checkIn.requireQRCode}
                        onChange={(e) => updateFeatures(['checkIn', 'requireQRCode'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Requerir código QR</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.checkIn.allowManualCheckIn}
                        onChange={(e) => updateFeatures(['checkIn', 'allowManualCheckIn'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Permitir check-in manual</span>
                    </label>
                  </div>
                </div>

                {/* Payments Features */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">💳 Pagos</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.payments.enabled}
                        onChange={(e) => updateFeatures(['payments', 'enabled'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Módulo de pagos habilitado</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proveedor de pagos
                      </label>
                      <select
                        value={features.payments.provider}
                        onChange={(e) => updateFeatures(['payments', 'provider'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        disabled
                      >
                        <option value="redsys">Redsys</option>
                      </select>
                    </div>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.payments.requireDeposit}
                        onChange={(e) => updateFeatures(['payments', 'requireDeposit'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Requerir depósito</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Porcentaje de depósito
                      </label>
                      <input
                        type="number"
                        value={features.payments.depositPercentage}
                        onChange={(e) => updateFeatures(['payments', 'depositPercentage'], parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Notifications Features */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">🔔 Notificaciones</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.notifications.enabled}
                        onChange={(e) => updateFeatures(['notifications', 'enabled'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Notificaciones habilitadas</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.notifications.emailEnabled}
                        onChange={(e) => updateFeatures(['notifications', 'emailEnabled'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Notificaciones por email</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.notifications.smsEnabled}
                        onChange={(e) => updateFeatures(['notifications', 'smsEnabled'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Notificaciones por SMS</span>
                    </label>
                  </div>
                </div>

                {/* Analytics Features */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">📊 Analytics</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.analytics.enabled}
                        onChange={(e) => updateFeatures(['analytics', 'enabled'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Analytics habilitado</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={features.analytics.trackingEnabled}
                        onChange={(e) => updateFeatures(['analytics', 'trackingEnabled'], e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Tracking habilitado</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSaveFeatures}
                  disabled={saving}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Características'}
                </button>
              </div>
            )}

            {/* Booking Tab */}
            {activeTab === 'booking' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Configuración de Reservas</h2>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.booking.requireCustomerPhone}
                    onChange={(e) => updateSettings(['booking', 'requireCustomerPhone'], e.target.checked)}
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                  />
                  <span>Requerir teléfono del cliente</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.booking.requireCustomerAddress}
                    onChange={(e) => updateSettings(['booking', 'requireCustomerAddress'], e.target.checked)}
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                  />
                  <span>Requerir dirección del cliente</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamaño máximo de grupo
                  </label>
                  <input
                    type="number"
                    value={settings.booking.maxPartySize}
                    onChange={(e) => updateSettings(['booking', 'maxPartySize'], parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración predeterminada del slot (minutos)
                  </label>
                  <input
                    type="number"
                    value={settings.booking.defaultSlotDuration}
                    onChange={(e) => updateSettings(['booking', 'defaultSlotDuration'], parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prefijo del código de reserva
                  </label>
                  <input
                    type="text"
                    value={settings.booking.bookingCodePrefix}
                    onChange={(e) => updateSettings(['booking', 'bookingCodePrefix'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Configuración de Notificaciones</h2>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notifications.sendBookingConfirmation}
                    onChange={(e) => updateSettings(['notifications', 'sendBookingConfirmation'], e.target.checked)}
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                  />
                  <span>Enviar confirmación de reserva</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notifications.sendBookingReminder}
                    onChange={(e) => updateSettings(['notifications', 'sendBookingReminder'], e.target.checked)}
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                  />
                  <span>Enviar recordatorio de reserva</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas antes para enviar recordatorio
                  </label>
                  <input
                    type="number"
                    value={settings.notifications.reminderHoursBefore}
                    onChange={(e) => updateSettings(['notifications', 'reminderHoursBefore'], parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notifications.sendCancellationNotification}
                    onChange={(e) => updateSettings(['notifications', 'sendCancellationNotification'], e.target.checked)}
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                  />
                  <span>Enviar notificación de cancelación</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email remitente
                  </label>
                  <input
                    type="email"
                    value={settings.notifications.fromEmail || ''}
                    onChange={(e) => updateSettings(['notifications', 'fromEmail'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del remitente
                  </label>
                  <input
                    type="text"
                    value={settings.notifications.fromName || ''}
                    onChange={(e) => updateSettings(['notifications', 'fromName'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">SMTP</h3>

                  <label className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={!!settings.notifications.smtp?.enabled}
                      onChange={(e) => updateSettings(['notifications', 'smtp', 'enabled'], e.target.checked)}
                      className="mr-3 h-4 w-4 text-blue-600 rounded"
                    />
                    <span>SMTP habilitado</span>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Host
                      </label>
                      <input
                        type="text"
                        value={settings.notifications.smtp?.host || ''}
                        onChange={(e) => updateSettings(['notifications', 'smtp', 'host'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Puerto
                      </label>
                      <input
                        type="number"
                        value={settings.notifications.smtp?.port ?? 587}
                        onChange={(e) => updateSettings(['notifications', 'smtp', 'port'], parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Usuario
                      </label>
                      <input
                        type="text"
                        value={settings.notifications.smtp?.user || ''}
                        onChange={(e) => updateSettings(['notifications', 'smtp', 'user'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        value={settings.notifications.smtp?.pass || ''}
                        onChange={(e) => updateSettings(['notifications', 'smtp', 'pass'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <label className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      checked={!!settings.notifications.smtp?.secure}
                      onChange={(e) => updateSettings(['notifications', 'smtp', 'secure'], e.target.checked)}
                      className="mr-3 h-4 w-4 text-blue-600 rounded"
                    />
                    <span>Usar conexión segura (TLS)</span>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CC (separar por coma)
                      </label>
                      <input
                        type="text"
                        value={settings.notifications.smtp?.cc || ''}
                        onChange={(e) => updateSettings(['notifications', 'smtp', 'cc'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="cc1@dominio.com, cc2@dominio.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        BCC (separar por coma)
                      </label>
                      <input
                        type="text"
                        value={settings.notifications.smtp?.bcc || ''}
                        onChange={(e) => updateSettings(['notifications', 'smtp', 'bcc'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="bcc@dominio.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-lg font-medium">Plantillas básicas</h3>
                  <p className="text-sm text-gray-600">
                    Variables disponibles: {'{{name}}'}, {'{{code}}'}, {'{{date}}'}, {'{{time}}'}
                  </p>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">Confirmación</h4>
                    <input
                      type="text"
                      value={settings.notifications.templates?.bookingConfirmation?.subject || ''}
                      onChange={(e) =>
                        updateSettings(['notifications', 'templates', 'bookingConfirmation', 'subject'], e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Asunto"
                    />
                    <textarea
                      value={settings.notifications.templates?.bookingConfirmation?.body || ''}
                      onChange={(e) =>
                        updateSettings(['notifications', 'templates', 'bookingConfirmation', 'body'], e.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Mensaje"
                    />
                    <textarea
                      value={settings.notifications.templates?.bookingConfirmation?.html || ''}
                      onChange={(e) =>
                        updateSettings(['notifications', 'templates', 'bookingConfirmation', 'html'], e.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                      placeholder="HTML (opcional)"
                    />
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">Recordatorio</h4>
                    <input
                      type="text"
                      value={settings.notifications.templates?.bookingReminder?.subject || ''}
                      onChange={(e) =>
                        updateSettings(['notifications', 'templates', 'bookingReminder', 'subject'], e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Asunto"
                    />
                    <textarea
                      value={settings.notifications.templates?.bookingReminder?.body || ''}
                      onChange={(e) =>
                        updateSettings(['notifications', 'templates', 'bookingReminder', 'body'], e.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Mensaje"
                    />
                    <textarea
                      value={settings.notifications.templates?.bookingReminder?.html || ''}
                      onChange={(e) =>
                        updateSettings(['notifications', 'templates', 'bookingReminder', 'html'], e.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                      placeholder="HTML (opcional)"
                    />
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">Cancelación</h4>
                    <input
                      type="text"
                      value={settings.notifications.templates?.bookingCancellation?.subject || ''}
                      onChange={(e) =>
                        updateSettings(['notifications', 'templates', 'bookingCancellation', 'subject'], e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Asunto"
                    />
                    <textarea
                      value={settings.notifications.templates?.bookingCancellation?.body || ''}
                      onChange={(e) =>
                        updateSettings(['notifications', 'templates', 'bookingCancellation', 'body'], e.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Mensaje"
                    />
                    <textarea
                      value={settings.notifications.templates?.bookingCancellation?.html || ''}
                      onChange={(e) =>
                        updateSettings(['notifications', 'templates', 'bookingCancellation', 'html'], e.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                      placeholder="HTML (opcional)"
                    />
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-lg font-medium">Email de prueba</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destinatario
                      </label>
                      <input
                        type="email"
                        value={testEmail.to}
                        onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="destino@dominio.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Asunto
                      </label>
                      <input
                        type="text"
                        value={testEmail.subject}
                        onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <textarea
                    value={testEmail.body}
                    onChange={(e) => setTestEmail({ ...testEmail, body: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Mensaje (texto)"
                  />
                  <textarea
                    value={testEmail.html}
                    onChange={(e) => setTestEmail({ ...testEmail, html: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                    placeholder="HTML (opcional)"
                  />
                  <button
                    onClick={handleSendTestEmail}
                    disabled={saving}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? 'Enviando...' : 'Enviar prueba'}
                  </button>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Integraciones</h2>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">Stripe</h3>
                  <label className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={settings.integrations.stripeEnabled}
                      onChange={(e) => updateSettings(['integrations', 'stripeEnabled'], e.target.checked)}
                      className="mr-3 h-4 w-4 text-blue-600 rounded"
                    />
                    <span>Stripe habilitado</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clave pública de Stripe
                    </label>
                    <input
                      type="text"
                      value={settings.integrations.stripePublicKey || ''}
                      onChange={(e) => updateSettings(['integrations', 'stripePublicKey'], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="pk_..."
                    />
                  </div>
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">Google Analytics</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID de Google Analytics
                    </label>
                    <input
                      type="text"
                      value={settings.integrations.googleAnalyticsId || ''}
                      onChange={(e) => updateSettings(['integrations', 'googleAnalyticsId'], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Webhook Personalizado</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL del Webhook
                    </label>
                    <input
                      type="url"
                      value={settings.integrations.customWebhookUrl || ''}
                      onChange={(e) => updateSettings(['integrations', 'customWebhookUrl'], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}

            {/* Tax & Invoicing Tab */}
            {activeTab === 'tax' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Impuestos y Facturación</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    Configura los datos fiscales de tu empresa para generar facturas y documentos legales.
                  </p>
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">Información Fiscal</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre Legal del Negocio
                      </label>
                      <input
                        type="text"
                        value={settings.tax?.businessLegalName || ''}
                        onChange={(e) => updateSettings(['tax', 'businessLegalName'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre completo registrado"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Identificación Fiscal
                        </label>
                        <select
                          value={settings.tax?.taxIdType || 'VAT'}
                          onChange={(e) => updateSettings(['tax', 'taxIdType'], e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="VAT">VAT</option>
                          <option value="NIF">NIF</option>
                          <option value="CIF">CIF</option>
                          <option value="EIN">EIN</option>
                          <option value="OTHER">Otro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número de Identificación Fiscal
                        </label>
                        <input
                          type="text"
                          value={settings.tax?.taxId || ''}
                          onChange={(e) => updateSettings(['tax', 'taxId'], e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="A12345678"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tasa de Impuesto por Defecto (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={settings.tax?.taxRate || 0}
                          onChange={(e) => updateSettings(['tax', 'taxRate'], parseFloat(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex items-center pt-8">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.tax?.includeTaxInPrice || false}
                            onChange={(e) => updateSettings(['tax', 'includeTaxInPrice'], e.target.checked)}
                            className="mr-3 h-4 w-4 text-blue-600 rounded"
                          />
                          <span className="text-sm">Incluir impuesto en el precio</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">Configuración de Facturas</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prefijo de Factura
                        </label>
                        <input
                          type="text"
                          value={settings.tax?.invoicePrefix || 'INV'}
                          onChange={(e) => updateSettings(['tax', 'invoicePrefix'], e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="INV"
                        />
                        <p className="mt-1 text-xs text-gray-500">Ej: INV-0001, FAC-0001</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número Inicial de Factura
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={settings.tax?.invoiceNumberStart || 1}
                          onChange={(e) => updateSettings(['tax', 'invoiceNumberStart'], parseInt(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pie de Factura (opcional)
                      </label>
                      <textarea
                        value={settings.tax?.invoiceFooter || ''}
                        onChange={(e) => updateSettings(['tax', 'invoiceFooter'], e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Información adicional para aparecer al final de las facturas..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Información Bancaria (para facturas)</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la Cuenta Bancaria
                      </label>
                      <input
                        type="text"
                        value={settings.tax?.bankAccountName || ''}
                        onChange={(e) => updateSettings(['tax', 'bankAccountName'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre del titular"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Banco
                      </label>
                      <input
                        type="text"
                        value={settings.tax?.bankName || ''}
                        onChange={(e) => updateSettings(['tax', 'bankName'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre de la entidad bancaria"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          IBAN
                        </label>
                        <input
                          type="text"
                          value={settings.tax?.iban || ''}
                          onChange={(e) => updateSettings(['tax', 'iban'], e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="ES00 0000 0000 00 0000000000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SWIFT/BIC
                        </label>
                        <input
                          type="text"
                          value={settings.tax?.swiftBic || ''}
                          onChange={(e) => updateSettings(['tax', 'swiftBic'], e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="ABCDESMMXXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Cuenta (si no es IBAN)
                      </label>
                      <input
                        type="text"
                        value={settings.tax?.bankAccountNumber || ''}
                        onChange={(e) => updateSettings(['tax', 'bankAccountNumber'], e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Número de cuenta bancaria"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> Esta información aparecerá en las facturas generadas. Asegúrate de que todos los datos sean correctos y estén actualizados.
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}

            {/* Policies Tab */}
            {activeTab === 'policies' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Políticas del Negocio</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Política de Cancelación
                  </label>
                  <textarea
                    value={settings.policies.cancellationPolicy}
                    onChange={(e) => updateSettings(['policies', 'cancellationPolicy'], e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Política de Reembolso
                  </label>
                  <textarea
                    value={settings.policies.refundPolicy}
                    onChange={(e) => updateSettings(['policies', 'refundPolicy'], e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Términos y Condiciones
                  </label>
                  <textarea
                    value={settings.policies.termsAndConditions || ''}
                    onChange={(e) => updateSettings(['policies', 'termsAndConditions'], e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Política de Privacidad
                  </label>
                  <textarea
                    value={settings.policies.privacyPolicy || ''}
                    onChange={(e) => updateSettings(['policies', 'privacyPolicy'], e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aviso mínimo de reserva (horas)
                    </label>
                    <input
                      type="number"
                      value={settings.policies.minBookingNoticeHours}
                      onChange={(e) => updateSettings(['policies', 'minBookingNoticeHours'], parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Días máximos de anticipación
                    </label>
                    <input
                      type="number"
                      value={settings.policies.maxBookingAdvanceDays}
                      onChange={(e) => updateSettings(['policies', 'maxBookingAdvanceDays'], parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}

            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Marca e Identidad Visual</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL del Logo
                  </label>
                  <input
                    type="url"
                    value={settings.branding.logo || ''}
                    onChange={(e) => updateSettings(['branding', 'logo'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título del sitio
                  </label>
                  <input
                    type="text"
                    value={settings.branding.siteTitle || ''}
                    onChange={(e) => updateSettings(['branding', 'siteTitle'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Sistema de Reservas"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color Primario
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.branding.primaryColor}
                        onChange={(e) => updateSettings(['branding', 'primaryColor'], e.target.value)}
                        className="h-10 w-20"
                      />
                      <input
                        type="text"
                        value={settings.branding.primaryColor}
                        onChange={(e) => updateSettings(['branding', 'primaryColor'], e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color Secundario
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.branding.secondaryColor}
                        onChange={(e) => updateSettings(['branding', 'secondaryColor'], e.target.value)}
                        className="h-10 w-20"
                      />
                      <input
                        type="text"
                        value={settings.branding.secondaryColor}
                        onChange={(e) => updateSettings(['branding', 'secondaryColor'], e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color de Acento
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.branding.accentColor || '#3B82F6'}
                        onChange={(e) => updateSettings(['branding', 'accentColor'], e.target.value)}
                        className="h-10 w-20"
                      />
                      <input
                        type="text"
                        value={settings.branding.accentColor || ''}
                        onChange={(e) => updateSettings(['branding', 'accentColor'], e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuente primaria
                    </label>
                    <select
                      value={settings.branding.primaryFont || BRANDING_FONT_DEFAULTS.primary}
                      onChange={(e) => updateSettings(['branding', 'primaryFont'], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                      {BRANDING_FONTS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuente secundaria
                    </label>
                    <select
                      value={settings.branding.secondaryFont || BRANDING_FONT_DEFAULTS.secondary}
                      onChange={(e) => updateSettings(['branding', 'secondaryFont'], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                      {BRANDING_FONTS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSS Personalizado
                  </label>
                  <textarea
                    value={settings.branding.customCSS || ''}
                    onChange={(e) => updateSettings(['branding', 'customCSS'], e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder=".custom-class { ... }"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">SEO y Metadatos</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título Meta (SEO)
                  </label>
                  <input
                    type="text"
                    value={settings.seo.metaTitle || ''}
                    onChange={(e) => updateSettings(['seo', 'metaTitle'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Título para motores de búsqueda"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción Meta (SEO)
                  </label>
                  <textarea
                    value={settings.seo.metaDescription || ''}
                    onChange={(e) => updateSettings(['seo', 'metaDescription'], e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Descripción para motores de búsqueda"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagen OG (Open Graph)
                  </label>
                  <input
                    type="url"
                    value={settings.seo.ogImage || ''}
                    onChange={(e) => updateSettings(['seo', 'ogImage'], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://... (imagen para compartir en redes sociales)"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
