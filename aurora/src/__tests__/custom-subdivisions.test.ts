import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { PUT as updateSubdivisions } from '@/app/api/assessments/[id]/subdivisions/route';
import { createAssessment, deleteAssessment, getAssessment } from '@/lib/db/store';
import { getAssessmentSubdivisions } from '@/lib/framework/subdivisions';
import { type AssessmentStage } from '@/types/assessment';

describe('Assessment custom subdivisions', () => {
  const assessmentId = uuidv4();

  beforeAll(() => {
    createAssessment({
      id: assessmentId, companyName: 'Custom Subdivision Test', companyDescription: '', industry: 'SaaS', companySize: 'small',
      dataSourceMode: 'public', currentStage: 4 as AssessmentStage, assessmentLens: 'SaaS/IT', scenarioNarratives: {},
      dimensionSelections: [{ dimensionKey: 'revenue_durability', selected: true, deepAssessment: true, relevanceRationale: '' }],
      evidencePlan: [
        { dimensionKey: 'revenue_durability', subdivisionKey: 'retention_nrr', searchTargets: [], sourceTypes: [], notes: '' },
        { dimensionKey: 'revenue_durability', subdivisionKey: 'pricing_power_mix', searchTargets: [], sourceTypes: [], notes: '' },
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  });

  afterAll(() => { deleteAssessment(assessmentId); });

  it('saves custom subdivisions, excludes framework items, and syncs the evidence plan', async () => {
    const request = new NextRequest(`http://localhost/api/assessments/${assessmentId}/subdivisions`, {
      method: 'PUT',
      body: JSON.stringify({
        customSubdivisions: [{ dimensionKey: 'revenue_durability', key: 'custom_contract_quality', name: 'Contract Quality',
          description: 'Measures renewal and contract protections.', evidenceHints: ['contract terms'] }],
        excludedSubdivisionKeys: ['revenue_durability:retention_nrr'],
      }),
    });
    const response = await updateSubdivisions(request, { params: Promise.resolve({ id: assessmentId }) });

    expect(response.status).toBe(200);
    const assessment = getAssessment(assessmentId)!;
    expect(getAssessmentSubdivisions('revenue_durability', assessment.customSubdivisions, assessment.excludedSubdivisionKeys)
      .map(item => item.key)).toEqual(['pricing_power_mix', 'customer_concentration_demand', 'custom_contract_quality']);
    expect(assessment.evidencePlan.map(item => item.subdivisionKey)).toEqual([
      'pricing_power_mix', 'custom_contract_quality',
    ]);
    expect(assessment.evidencePlan[1].searchTargets).toEqual(['contract terms']);
  });

  it('rejects custom subdivisions without a valid key or required description', async () => {
    const request = new NextRequest(`http://localhost/api/assessments/${assessmentId}/subdivisions`, {
      method: 'PUT',
      body: JSON.stringify({
        customSubdivisions: [{ dimensionKey: 'revenue_durability', key: 'bad key', name: 'Incomplete', description: '', evidenceHints: [] }],
        excludedSubdivisionKeys: [],
      }),
    });
    const response = await updateSubdivisions(request, { params: Promise.resolve({ id: assessmentId }) });

    expect(response.status).toBe(400);
  });
});