import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getEvidenceById, updateEvidence, addAuditEntry } from '@/lib/db/store';
import { type EvidenceStatus } from '@/types/evidence';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
  const { id: assessmentId, evidenceId } = await params;
  const evidence = getEvidenceById(evidenceId);

  if (!evidence || evidence.assessmentId !== assessmentId) {
    return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
  }

  const body = await request.json();
  const { status, rejectionReason } = body as {
    status?: EvidenceStatus;
    rejectionReason?: string;
  };

  if (status === 'rejected' && !rejectionReason?.trim()) {
    return NextResponse.json(
      { error: 'Rejection reason is required when rejecting evidence' },
      { status: 400 }
    );
  }

  const updates: Partial<typeof evidence> = {};
  if (status) updates.status = status;
  if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;

  const updated = updateEvidence(evidenceId, updates);

  addAuditEntry({
    id: uuidv4(),
    assessmentId,
    action: `evidence_${status}`,
    entityType: 'evidence',
    entityId: evidenceId,
    oldValue: { status: evidence.status },
    newValue: { status, rejectionReason },
    reason: rejectionReason || `Evidence ${status}`,
    actor: 'user',
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(updated);
}
