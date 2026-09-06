'use client';

import { STAGE_LABELS, type AssessmentStage, type ApprovalStatus } from '@/types/assessment';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Lock } from 'lucide-react';

interface WorkflowStepperProps {
  currentStage: AssessmentStage;
  approvals: { stage: AssessmentStage; status: ApprovalStatus }[];
  onStageClick?: (stage: AssessmentStage) => void;
}

export function WorkflowStepper({ currentStage, approvals, onStageClick }: WorkflowStepperProps) {
  const stages = Object.entries(STAGE_LABELS).map(([key, label]) => {
    const stage = Number(key) as AssessmentStage;
    const approval = approvals.find((a) => a.stage === stage);
    const isApproved = approval?.status === 'approved';
    const isCurrent = stage === currentStage;
    const isAccessible = stage <= currentStage;
    const isLocked = stage > currentStage;

    return { stage, label, isApproved, isCurrent, isAccessible, isLocked };
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max px-4 py-3">
        {stages.map((s, i) => (
          <div key={s.stage} className="flex items-center">
            <button
              onClick={() => s.isAccessible && onStageClick?.(s.stage)}
              disabled={s.isLocked}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                s.isCurrent && 'bg-primary text-primary-foreground shadow-sm',
                s.isApproved && !s.isCurrent && 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
                s.isAccessible && !s.isCurrent && !s.isApproved && 'bg-muted text-muted-foreground hover:bg-accent hover:shadow-sm',
                s.isLocked && 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
              )}
            >
              {s.isApproved ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : s.isLocked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">{s.label}</span>
              <span className="lg:hidden">{s.stage}</span>
            </button>
            {i < stages.length - 1 && (
              <div className={cn('w-6 h-0.5 mx-1', s.isApproved ? 'bg-green-400' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
