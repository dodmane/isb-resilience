import { recommendSubdivisionScore, recommendSubdivisionScoreAsync, assessConfidence, aggregateConfidence } from '@/lib/llm/scoring-recommendation';
import { recommendSubdivisionRatingAsync } from '@/lib/llm/rating-recommendation';
import { type ScoringPolicy } from '@/lib/framework/criteria';
import { type Evidence } from '@/types/evidence';

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: 'ev-1',
    assessmentId: 'a-1',
    claim: 'Test claim',
    extractedValue: 'value',
    supportingExcerpt: 'excerpt',
    sourceTitle: 'Source',
    publisher: 'Pub',
    sourceUrl: 'https://example.com',
    sourceType: 'annual_report',
    publicationDate: '2024-01-01',
    retrievalTimestamp: new Date().toISOString(),
    pageNumber: null,
    dimensionKey: 'revenue_durability',
    subdivisionKey: 'retention_nrr',
    urlResolved: true,
    status: 'accepted',
    rejectionReason: null,
    sourceOrigin: 'llm_research',
    isMock: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Scoring Recommendation', () => {
  it('leaves a direct Level/Position rating unscored when accepted evidence is absent', async () => {
    const result = await recommendSubdivisionRatingAsync('revenue_durability', 'retention_nrr', []);

    expect(result.status).toBe('insufficient_evidence');
    expect(result.maturityLevel).toBeNull();
    expect(result.position).toBeNull();
    expect(result.evidenceIds).toEqual([]);
    expect(result.rationale).toContain('No accepted evidence');
  });

  describe('recommendSubdivisionScoreAsync', () => {
    it('returns all eight criteria for manual follow-up when accepted evidence is absent', async () => {
      const policy: ScoringPolicy = {
        rubricVersion: 'saas-criteria-1.0', profile: 'standard', reviewMode: 'llm_assisted',
        periodStart: '2025-01-01', periodEnd: '2025-12-31',
        approvedAt: '2026-01-01T00:00:00.000Z', approvalReason: 'Test policy',
      };
      const result = await recommendSubdivisionScoreAsync('revenue_durability', 'retention_nrr', [], policy);

      expect(result.criteria).toHaveLength(8);
      expect(result.criteria?.every(finding => finding.status === 'unknown')).toBe(true);
      expect(result.extractionIssue?.criterionIds).toHaveLength(8);
      expect(result.extractionIssue?.message).toContain('No accepted, non-mock evidence');
      expect(result.isFallback).toBe(true);
      expect(result.maturityLevel).toBeNull();
    });
  });

  describe('recommendSubdivisionScore', () => {
    it('should return NOT SCORED when no accepted evidence', () => {
      const result = recommendSubdivisionScore('revenue_durability', 'retention_nrr', []);
      expect(result.maturityLevel).toBeNull();
      expect(result.status).toBe('insufficient_evidence');
      expect(result.rationale).toContain('INSUFFICIENT EVIDENCE');
    });

    it('should return NOT SCORED when evidence is only proposed (not accepted)', () => {
      const evidence = [makeEvidence({ status: 'proposed' })];
      const result = recommendSubdivisionScore('revenue_durability', 'retention_nrr', evidence);
      expect(result.maturityLevel).toBeNull();
      expect(result.status).toBe('insufficient_evidence');
    });

    it('should return NOT SCORED when evidence is rejected', () => {
      const evidence = [makeEvidence({ status: 'rejected' })];
      const result = recommendSubdivisionScore('revenue_durability', 'retention_nrr', evidence);
      expect(result.maturityLevel).toBeNull();
      expect(result.status).toBe('insufficient_evidence');
    });

    it('should leave capability unscored when only fallback source-quality analysis is available', () => {
      const evidence = [makeEvidence()];
      const result = recommendSubdivisionScore('revenue_durability', 'retention_nrr', evidence);
      expect(result.maturityLevel).toBeNull();
      expect(result.position).toBeNull();
      expect(result.status).toBe('insufficient_evidence');
      expect(result.isFallback).toBe(true);
    });

    it('should not infer capability maturity from more or better sources', () => {
      const weak = [makeEvidence({ sourceType: 'other', sourceUrl: null, urlResolved: false })];
      const strong = [
        makeEvidence(),
        makeEvidence({ id: 'ev-2' }),
        makeEvidence({ id: 'ev-3' }),
      ];

      const weakResult = recommendSubdivisionScore('d', 's', weak);
      const strongResult = recommendSubdivisionScore('d', 's', strong);

      expect(strongResult.maturityLevel).toBeNull();
      expect(weakResult.maturityLevel).toBeNull();
    });

    it('should return maturity level between 1 and 4', () => {
      const evidence = [makeEvidence()];
      const result = recommendSubdivisionScore('d', 's', evidence);
      if (result.maturityLevel !== null) {
        expect(result.maturityLevel).toBeGreaterThanOrEqual(1);
        expect(result.maturityLevel).toBeLessThanOrEqual(4);
      }
    });

    it('should include rationale with source references', () => {
      const evidence = [makeEvidence({ sourceTitle: 'FY2024 10-K' })];
      const result = recommendSubdivisionScore('d', 's', evidence);
      expect(result.rationale).toContain('FY2024 10-K');
      expect(result.rationale).toContain('Heuristic');
    });
  });

  describe('assessConfidence', () => {
    it('should return low for no evidence', () => {
      expect(assessConfidence([])).toBe('low');
    });

    it('should return low for non-accepted evidence', () => {
      expect(assessConfidence([makeEvidence({ status: 'proposed' })])).toBe('low');
    });

    it('should return higher confidence with primary + recent + multiple sources', () => {
      const evidence = [
        makeEvidence({ sourceType: 'annual_report', publicationDate: new Date().toISOString() }),
        makeEvidence({ id: 'ev-2', sourceType: 'regulatory_filing', publicationDate: new Date().toISOString() }),
      ];
      const result = assessConfidence(evidence);
      expect(result).toBe('high');
    });
  });

  describe('aggregateConfidence', () => {
    it('should return low for empty array', () => {
      expect(aggregateConfidence([])).toBe('low');
    });

    it('should return high when all are high', () => {
      expect(aggregateConfidence(['high', 'high', 'high'])).toBe('high');
    });

    it('should return medium for mixed', () => {
      expect(aggregateConfidence(['high', 'low', 'medium'])).toBe('medium');
    });

    it('should return low when all are low', () => {
      expect(aggregateConfidence(['low', 'low', 'low'])).toBe('low');
    });
  });
});
