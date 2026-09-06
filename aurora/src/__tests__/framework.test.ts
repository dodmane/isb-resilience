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

  it('should have exactly 4 scenarios', () => {
    expect(SCENARIOS).toHaveLength(4);
  });

  it('should have unique scenario keys', () => {
    const keys = SCENARIOS.map((s) => s.key);
    expect(new Set(keys).size).toBe(4);
  });

  it('should cover all quadrants of the 2x2 matrix', () => {
    const combos = SCENARIOS.map((s) => `${s.aiDepth}-${s.macroDisruption}`);
    expect(combos).toContain('high-stable');
    expect(combos).toContain('high-disruptive');
    expect(combos).toContain('low-stable');
    expect(combos).toContain('low-disruptive');
  });
});
