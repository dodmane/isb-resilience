import { normalize, scoreToMaturity, calculateDimensionScore, calculateComposite, calculateLikeForLike, subdivisionNumericScore, summarizeDimension, summarizeAssessment } from '@/lib/framework/scoring';
import { type MaturityLevel } from '@/types/assessment';
import { type SubdivisionScore } from '@/types/scoring';

function rating(updates: Partial<SubdivisionScore> = {}): SubdivisionScore {
  return { id: 'rating', assessmentId: 'assessment', dimensionKey: 'liquidity_runway', subdivisionKey: 'cash_generation_buffers',
    maturityLevel: 3, position: 'Mid', normalizedScore: 63, confidence: 'high', status: 'scored', rationale: 'Evidence',
    overrideReason: null, evidenceIds: ['evidence'], isMockRecommendation: false, createdAt: '', updatedAt: '', ...updates };
}

describe('Workbook scoring', () => {
  it.each([[1, 3, 12, 21], [2, 29, 38, 47], [3, 54, 63, 72], [4, 79, 88, 97]])('scores all positions at level %s', (level, low, mid, high) => {
    expect(normalize(level as MaturityLevel, 'Low')).toBe(low);
    expect(normalize(level as MaturityLevel, 'Mid')).toBe(mid);
    expect(normalize(level as MaturityLevel, 'High')).toBe(high);
  });
  it.each([[0, 1], [25.9, 1], [26, 2], [50.9, 2], [51, 3], [75.9, 3], [76, 4], [100, 4]])('looks up score %s using band minima', (score, level) => {
    expect(scoreToMaturity(score)).toBe(level);
  });
  it('matches the liquidity example without rounding intermediate scores', () => {
    expect(calculateDimensionScore([63, 47, 38]).normalizedScore).toBeCloseTo(49.333333);
    expect(calculateDimensionScore([63, 47, 38]).maturityLevel).toBe(2);
    expect(calculateDimensionScore([63, 47, null]).normalizedScore).toBe(55);
    expect(calculateDimensionScore([63, 47, null]).evidenceStatus).toBe('Partial');
  });
  it('excludes insufficient evidence and accepts genuine zero override scores', () => {
    expect(calculateDimensionScore([63, null, null]).normalizedScore).toBeNull();
    expect(calculateDimensionScore([null, null, null]).evidenceStatus).toBe('None');
    expect(calculateDimensionScore([0, 12, null]).normalizedScore).toBe(6);
    expect(calculateDimensionScore([NaN, Infinity, 101]).normalizedScore).toBeNull();
  });
  it('calculates a composite from any qualifying dimensions and weights them equally', () => {
    const full = calculateDimensionScore([63, 63, 63]);
    const partial = calculateDimensionScore([47, 47, null]);
    expect(calculateComposite([]).normalizedScore).toBeNull();
    expect(calculateComposite([full]).normalizedScore).toBe(63);
    expect(calculateComposite(Array(11).fill(full)).normalizedScore).toBe(63);
    expect(calculateComposite([...Array(11).fill(full), partial]).normalizedScore).toBeCloseTo(61.666667);
    expect(calculateComposite([...Array(11).fill(full), partial]).biasFlag).toBe('possibly_understated');
    expect(calculateComposite(Array(12).fill(partial)).biasFlag).toBe('unavailable');
  });
  it('compares any shared qualifying dimensions without imposing a minimum count', () => {
    const full = calculateDimensionScore([63, 63, 63]);
    const first = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`dimension-${index}`, full]));
    const second = { ...first, 'dimension-0': calculateDimensionScore([null, null, null]) };
    expect(calculateLikeForLike(first, second).dimensionKeys).toHaveLength(11);
    expect(calculateLikeForLike(first, second).first.normalizedScore).toBe(63);
  });
  it('counts omitted rows as missing and excludes unknown subdivision keys', () => {
    const result = summarizeDimension('liquidity_runway', [rating(), rating({ subdivisionKey: 'unknown' })]);
    expect(result.totalCount).toBe(3);
    expect(result.scoredCount).toBe(1);
    expect(result.normalizedScore).toBeNull();
    expect(summarizeAssessment([rating()]).totalCount).toBe(45);
    expect(summarizeAssessment([rating()]).coveragePercent).toBeCloseTo(100 / 45);
  });
  it('does not silently assign a position to legacy ratings', () => {
    expect(subdivisionNumericScore(rating({ position: undefined, normalizedScore: 78 }))).toBeNull();
    expect(subdivisionNumericScore(rating({ position: null }))).toBeNull();
    expect(subdivisionNumericScore(rating({ status: 'insufficient_evidence' }))).toBeNull();
  });
  it('requires a reason for reserved endpoint overrides', () => {
    expect(subdivisionNumericScore(rating({ status: 'overridden', scoreOverride: 0, overrideReason: 'Documented absence' }))).toBe(0);
    expect(subdivisionNumericScore(rating({ status: 'overridden', scoreOverride: 100, overrideReason: 'Exceptional audited capability' }))).toBe(100);
    expect(subdivisionNumericScore(rating({ status: 'overridden', scoreOverride: 100 }))).toBeNull();
    expect(subdivisionNumericScore(rating({ status: 'overridden', scoreOverride: 50, overrideReason: 'Invalid override' }))).toBeNull();
  });
  it('uses a strict greater-than-one bias tolerance and reports overstated results', () => {
    const full = calculateDimensionScore([54, 54, 54]);
    const atTolerance = calculateDimensionScore([66, 66, null]);
    const aboveTolerance = calculateDimensionScore([72, 72, null]);
    expect(calculateComposite([...Array(11).fill(full), atTolerance]).biasFlag).toBe('within_tolerance');
    expect(calculateComposite([...Array(11).fill(full), aboveTolerance]).biasFlag).toBe('possibly_overstated');
  });
  it('returns two independent like-for-like averages for twelve shared dimensions', () => {
    const first = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`dimension-${index}`, calculateDimensionScore([63, 63, 63])]));
    const second = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`dimension-${index}`, calculateDimensionScore([38, 38, null])]));
    expect(calculateLikeForLike(first, second).first.normalizedScore).toBe(63);
    expect(calculateLikeForLike(first, second).second.normalizedScore).toBe(38);
  });
});