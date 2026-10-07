import { normalize, calculateDimensionMaturity, MATURITY_LABELS, NORMALIZATION_RANGES } from '@/lib/framework/scoring';
import { type MaturityLevel } from '@/types/assessment';

describe('Scoring Engine', () => {
  describe('normalize', () => {
    it('should add Mid position points to the Level 1 minimum', () => {
      const result = normalize(1, 'Mid');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(25);
      expect(result).toBe(12);
    });

    it('should add Mid position points to the Level 4 minimum', () => {
      const result = normalize(4, 'Mid');
      expect(result).toBeGreaterThanOrEqual(76);
      expect(result).toBeLessThanOrEqual(100);
      expect(result).toBe(88);
    });

    it('should return values within defined ranges for all levels', () => {
      for (const level of [1, 2, 3, 4] as MaturityLevel[]) {
        const result = normalize(level, 'Mid');
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

    it('should look up the band of Mid-position numeric averages', () => {
      expect(calculateDimensionMaturity([1, 2, 2])).toBe(2);
    });

    it('should handle partial scoring', () => {
      expect(calculateDimensionMaturity([3, null, 4])).toBe(3);
    });

    it('should exclude dimensions with only one scored subdivision', () => {
      expect(calculateDimensionMaturity([2, null, null])).toBeNull();
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
