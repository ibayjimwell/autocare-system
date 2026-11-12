import { NextRequest, NextResponse } from 'next/server';
import { isValidUUID } from '@/utils/shared';

/** The HTTPS callback bridges to the Expo app; it NEVER marks bills paid. */
export function GET(req: NextRequest) {
  const billId = req.nextUrl.searchParams.get('billId') ?? '';
  if (!isValidUUID(billId)) return new NextResponse('Invalid AutoCare payment return.', { status: 400 });
  const destination = `autocare://invoice/${billId}?paymentReturn=1`;
  const escaped = destination.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta http-equiv="refresh" content="1;url=${escaped}"/><title>Return to AutoCare</title></head><body style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:70px auto;padding:24px;text-align:center;color:#222"><div style="font-size:40px">✓</div><h1>Return to AutoCare</h1><p>Open AutoCare to review your payment status and invoice.</p><p>Payment confirmation may take a moment.</p><a href="${escaped}" style="background:#C1272D;color:white;padding:14px 24px;border-radius:10px;display:inline-block;text-decoration:none;font-weight:600">Open AutoCare</a><script>setTimeout(function(){ window.location.href=${JSON.stringify(destination)}; },250);</script></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" } });
}
