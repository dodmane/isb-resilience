import { NextRequest, NextResponse } from 'next/server';
import { getAuditTrail } from '@/lib/db/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trail = getAuditTrail(id);
  return NextResponse.json(trail);
}
