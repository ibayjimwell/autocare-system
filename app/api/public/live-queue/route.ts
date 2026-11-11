import { NextResponse } from 'next/server';
import { getPublicLiveQueue } from '@/lib/public-landing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Public, sanitized, no-auth live workshop feed. No user identifiers. */
export async function GET() {
  const feed = await getPublicLiveQueue(new Date(Date.now()));
  return NextResponse.json(feed, {
    status: feed.unavailable ? 503 : 200,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
