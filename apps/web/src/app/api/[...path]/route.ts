import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

function buildTargetUrl(req: NextRequest, pathParts: string[]) {
  const target = new URL(API_BASE);
  const joinedPath = '/' + pathParts.map(encodeURIComponent).join('/');
  target.pathname = joinedPath;
  target.search = req.nextUrl.search;
  return target;
}

function filterRequestHeaders(req: NextRequest): HeadersInit {
  const headers: Record<string, string> = {};

  // Reenviar headers relevantes (auth, tenant, content-type, etc.).
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    // Estos headers no deben reenviarse tal cual.
    if (
      lower === 'host' ||
      lower === 'connection' ||
      lower === 'content-length' ||
      lower === 'accept-encoding'
    ) {
      return;
    }

    headers[key] = value;
  });

  return headers;
}

async function handle(req: NextRequest, ctx: { params: { path: string[] } }) {
  const targetUrl = buildTargetUrl(req, ctx.params.path);

  const method = req.method.toUpperCase();
  const headers = filterRequestHeaders(req);

  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

  const upstream = await fetch(targetUrl.toString(), {
    method,
    headers,
    body,
    // Evitar caché en dev
    cache: 'no-store',
  });

  const responseHeaders = new Headers(upstream.headers);
  // Asegurar que Next no intente comprimir/alterar por nosotros.
  responseHeaders.delete('content-encoding');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx);
}
