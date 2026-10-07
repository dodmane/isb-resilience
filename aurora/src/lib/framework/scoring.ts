import { type MaturityLevel } from '@/types/assessment';
import { type SubdivisionScore } from '@/types/scoring';
import { SUBDIVISIONS } from './subdivisions';
import { DIMENSIONS, type DimensionKey } from './dimensions';
import { validPolicy, type ScoringPolicy } from './criteria';

export const MATURITY_LABELS: Record<MaturityLevel, string> = {
  1: 'Basic / Not Met',
  2: 'Developing / Partially Met',
  3: 'Established / Mostly Met',
  4: 'Advanced / Fully Met',
};

export const NORMALIZATION_RANGES: Record<MaturityLevel, [number, number]> = {
  1: [0, 25],
  2: [26, 50],
  3: [51, 75],
  4: [76, 100],
};

export type ScoringPosition = 'Low' | 'Mid' | 'High';
export const POSITION_POINTS: Record<ScoringPosition, number> = { Low: 3, Mid: 12, High: 21 };
export const COVERAGE_RULES = { minimumSubdimensions: 2, biasTolerance: 1 };
export const EVALUATION_POLICY = {
  criticalDimensions: ['revenue_durability', 'liquidity_runway', 'operational_continuity', 'technology_ai_cyber'],
};

export function isScoringPosition(value: unknown): value is ScoringPosition {
  return value === 'Low' || value === 'Mid' || value === 'High';
}

export function subdivisionNumericScore(score: SubdivisionScore | undefined): number | null {
  if (!score || !['scored', 'overridden'].includes(score.status)) return null;
  if (score.scoreOverride != null) {
    return score.status === 'overridden' && score.overrideReason?.trim() &&
      Number.isInteger(score.scoreOverride) && (score.scoreOverride <= 2 || score.scoreOverride >= 98) &&
      scoreToMaturity(score.scoreOverride) !== null ? score.scoreOverride : null;
  }
  return score.maturityLevel && isScoringPosition(score.position) ? normalize(score.maturityLevel, score.position) : null;
}

export function summarizeDimension(dimensionKey: string, scores: SubdivisionScore[]) {
  return calculateDimensionScore((SUBDIVISIONS[dimensionKey as DimensionKey] || []).map((sub) =>
    subdivisionNumericScore(scores.find((score) => score.dimensionKey === dimensionKey && score.subdivisionKey === sub.key))
  ));
}

export function summarizeAssessment(scores: SubdivisionScore[]) {
  const dimensions = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension.key, summarizeDimension(dimension.key, scores)]));
  const scoredCount = Object.values(dimensions).reduce((sum, dimension) => sum + dimension.scoredCount, 0);
  const totalCount = Object.values(dimensions).reduce((sum, dimension) => sum + dimension.totalCount, 0);
  const composite = calculateComposite(Object.values(dimensions));
  const blockers: string[] = [];
  if (composite.normalizedScore === null) blockers.push('No dimensions meet the minimum sub-dimension coverage');
  if (scores.some(score => score.status === 'needs_review' || score.status === 'stale')) blockers.push('Pending or stale sub-dimension ratings');
  if (scores.some(score => score.scoreOverride != null)) blockers.push('Endpoint exceptions require a separate non-comparative evaluation');
  const absoluteDimensions = DIMENSIONS.map(dimension => calculateDimensionScore(SUBDIVISIONS[dimension.key].map(sub => {
    const score = scores.find(item => item.dimensionKey === dimension.key && item.subdivisionKey === sub.key);
    return score && subdivisionNumericScore(score) !== null ? score.absoluteScore ?? null : null;
  })));
  const criticalWeaknesses = EVALUATION_POLICY.criticalDimensions.filter(key => dimensions[key].maturityLevel !== null && dimensions[key].maturityLevel! < 3);
  return { dimensions, composite, scoredCount, totalCount, absoluteComposite: calculateComposite(absoluteDimensions),
    readiness: { status: blockers.length ? 'not_ready' : 'review_ready', blockers, criticalWeaknesses, validationStatus: 'provisional_not_empirically_validated' },
    coveragePercent: totalCount ? scoredCount / totalCount * 100 : 0 };
}

export function normalize(maturityLevel: MaturityLevel, position: ScoringPosition): number {
  return NORMALIZATION_RANGES[maturityLevel][0] + POSITION_POINTS[position];
}

export function scoreToMaturity(score: number | null): MaturityLevel | null {
  if (score === null || !Number.isFinite(score) || score < 0 || score > 100) return null;
  if (score >= 76) return 4;
  if (score >= 51) return 3;
  if (score >= 26) return 2;
  return 1;
}

function average(scores: number[]): number | null {
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}

