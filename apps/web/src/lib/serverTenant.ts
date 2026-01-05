/**
 * Get tenant domain from server-side headers
 * Uses dynamic import to avoid bundling next/headers in client code
 */
export async function getServerTenantDomain(): Promise<string> {
  try {
    // Dynamic import to avoid issues with client-side code
    const { headers } = await import('next/headers');
    const h = headers();
    const explicit = h.get('x-tenant-domain');
    const host = explicit || h.get('host') || '';
    const domain = host.split(':')[0];
    return domain || 'localhost';
  } catch (error) {
    // Fallback for client-side or when headers unavailable
    return 'localhost';
  }
}
