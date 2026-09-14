import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SCENARIOS } from '@/lib/framework/scenarios';

describe('Framework Constants', () => {
  it('should have exactly 15 dimensions', () => {
    expect(DIMENSIONS).toHaveLength(15);
  });

  it('should have unique dimension keys', () => {
    const keys = DIMENSIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(15);
  });

  it('should have sequential numbering 1–15', () => {
    DIMENSIONS.forEach((d, i) => {
      expect(d.number).toBe(i + 1);
    });
  });

  it('should have exactly 6 shock injection vectors', () => {
    expect(SCENARIOS).toHaveLength(6);
  });

  it('should have unique scenario keys', () => {
    const keys = SCENARIOS.map((s) => s.key);
    expect(new Set(keys).size).toBe(6);
  });

  it('should include AI Disruption & Commodity Shock vector', () => {
    const keys = SCENARIOS.map((s) => s.key);
    expect(keys).toContain('ai_disruption_commodity');
  });
});
