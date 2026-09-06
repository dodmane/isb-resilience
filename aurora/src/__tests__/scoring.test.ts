import { normalize, calculateDimensionMaturity, MATURITY_LABELS, NORMALIZATION_RANGES } from '@/lib/framework/scoring';
import { type MaturityLevel } from '@/types/assessment';

describe('Scoring Engine', () => {
  describe('normalize', () => {
    it('should return midpoint of Level 1 range', () => {
      const result = normalize(1);
      expect(result).toBeGreaterThanOrEqual(25);
      expect(result).toBeLessThanOrEqual(40);
      expect(result).toBe(33);
    });

    it('should return midpoint of Level 4 range', () => {
      const result = normalize(4);
      expect(result).toBeGreaterThanOrEqual(90);
      expect(result).toBeLessThanOrEqual(100);
      expect(result).toBe(95);
    });

    it('should return values within defined ranges for all levels', () => {
      for (const level of [1, 2, 3, 4] as MaturityLevel[]) {
        const result = normalize(level);
        const [low, high] = NORMALIZATION_RANGES[level];
        expect(result).toBeGreaterThanOrEqual(low);
        expect(result).toBeLessThanOrEqual(high);
      }
    });
  });

  describe('calculateDimensionMaturity', () => {
    it('should return null when no subdivisions are scored', () => {
      expect(calculateDimensionMaturity([null, null, null])).toBeNull();
    });

    it('should average subdivision scores', () => {
      expect(calculateDimensionMaturity([2, 3, 3])).toBe(3);
    });

    it('should round to nearest integer', () => {
      expect(calculateDimensionMaturity([1, 2, 2])).toBe(2);
    });

    it('should handle partial scoring', () => {
      expect(calculateDimensionMaturity([3, null, 4])).toBe(4);
    });

    it('should return the single score when only one is provided', () => {
      expect(calculateDimensionMaturity([2, null, null])).toBe(2);
    });
  });

  describe('constants', () => {
    it('should have labels for all maturity levels', () => {
      expect(Object.keys(MATURITY_LABELS)).toHaveLength(4);
    });

    it('should have normalization ranges for all levels', () => {
      expect(Object.keys(NORMALIZATION_RANGES)).toHaveLength(4);
    });
  });
});
