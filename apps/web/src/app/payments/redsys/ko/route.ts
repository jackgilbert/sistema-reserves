import { NextRequest, NextResponse } from 'next/server';

function tryExtractBookingCode(dsMerchantParameters: string | null): string | null {
  if (!dsMerchantParameters) return null;

  try {
    // application/x-www-form-urlencoded puede convertir '+' en espacios.
    const normalized = dsMerchantParameters.replace(/\s/g, '+');
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    const payload = JSON.parse(json) as any;

    const code = payload?.Ds_MerchantData;
    return typeof code === 'string' && code.trim() ? code.trim() : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const merchantParameters = form.get('Ds_MerchantParameters')?.toString() || null;

  const bookingCode = tryExtractBookingCode(merchantParameters);
  const target = bookingCode ? `/confirm/${encodeURIComponent(bookingCode)}` : '/';

  return NextResponse.redirect(new URL(target, req.url), 303);
}

export async function GET(req: NextRequest) {
  const merchantParameters = req.nextUrl.searchParams.get('Ds_MerchantParameters');
  const bookingCode = tryExtractBookingCode(merchantParameters);
  const target = bookingCode ? `/confirm/${encodeURIComponent(bookingCode)}` : '/';

  return NextResponse.redirect(new URL(target, req.url), 303);
}