export function calculateDimensionScore(scores: (number | null)[], minimum = COVERAGE_RULES.minimumSubdimensions) {
  const scored = scores.filter((score): score is number => scoreToMaturity(score) !== null);
  const normalizedScore = scored.length >= minimum ? average(scored) : null;
  return {
    normalizedScore,
    maturityLevel: scoreToMaturity(normalizedScore),
    scoredCount: scored.length,
    totalCount: scores.length,
    evidenceStatus: scored.length === 0 ? 'None' : scored.length < minimum ? 'Insufficient' : scored.length === scores.length ? 'Full' : 'Partial',
  };
}

export function calculateDimensionMaturity(subdivisionLevels: (MaturityLevel | null)[]): MaturityLevel | null {
  return calculateDimensionScore(subdivisionLevels.map((level) => level === null ? null : normalize(level, 'Mid'))).maturityLevel;
}

export function calculateComposite(dimensions: ReturnType<typeof calculateDimensionScore>[]) {
  const qualifying = dimensions.filter((dimension) => dimension.normalizedScore !== null);
  const normalizedScore = average(qualifying.map((dimension) => dimension.normalizedScore!));
  const fullEvidenceScore = average(qualifying.filter((dimension) => dimension.evidenceStatus === 'Full').map((dimension) => dimension.normalizedScore!));
  const biasDelta = normalizedScore !== null && fullEvidenceScore !== null ? normalizedScore - fullEvidenceScore : null;
  return {
    normalizedScore,
    maturityLevel: scoreToMaturity(normalizedScore),
    qualifyingCount: qualifying.length,
    status: normalizedScore === null ? 'insufficient_coverage' : 'scored',
    fullEvidenceScore,
    biasDelta,
    biasFlag: biasDelta === null ? 'unavailable' : Math.abs(biasDelta) <= COVERAGE_RULES.biasTolerance ? 'within_tolerance' : biasDelta > 0 ? 'possibly_overstated' : 'possibly_understated',
  };
}

export function calculateLikeForLike(first: Record<string, ReturnType<typeof calculateDimensionScore>>, second: Record<string, ReturnType<typeof calculateDimensionScore>>) {
  const shared = Object.keys(first).filter((key) => first[key].normalizedScore !== null && second[key]?.normalizedScore != null);
  return {
    dimensionKeys: shared,
    first: calculateComposite(shared.map((key) => first[key])),
    second: calculateComposite(shared.map((key) => second[key])),
  };
}

export function calculateEvidenceMatchedComparison(first: SubdivisionScore[], second: SubdivisionScore[], firstPolicy?: ScoringPolicy, secondPolicy?: ScoringPolicy) {
  const policiesMatch = validPolicy(firstPolicy) && validPolicy(secondPolicy) && firstPolicy.profile === secondPolicy.profile &&
    firstPolicy.periodStart === secondPolicy.periodStart && firstPolicy.periodEnd === secondPolicy.periodEnd;
  const directWithoutPolicies = !firstPolicy && !secondPolicy;
  const compatible = policiesMatch || directWithoutPolicies;
  const firstDimensions: Record<string, ReturnType<typeof calculateDimensionScore>> = {};
  const secondDimensions: Record<string, ReturnType<typeof calculateDimensionScore>> = {};
  let matchedCount = 0;
  if (compatible) for (const dimension of DIMENSIONS) {
    const matches = SUBDIVISIONS[dimension.key].map(sub => {
      const firstScore = first.find(item => item.dimensionKey === dimension.key && item.subdivisionKey === sub.key);
      const secondScore = second.find(item => item.dimensionKey === dimension.key && item.subdivisionKey === sub.key);
      return [subdivisionNumericScore(firstScore), subdivisionNumericScore(secondScore)];
    }).filter(pair => pair[0] !== null && pair[1] !== null);
    if (matches.length >= COVERAGE_RULES.minimumSubdimensions) {
      matchedCount += matches.length;
      firstDimensions[dimension.key] = calculateDimensionScore(matches.map(pair => pair[0]));
      secondDimensions[dimension.key] = calculateDimensionScore(matches.map(pair => pair[1]));
    }
  }
  const result = calculateLikeForLike(firstDimensions, secondDimensions);
  const ready = compatible && result.dimensionKeys.length > 0 &&
    ![...first, ...second].some(score => score.scoreOverride != null);
  const reason = !compatible ? 'Comparison requires the same rubric, operating profile and reporting window' :
    !ready ? 'Comparison requires at least one shared qualifying dimension and no endpoint exceptions' :
      directWithoutPolicies ? 'Matched sub-dimensions. Reporting periods are not recorded; verify that the evidence covers comparable periods.' :
        'Matched sub-dimensions and reporting periods';
  return { ...result, compatible, periodsComparable: policiesMatch, matchedCount, ready, reason,
    first: ready ? result.first : calculateComposite([]), second: ready ? result.second : calculateComposite([]) };
}
