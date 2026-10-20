jest.mock('@/lib/db/repository', () => ({
  getAssessment: jest.fn(),
  getEvidenceForAssessment: jest.fn(),
  createEvidence: jest.fn(),
  addAuditEntry: jest.fn(),
}));

jest.mock('@/lib/llm/research', () => ({
  researchEvidence: jest.fn(),
}));

jest.mock('@/lib/framework/subdivisions', () => ({
  getAssessmentSubdivisionMap: jest.fn(() => ({})),
}));

import { NextRequest } from 'next/server';
import { POST as runResearch } from '@/app/api/assessments/[id]/research/route';
import { getAssessment, getEvidenceForAssessment } from '@/lib/db/repository';
import { researchEvidence } from '@/lib/llm/research';
import { type AssessmentStage } from '@/types/assessment';

describe('dimension-specific evidence research route', () => {
  const assessmentId = 'assessment-1';
  const plan = [
    { dimensionKey: 'revenue_durability', subdivisionKey: 'retention_nrr', searchTargets: ['NRR'], sourceTypes: ['annual_report'], notes: '' },
    { dimensionKey: 'liquidity_runway', subdivisionKey: 'cash_generation_buffers', searchTargets: ['cash'], sourceTypes: ['annual_report'], notes: '' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getAssessment as jest.Mock).mockResolvedValue({
      id: assessmentId, companyName: 'Example Co', currentStage: 5 as AssessmentStage,
      evidencePlan: plan,
      dimensionSelections: [
        { dimensionKey: 'revenue_durability', deepAssessment: true },
        { dimensionKey: 'liquidity_runway', deepAssessment: true },
      ],
      customSubdivisions: [], excludedSubdivisionKeys: [],
    });
    (getEvidenceForAssessment as jest.Mock).mockResolvedValue([]);
    (researchEvidence as jest.Mock).mockResolvedValue({ evidence: [], searchSummary: 'Live search completed.' });
  });

  it('passes only the selected dimension plan to the research service', async () => {
    const request = new NextRequest(`http://localhost/api/assessments/${assessmentId}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dimensionKey: 'liquidity_runway' }),
    });
    const response = await runResearch(request, { params: Promise.resolve({ id: assessmentId }) });

    expect(response.status).toBe(200);
    expect(researchEvidence).toHaveBeenCalledWith(
      assessmentId,
      'Example Co',
      [plan[1]],
      [],
      {},
      expect.any(Function),
    );
  });

  it('rejects requests for dimensions outside the deep assessment scope', async () => {
    const request = new NextRequest(`http://localhost/api/assessments/${assessmentId}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dimensionKey: 'opex_elasticity' }),
    });
    const response = await runResearch(request, { params: Promise.resolve({ id: assessmentId }) });

    expect(response.status).toBe(400);
    expect(researchEvidence).not.toHaveBeenCalled();
  });
});
