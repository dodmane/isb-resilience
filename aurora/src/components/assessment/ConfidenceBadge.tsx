'use client';

import { Badge } from '@/components/ui/badge';
import { type Confidence } from '@/types/assessment';

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

interface ConfidenceBadgeProps {
  confidence: Confidence;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <Badge className={`text-xs uppercase ${CONFIDENCE_COLORS[confidence]}`}>
      {confidence}
    </Badge>
  );
}
