import { recommendSubdivisionScore, assessConfidence, aggregateConfidence } from '@/lib/llm/scoring-recommendation';
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

    it('should score when accepted evidence exists', () => {
      const evidence = [makeEvidence()];
      const result = recommendSubdivisionScore('revenue_durability', 'retention_nrr', evidence);
      expect(result.maturityLevel).not.toBeNull();
      expect(result.status).toBe('scored');
      expect([1, 2, 3, 4]).toContain(result.maturityLevel);
    });

    it('should score higher with more and better evidence', () => {
      const weak = [makeEvidence({ sourceType: 'other', sourceUrl: null, urlResolved: false })];
      const strong = [
        makeEvidence(),
        makeEvidence({ id: 'ev-2' }),
        makeEvidence({ id: 'ev-3' }),
      ];

      const weakResult = recommendSubdivisionScore('d', 's', weak);
      const strongResult = recommendSubdivisionScore('d', 's', strong);

      expect(strongResult.maturityLevel!).toBeGreaterThanOrEqual(weakResult.maturityLevel!);
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
