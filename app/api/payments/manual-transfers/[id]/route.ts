import { NextResponse } from 'next/server';

// This retired verification route is intentionally non-functional.
// Historic submissions and transactions remain stored in the database.
export async function PATCH() {
  return NextResponse.json({ error: true, errorMessage: 'Manual electronic-transfer verification has been retired. Use Cash or PayPal.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
