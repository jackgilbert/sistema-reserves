import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

function buildTargetUrl(req: NextRequest, pathParts: string[]) {
  const target = new URL(API_BASE);
  const joinedPath = '/uploads/' + pathParts.map(encodeURIComponent).join('/');
  target.pathname = joinedPath;
  target.search = req.nextUrl.search;
  return target;
}

function filterRequestHeaders(req: NextRequest): HeadersInit {
  const headers: Record<string, string> = {};

  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
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
    cache: 'no-store',
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx);
}
