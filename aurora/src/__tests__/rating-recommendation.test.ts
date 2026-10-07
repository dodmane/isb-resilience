jest.mock('@/lib/llm/client', () => ({
  isLLMConfigured: jest.fn(() => true),
  callLLMJSON: jest.fn(),
}));

import { callLLMJSON } from '@/lib/llm/client';
import { recommendSubdivisionRatingAsync } from '@/lib/llm/rating-recommendation';
import { type Evidence } from '@/types/evidence';

const evidence: Evidence = {
  id: 'accepted-nrr-evidence', assessmentId: 'assessment',
  claim: 'Net revenue retention was 105%.', extractedValue: '105%',
  supportingExcerpt: 'Net revenue retention was 105%.', sourceTitle: 'Annual report', publisher: 'Company',
  sourceUrl: 'https://example.com/report', sourceType: 'annual_report', publicationDate: '2026-03-01',
  retrievalTimestamp: '2026-03-02T00:00:00.000Z', pageNumber: null, dimensionKey: 'revenue_durability',
  subdivisionKey: 'retention_nrr', urlResolved: true, status: 'accepted', rejectionReason: null,
  sourceOrigin: 'user_provided', isMock: false, createdAt: '2026-03-02T00:00:00.000Z',
};

describe('direct Level/Position rating recommendations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a valid AI Level/Position suggestion and links its evidence', async () => {
    (callLLMJSON as jest.Mock).mockResolvedValue({
      maturityLevel: 3, position: 'Mid', confidence: 'medium',
      evidenceIds: [evidence.id], rationale: 'The cited NRR disclosure supports established retention.',
    });

    const result = await recommendSubdivisionRatingAsync('revenue_durability', 'retention_nrr', [evidence]);

    expect(result).toMatchObject({ maturityLevel: 3, position: 'Mid', status: 'scored', evidenceIds: [evidence.id] });
  });

  it('leaves an invalid suggestion unscored for manual entry', async () => {
    (callLLMJSON as jest.Mock).mockResolvedValue({
      maturityLevel: 3, position: 'Mid', confidence: 'medium',
      evidenceIds: ['not-an-accepted-evidence-id'], rationale: 'Unsupported citation.',
    });

    const result = await recommendSubdivisionRatingAsync('revenue_durability', 'retention_nrr', [evidence]);

    expect(result.status).toBe('insufficient_evidence');
    expect(result.maturityLevel).toBeNull();
    expect(result.position).toBeNull();
    expect(result.isFallback).toBe(true);
    expect(result.rationale).toContain('manually');
  });
});