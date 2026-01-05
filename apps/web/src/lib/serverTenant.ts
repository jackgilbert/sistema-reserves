import { headers } from 'next/headers';

export function getServerTenantDomain(): string {
  const h = headers();
  const explicit = h.get('x-tenant-domain');
  const host = explicit || h.get('host') || '';
  const domain = host.split(':')[0];
  return domain || 'localhost';
}
