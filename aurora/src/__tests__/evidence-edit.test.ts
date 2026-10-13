import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { PATCH as patchEvidence } from '@/app/api/assessments/[id]/evidence/[evidenceId]/route';
import { createAssessment, createEvidence, deleteAssessment, getAuditTrail, getEvidenceById } from '@/lib/db/store';
import { type AssessmentStage } from '@/types/assessment';

describe('Evidence editing', () => {
  const assessmentId = uuidv4();
  const evidenceId = uuidv4();

  beforeAll(() => {
    const now = new Date().toISOString();
    createAssessment({
      id: assessmentId, companyName: 'Evidence Edit Test', companyDescription: '', industry: 'SaaS', companySize: 'small',
      dataSourceMode: 'public', currentStage: 1 as AssessmentStage, assessmentLens: 'SaaS/IT', scenarioNarratives: {},
      dimensionSelections: [], evidencePlan: [], createdAt: now, updatedAt: now,
    });
    createEvidence({
      id: evidenceId, assessmentId, claim: 'Original claim', extractedValue: '100', supportingExcerpt: 'Original excerpt',
      sourceTitle: 'Original report', publisher: 'Example Co', sourceUrl: 'https://example.com/old', sourceType: 'annual_report',
      publicationDate: '2025-01-01', retrievalTimestamp: now, pageNumber: null, dimensionKey: 'revenue_durability',
      subdivisionKey: null, urlResolved: true, status: 'accepted', rejectionReason: null, sourceOrigin: 'llm_research',
      isMock: false, createdAt: now,
    });
  });

  afterAll(() => { deleteAssessment(assessmentId); });

  function request(body: Record<string, unknown>) {
    return new NextRequest(`http://localhost/api/assessments/${assessmentId}/evidence/${evidenceId}`, {
      method: 'PATCH', body: JSON.stringify(body),
    });
  }

  const context = { params: Promise.resolve({ id: assessmentId, evidenceId }) };

  it('updates accepted evidence details and audits the change', async () => {
    const response = await patchEvidence(request({
      claim: 'Updated claim', extractedValue: '125', supportingExcerpt: 'Updated excerpt',
      sourceTitle: 'Updated report', publisher: 'Example Co', sourceUrl: 'https://example.com/new',
      sourceType: 'regulatory_filing', publicationDate: '2026-02-15', dimensionKey: 'liquidity_runway',
    }), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      claim: 'Updated claim', extractedValue: '125', sourceUrl: 'https://example.com/new',
      publicationDate: '2026-02-15', dimensionKey: 'liquidity_runway', subdivisionKey: null, status: 'accepted',
    });
    expect(getAuditTrail(assessmentId).at(-1)).toMatchObject({
      action: 'evidence_updated',
      oldValue: expect.objectContaining({ claim: 'Original claim', status: 'accepted' }),
      newValue: expect.objectContaining({ claim: 'Updated claim', sourceUrl: 'https://example.com/new' }),
    });
  });

  it('rejects invalid source URLs without changing evidence', async () => {
    const response = await patchEvidence(request({ sourceUrl: 'javascript:alert(1)' }), context);

    expect(response.status).toBe(400);
    expect(getEvidenceById(evidenceId)?.sourceUrl).toBe('https://example.com/new');
  });
});
