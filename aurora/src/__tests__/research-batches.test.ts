jest.mock('@/lib/llm/client', () => ({
  isLLMConfigured: jest.fn(() => true),
  callLLMJSON: jest.fn(),
}));

import { callLLMJSON } from '@/lib/llm/client';
import { researchEvidence } from '@/lib/llm/research';
import { type EvidencePlanItem } from '@/types/assessment';

describe('incremental evidence research', () => {
  beforeEach(() => jest.clearAllMocks());

  it('emits each sub-dimension result to persistence as soon as it is parsed', async () => {
    (callLLMJSON as jest.Mock).mockResolvedValue([
      { subdivisionKey: 'retention_nrr', claim: 'NRR is 104%', extractedValue: '104%', supportingExcerpt: 'NRR 104%',
        sourceTitle: 'FY2026 10-K', publisher: 'Example Co', sourceUrl: 'https://example.com/2026', sourceType: 'regulatory_filing', publicationDate: '2026-02-01' },
      { subdivisionKey: 'pricing_power_mix', claim: 'Revenue grew 8%', extractedValue: '8%', supportingExcerpt: 'Revenue grew 8%',
        sourceTitle: 'FY2026 10-K', publisher: 'Example Co', sourceUrl: 'https://example.com/2026', sourceType: 'regulatory_filing', publicationDate: '2026-02-01' },
    ]);
    const plan: EvidencePlanItem[] = [
      { dimensionKey: 'revenue_durability', subdivisionKey: 'retention_nrr', searchTargets: ['NRR'], sourceTypes: ['regulatory_filing'], notes: '' },
      { dimensionKey: 'revenue_durability', subdivisionKey: 'pricing_power_mix', searchTargets: ['growth'], sourceTypes: ['regulatory_filing'], notes: '' },
    ];
    const persistedBatches: string[][] = [];

    const result = await researchEvidence('assessment-1', 'Example Co', plan, [], undefined, async batch => {
      persistedBatches.push(batch.map(item => item.subdivisionKey || 'general'));
    });

    expect(result.evidence).toHaveLength(2);
    expect(persistedBatches).toEqual([['retention_nrr'], ['pricing_power_mix']]);
  });
});
