import { NextResponse } from 'next/server';

// Retired endpoint: the former counter QR was a check-in, not a payment.
// Preserve an explicit 410 response for older clients instead of accepting scans.
export async function POST() {
  return NextResponse.json({
    error: true,
    errorMessage: 'Cash QR check-in has been retired. Please pay directly at the cashier or use QR Ph on your Final Cost.',
  }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
export async function GET() {
  return NextResponse.json({
    error: true,
    errorMessage: 'Cash QR check-in has been retired.',
  }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
