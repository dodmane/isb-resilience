import { type Evidence } from '@/types/evidence';

function publicationTime(publicationDate: string | null): number {
  if (!publicationDate || !/^\d{4}(?:-\d{2}-\d{2})?$/.test(publicationDate)) return Number.NEGATIVE_INFINITY;
  const normalizedDate = publicationDate.length === 4 ? `${publicationDate}-12-31` : publicationDate;
  const timestamp = Date.parse(normalizedDate);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function prioritizeLatestEvidence<T extends Pick<Evidence, 'publicationDate'>>(evidence: T[]): T[] {
  return [...evidence].sort((first, second) => publicationTime(second.publicationDate) - publicationTime(first.publicationDate));
}

export function latestDataPriorityInstruction(): string {
  const currentYear = new Date().getFullYear();
  return `Prioritize the latest available actual reporting or measurement year. Search in descending year order starting with ${currentYear}, then ${currentYear - 1}, ${currentYear - 2}, and earlier (for example, 2026 before 2025 before 2024). Use an older year only when newer reliable data is unavailable for that metric or when a comparison is needed to show a trend. Distinguish the reporting period from the source publication date, and never invent current-year data.`;
}