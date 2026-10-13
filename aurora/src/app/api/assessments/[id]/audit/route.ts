import { NextRequest, NextResponse } from 'next/server';
import { getAuditTrail } from '@/lib/db/repository';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trail = (await getAuditTrail(id));
  return NextResponse.json(trail);
}
