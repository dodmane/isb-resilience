import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAssessment, createEvidence, addAuditEntry } from '@/lib/db/store';
import { type Evidence, type EvidenceSourceType } from '@/types/evidence';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const dimensionKey = formData.get('dimensionKey') as string;
  const subdivisionKey = formData.get('subdivisionKey') as string | null;
  const claim = formData.get('claim') as string || '';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!dimensionKey) {
    return NextResponse.json({ error: 'dimensionKey is required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const evidence: Evidence = {
    id: uuidv4(),
    assessmentId: id,
    claim: claim || `Uploaded document: ${file.name}`,
    extractedValue: '',
    supportingExcerpt: `Evidence from uploaded document "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Manual review required.`,
    sourceTitle: file.name,
    publisher: 'Uploaded by user',
    sourceUrl: null,
    sourceType: 'uploaded_document' as EvidenceSourceType,
    publicationDate: null,
    retrievalTimestamp: now,
    pageNumber: null,
    dimensionKey,
    subdivisionKey: subdivisionKey || null,
    urlResolved: false,
    status: 'proposed',
    rejectionReason: null,
    sourceOrigin: 'user_uploaded',
    isMock: false,
    createdAt: now,
  };

  createEvidence(evidence);

  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'evidence_uploaded',
    entityType: 'evidence',
    entityId: evidence.id,
    oldValue: null,
    newValue: { filename: file.name, dimensionKey, subdivisionKey },
    reason: `Document uploaded: ${file.name}`,
    actor: 'user',
    timestamp: now,
  });

  return NextResponse.json(evidence, { status: 201 });
}
