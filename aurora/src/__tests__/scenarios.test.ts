import { SCENARIOS } from '@/lib/framework/scenarios';
import { generateScenarioNarratives } from '@/lib/llm/scenarios';

describe('Scenario Narratives', () => {
  it('should generate narratives for all 4 scenarios', async () => {
    const narratives = await generateScenarioNarratives('TestCo', 'SaaS', 'medium');
    expect(Object.keys(narratives)).toHaveLength(4);
    for (const scenario of SCENARIOS) {
      expect(narratives[scenario.key]).toBeDefined();
      expect(narratives[scenario.key].length).toBeGreaterThan(50);
    }
  });

  it('should include company name in narratives', async () => {
    const narratives = await generateScenarioNarratives('Acme Corp', 'SaaS', 'small');
    for (const key of Object.keys(narratives)) {
      expect(narratives[key]).toContain('Acme Corp');
    }
  });

  it('should adapt narratives for company size', async () => {
    const smallNarr = await generateScenarioNarratives('TestCo', 'SaaS', 'small');
    const largeNarr = await generateScenarioNarratives('TestCo', 'SaaS', 'large');
    expect(smallNarr.autonomous_advantage).toContain('smaller company');
    expect(largeNarr.autonomous_advantage).toContain('large enterprise');
  });

  it('should mark narratives as mock AI', async () => {
    const narratives = await generateScenarioNarratives('TestCo', 'SaaS', 'medium');
    for (const text of Object.values(narratives)) {
      expect(text).toContain('MOCK AI');
    }
  });
});
