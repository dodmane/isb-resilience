import { type MaturityLevel } from '@/types/assessment';

export const MATURITY_LABELS: Record<MaturityLevel, string> = {
  1: 'Basic / Not Met',
  2: 'Developing / Partially Met',
  3: 'Established / Mostly Met',
  4: 'Advanced / Fully Met',
};

export const NORMALIZATION_RANGES: Record<MaturityLevel, [number, number]> = {
  1: [25, 40],
  2: [50, 65],
  3: [70, 85],
  4: [90, 100],
};

export function normalize(maturityLevel: MaturityLevel): number {
  const [low, high] = NORMALIZATION_RANGES[maturityLevel];
  return Math.round((low + high) / 2);
}

export function calculateDimensionMaturity(
  subdivisionLevels: (MaturityLevel | null)[]
): MaturityLevel | null {
  const scored = subdivisionLevels.filter((l): l is MaturityLevel => l !== null);
  if (scored.length === 0) return null;
  const avg = scored.reduce((sum, l) => sum + l, 0) / scored.length;
  return Math.round(avg) as MaturityLevel;
}
