import { NextRequest } from 'next/server';
import { extendTask } from '@/lib/service-journey/extend-task';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return extendTask(req, (await params).id, 'INSPECTION');
}
