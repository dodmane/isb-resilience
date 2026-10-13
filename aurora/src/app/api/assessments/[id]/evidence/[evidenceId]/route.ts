import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAssessment, getEvidenceById, updateEvidence, addAuditEntry } from '@/lib/db/repository';
import { DIMENSIONS, type DimensionKey } from '@/lib/framework/dimensions';
import { getAssessmentSubdivisions } from '@/lib/framework/subdivisions';
import { type EvidenceSourceType, type EvidenceStatus } from '@/types/evidence';

const SOURCE_TYPES: EvidenceSourceType[] = [
  'annual_report', 'regulatory_filing', 'investor_relations', 'sustainability_report',
  'risk_disclosure', 'regulatory_publication', 'research', 'uploaded_document', 'other',
];

const EDITABLE_FIELDS = [
  'claim', 'extractedValue', 'supportingExcerpt', 'sourceTitle', 'publisher',
  'sourceUrl', 'sourceType', 'publicationDate', 'dimensionKey', 'subdivisionKey',
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
  const { id: assessmentId, evidenceId } = await params;
  const evidence = (await getEvidenceById(evidenceId));

  if (!evidence || evidence.assessmentId !== assessmentId) {
    return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
  }

  const body = await request.json();
  const { status, rejectionReason } = body as {
    status?: EvidenceStatus;
    rejectionReason?: string;
  };

  const assessment = (await getAssessment(assessmentId));
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

  if (status !== undefined && !['proposed', 'accepted', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid evidence status' }, { status: 400 });
  }

  if (status === 'rejected' && !rejectionReason?.trim()) {
    return NextResponse.json(
      { error: 'Rejection reason is required when rejecting evidence' },
      { status: 400 }
    );
  }

  const updates: Partial<typeof evidence> = {};
  const invalidField = (field: string) => NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
  for (const field of ['claim', 'extractedValue', 'supportingExcerpt', 'sourceTitle', 'publisher'] as const) {
    if (field in body) {
      if (typeof body[field] !== 'string' || (field === 'claim' && !body[field].trim())) return invalidField(field);
      updates[field] = field === 'claim' ? body[field].trim() : body[field];
    }
  }
  if ('sourceType' in body) {
    if (!SOURCE_TYPES.includes(body.sourceType)) return invalidField('source type');
    updates.sourceType = body.sourceType;
  }
  if ('publicationDate' in body) {
    if (body.publicationDate !== null && (typeof body.publicationDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.publicationDate) || !Number.isFinite(Date.parse(body.publicationDate)))) return invalidField('publication date');
    updates.publicationDate = body.publicationDate;
  }
  if ('sourceUrl' in body) {
    if (body.sourceUrl !== null && typeof body.sourceUrl !== 'string') return invalidField('source URL');
    const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
    if (sourceUrl) {
      try {
        const url = new URL(sourceUrl);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return invalidField('source URL');
      } catch {
        return invalidField('source URL');
      }
      updates.sourceUrl = sourceUrl;
      updates.urlResolved = true;
    } else {
      updates.sourceUrl = null;
      updates.urlResolved = false;
    }
  }
  if ('dimensionKey' in body) {
    if (!DIMENSIONS.some(dimension => dimension.key === body.dimensionKey)) return invalidField('dimension');
    updates.dimensionKey = body.dimensionKey as DimensionKey;
    if (!('subdivisionKey' in body)) updates.subdivisionKey = null;
  }
  if ('subdivisionKey' in body) {
    if (body.subdivisionKey !== null && (typeof body.subdivisionKey !== 'string' ||
      !getAssessmentSubdivisions(body.dimensionKey || evidence.dimensionKey as DimensionKey,
        assessment.customSubdivisions, assessment.excludedSubdivisionKeys).some(subdivision => subdivision.key === body.subdivisionKey))) {
      return invalidField('subdivision');
    }
    updates.subdivisionKey = body.subdivisionKey;
  }
  if (status) updates.status = status;
  if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;
  else if (status === 'accepted') updates.rejectionReason = null;

  const hasEdits = EDITABLE_FIELDS.some(field => field in body);
  if (!status && !hasEdits) return NextResponse.json({ error: 'Provide an evidence edit or status update' }, { status: 400 });

  const updated = (await updateEvidence(evidenceId, updates));

  const oldValue = Object.fromEntries(EDITABLE_FIELDS.map(field => [field, evidence[field]]).concat([['status', evidence.status]]));
  const newValue = Object.fromEntries(EDITABLE_FIELDS.map(field => [field, updated?.[field]]).concat([['status', updated?.status]]));
  if (rejectionReason !== undefined) newValue.rejectionReason = rejectionReason;

  (await addAuditEntry({
    id: uuidv4(),
    assessmentId,
    action: status ? `evidence_${status}` : 'evidence_updated',
    entityType: 'evidence',
    entityId: evidenceId,
    oldValue,
    newValue,
    reason: rejectionReason || (hasEdits ? 'Evidence details edited by reviewer' : `Evidence ${status}`),
    actor: 'user',
    timestamp: new Date().toISOString(),
  }));

  return NextResponse.json(updated);
}
