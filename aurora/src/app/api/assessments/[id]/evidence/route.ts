import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getEvidenceForAssessment,
  createEvidence,
  getAssessment,
} from '@/lib/db/store';
import { type Evidence, type EvidenceSourceType } from '@/types/evidence';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const evidence = getEvidenceForAssessment(id);
  return NextResponse.json(evidence);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  const sourceUrl = body.sourceUrl?.trim() || null;
  let urlResolved = false;
  if (sourceUrl) {
    try {
      const parsed = new URL(sourceUrl);
      urlResolved = ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      urlResolved = false;
    }
  }

  const evidence: Evidence = {
    id: uuidv4(),
    assessmentId: id,
    claim: body.claim || '',
    extractedValue: body.extractedValue || '',
    supportingExcerpt: body.supportingExcerpt || '',
    sourceTitle: body.sourceTitle || '',
    publisher: body.publisher || '',
    sourceUrl,
    sourceType: (body.sourceType as EvidenceSourceType) || 'other',
    publicationDate: body.publicationDate || null,
    retrievalTimestamp: now,
    pageNumber: body.pageNumber || null,
    dimensionKey: body.dimensionKey || '',
    subdivisionKey: body.subdivisionKey || null,
    urlResolved,
    status: 'proposed',
    rejectionReason: null,
    sourceOrigin: 'user_provided',
    isMock: false,
    createdAt: now,
  };

  createEvidence(evidence);
  return NextResponse.json(evidence, { status: 201 });
}
