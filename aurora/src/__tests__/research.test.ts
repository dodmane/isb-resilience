import { researchEvidence } from '@/lib/llm/research';
import { type EvidencePlanItem } from '@/types/assessment';

describe('Evidence Research', () => {
  const assessmentId = 'test-assessment-research';

  it('should generate evidence for Salesforce revenue_durability subdivisions', async () => {
    const plan: EvidencePlanItem[] = [
      {
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'retention_nrr',
        searchTargets: ['NRR percentage'],
        sourceTypes: ['annual_report'],
        notes: '',
      },
    ];

    const result = await researchEvidence(assessmentId, 'Salesforce', plan, []);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].dimensionKey).toBe('revenue_durability');
    expect(result.evidence[0].subdivisionKey).toBe('retention_nrr');
    expect(result.evidence[0].isMock).toBe(true);
    expect(result.evidence[0].status).toBe('proposed');
  });

  it('should generate evidence for DocuSign', async () => {
    const plan: EvidencePlanItem[] = [
      {
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'retention_nrr',
        searchTargets: ['NRR'],
        sourceTypes: ['annual_report'],
        notes: '',
      },
    ];

    const result = await researchEvidence(assessmentId, 'DocuSign', plan, []);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].sourceUrl).toBeTruthy();
    expect(result.evidence[0].urlResolved).toBe(true);
  });

  it('should generate generic mock evidence for unknown companies', async () => {
    const plan: EvidencePlanItem[] = [
      {
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'retention_nrr',
        searchTargets: [],
        sourceTypes: [],
        notes: '',
      },
    ];

    const result = await researchEvidence(assessmentId, 'Unknown Corp', plan, []);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].isMock).toBe(true);
    expect(result.evidence[0].sourceUrl).toBeNull();
    expect(result.evidence[0].urlResolved).toBe(false);
  });

  it('should not duplicate evidence that already exists', async () => {
    const plan: EvidencePlanItem[] = [
      {
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'retention_nrr',
        searchTargets: [],
        sourceTypes: [],
        notes: '',
      },
    ];

    const existingEvidence = [{
      id: 'existing-1',
      assessmentId,
      claim: 'Existing claim',
      extractedValue: '',
      supportingExcerpt: '',
      sourceTitle: '',
      publisher: '',
      sourceUrl: null,
      sourceType: 'other' as const,
      publicationDate: null,
      retrievalTimestamp: new Date().toISOString(),
      pageNumber: null,
      dimensionKey: 'revenue_durability',
      subdivisionKey: 'retention_nrr',
      urlResolved: false,
      status: 'accepted' as const,
      rejectionReason: null,
      sourceOrigin: 'user_provided' as const,
      isMock: false,
      createdAt: new Date().toISOString(),
    }];

    const result = await researchEvidence(assessmentId, 'Unknown Corp', plan, existingEvidence);
    expect(result.evidence.length).toBe(0);
  });

  it('should research rejected-evidence subdivisions again', async () => {
    const plan: EvidencePlanItem[] = [
      {
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'retention_nrr',
        searchTargets: [],
        sourceTypes: [],
        notes: '',
      },
    ];

    const existingEvidence = [{
      id: 'rejected-1',
      assessmentId,
      claim: 'Rejected claim',
      extractedValue: '',
      supportingExcerpt: '',
      sourceTitle: '',
      publisher: '',
      sourceUrl: null,
      sourceType: 'other' as const,
      publicationDate: null,
      retrievalTimestamp: new Date().toISOString(),
      pageNumber: null,
      dimensionKey: 'revenue_durability',
      subdivisionKey: 'retention_nrr',
      urlResolved: false,
      status: 'rejected' as const,
      rejectionReason: 'Not credible',
      sourceOrigin: 'llm_research' as const,
      isMock: true,
      createdAt: new Date().toISOString(),
    }];

    const result = await researchEvidence(assessmentId, 'Unknown Corp', plan, existingEvidence);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('should expand dimension-level plan to all subdivisions', async () => {
    const plan: EvidencePlanItem[] = [
      {
        dimensionKey: 'revenue_durability',
        subdivisionKey: null,
        searchTargets: [],
        sourceTypes: [],
        notes: '',
      },
    ];

    const result = await researchEvidence(assessmentId, 'Unknown Corp', plan, []);
    // Should have evidence for all 3 subdivisions
    expect(result.evidence.length).toBe(3);
    const subKeys = result.evidence.map(e => e.subdivisionKey);
    expect(subKeys).toContain('retention_nrr');
    expect(subKeys).toContain('pricing_power_mix');
    expect(subKeys).toContain('customer_concentration_demand');
  });

  it('should include search summary', async () => {
    const plan: EvidencePlanItem[] = [
      { dimensionKey: 'revenue_durability', subdivisionKey: null, searchTargets: [], sourceTypes: [], notes: '' },
    ];
    const result = await researchEvidence(assessmentId, 'TestCo', plan, []);
    expect(result.searchSummary).toContain('TestCo');
  });
});
