import { SCENARIOS } from '@/lib/framework/scenarios';
import { generateScenarioNarratives } from '@/lib/llm/scenarios';

describe('Scenario Narratives', () => {
  it('should generate narratives for all 6 shock vectors in mock mode', async () => {
    const narratives = await generateScenarioNarratives('TestCo', 'SaaS', 'medium', true);
    expect(Object.keys(narratives)).toHaveLength(6);
    for (const scenario of SCENARIOS) {
      expect(narratives[scenario.key]).toBeDefined();
      expect(narratives[scenario.key].length).toBeGreaterThan(20);
    }
  });

  it('should include company name in narratives', async () => {
    const narratives = await generateScenarioNarratives('Acme Corp', 'SaaS', 'small', true);
    for (const key of Object.keys(narratives)) {
      expect(narratives[key]).toContain('Acme Corp');
    }
  });

  it('should adapt narratives for company size', async () => {
    const smallNarr = await generateScenarioNarratives('TestCo', 'SaaS', 'small', true);
    const largeNarr = await generateScenarioNarratives('TestCo', 'SaaS', 'large', true);
    expect(smallNarr.revenue_compression).toContain('As a smaller company');
    expect(largeNarr.revenue_compression).toContain('As a large enterprise');
  });

  it('should throw error when LLM is not configured and mock mode is false', async () => {
    await expect(generateScenarioNarratives('TestCo', 'SaaS', 'medium', false)).rejects.toThrow(
      'LLM API key is not configured'
    );
  });
});
