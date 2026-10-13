import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS, getAssessmentSubdivisions, getSubdivisionsForDimension } from '@/lib/framework/subdivisions';
import { SAAS_MATERIALITY } from '@/lib/framework/materiality';
import { summarizeDimension } from '@/lib/framework/scoring';
import { type SubdivisionScore } from '@/types/scoring';

describe('Subdivisions', () => {
  it('should have exactly 3 subdivisions for every dimension', () => {
    for (const dim of DIMENSIONS) {
      const subs = SUBDIVISIONS[dim.key];
      expect(subs).toBeDefined();
      expect(subs).toHaveLength(3);
    }
  });

  it('should have 45 total subdivisions (15 × 3)', () => {
    const total = Object.values(SUBDIVISIONS).reduce((sum, subs) => sum + subs.length, 0);
    expect(total).toBe(45);
  });

  it('should have unique subdivision keys within each dimension', () => {
    for (const dim of DIMENSIONS) {
      const subs = SUBDIVISIONS[dim.key];
      const keys = subs.map(s => s.key);
      expect(new Set(keys).size).toBe(3);
    }
  });

  it('should have non-empty name and description for every subdivision', () => {
    for (const dim of DIMENSIONS) {
      for (const sub of SUBDIVISIONS[dim.key]) {
        expect(sub.name.length).toBeGreaterThan(0);
        expect(sub.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('should have evidence hints for every subdivision', () => {
    for (const dim of DIMENSIONS) {
      for (const sub of SUBDIVISIONS[dim.key]) {
        expect(sub.evidenceHints.length).toBeGreaterThan(0);
      }
    }
  });

  it('getSubdivisionsForDimension should return correct subdivisions', () => {
    const subs = getSubdivisionsForDimension('revenue_durability');
    expect(subs).toHaveLength(3);
    expect(subs[0].key).toBe('retention_nrr');
  });

  it('resolves custom, removed, and restored subdivisions per assessment', () => {
    const custom = [{ dimensionKey: 'revenue_durability' as const, key: 'custom_contract_quality', name: 'Contract Quality',
      description: 'Measures contract quality.', evidenceHints: ['contract terms'] }];
    const active = getAssessmentSubdivisions('revenue_durability', custom, ['revenue_durability:retention_nrr']);

    expect(active.map(item => item.key)).toEqual(['pricing_power_mix', 'customer_concentration_demand', 'custom_contract_quality']);
    expect(getAssessmentSubdivisions('revenue_durability', custom)).toHaveLength(4);
  });

  it('includes custom subdivisions in dimension scoring and excludes removed ones', () => {
    const subScores: SubdivisionScore[] = [
      { id: 'one', assessmentId: 'a', dimensionKey: 'revenue_durability', subdivisionKey: 'pricing_power_mix',
        maturityLevel: 3, position: 'Mid', normalizedScore: 63, confidence: 'medium', status: 'scored', rationale: '',
        overrideReason: null, evidenceIds: ['e1'], isMockRecommendation: false, createdAt: '', updatedAt: '' },
      { id: 'two', assessmentId: 'a', dimensionKey: 'revenue_durability', subdivisionKey: 'custom_contract_quality',
        maturityLevel: 2, position: 'High', normalizedScore: 47, confidence: 'medium', status: 'scored', rationale: '',
        overrideReason: null, evidenceIds: ['e2'], isMockRecommendation: false, createdAt: '', updatedAt: '' },
      { id: 'removed', assessmentId: 'a', dimensionKey: 'revenue_durability', subdivisionKey: 'retention_nrr',
        maturityLevel: 4, position: 'High', normalizedScore: 97, confidence: 'high', status: 'scored', rationale: '',
        overrideReason: null, evidenceIds: ['e3'], isMockRecommendation: false, createdAt: '', updatedAt: '' },
    ];
    const active = getAssessmentSubdivisions('revenue_durability', [
      { dimensionKey: 'revenue_durability', key: 'custom_contract_quality', name: 'Contract Quality',
        description: 'Measures contract quality.', evidenceHints: [] },
    ], ['revenue_durability:retention_nrr']);

    expect(summarizeDimension('revenue_durability', subScores, active)).toMatchObject({
      totalCount: 3,
      scoredCount: 2,
      normalizedScore: 55,
    });
  });
});

describe('SaaS/IT Materiality', () => {
  it('should have materiality info for all 15 dimensions', () => {
    for (const dim of DIMENSIONS) {
      const mat = SAAS_MATERIALITY[dim.key];
      expect(mat).toBeDefined();
      expect(mat.saasRelevance.length).toBeGreaterThan(50);
    }
  });

  it('should have company-size-specific notes', () => {
    for (const dim of DIMENSIONS) {
      const mat = SAAS_MATERIALITY[dim.key];
      expect(mat.smallCompanyNote.length).toBeGreaterThan(0);
      expect(mat.largeCompanyNote.length).toBeGreaterThan(0);
    }
  });

  it('should have a boolean defaultSelected for each dimension', () => {
    for (const dim of DIMENSIONS) {
      expect(typeof SAAS_MATERIALITY[dim.key].defaultSelected).toBe('boolean');
    }
  });

  it('should default-select at least 10 dimensions for deep assessment', () => {
    const defaultSelected = Object.values(SAAS_MATERIALITY).filter(m => m.defaultSelected);
    expect(defaultSelected.length).toBeGreaterThanOrEqual(10);
  });
});
