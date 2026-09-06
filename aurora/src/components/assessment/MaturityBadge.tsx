'use client';

import { Badge } from '@/components/ui/badge';
import { type MaturityLevel } from '@/types/assessment';
import { MATURITY_LABELS } from '@/lib/framework/scoring';

const MATURITY_COLORS: Record<MaturityLevel, string> = {
  1: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  2: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  3: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  4: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

interface MaturityBadgeProps {
  level: MaturityLevel | null;
}

export function MaturityBadge({ level }: MaturityBadgeProps) {
  if (level === null) {
    return (
      <Badge variant="outline" className="text-xs">
        Not Scored
      </Badge>
    );
  }

  return (
    <Badge className={`text-xs ${MATURITY_COLORS[level]}`}>
      Level {level}: {MATURITY_LABELS[level]}
    </Badge>
  );
}
