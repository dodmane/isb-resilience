'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { getPreviousStage, getNextStage } from '@/lib/workflow/stages';
import { CompanyDiscoveryStage } from './stages/CompanyDiscoveryStage';
import { ScenarioContextStage } from './stages/ScenarioContextStage';
import { DimensionScreeningStage } from './stages/DimensionScreeningStage';
import { EvidencePlanStage } from './stages/EvidencePlanStage';
import { EvidenceGatheringStage } from './stages/EvidenceGatheringStage';
import { SubdivisionScoringStage } from './stages/SubdivisionScoringStage';
import { DimensionScoringStage } from './stages/DimensionScoringStage';
import { ScenarioStressTestStage } from './stages/ScenarioStressTestStage';
import { ResilienceGapsStage } from './stages/ResilienceGapsStage';
import { FinalDashboardStage } from './stages/FinalDashboardStage';
import { STAGE_LABELS, type Assessment, type AssessmentStage, type StageApproval } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { type AuditEntry } from '@/types/audit';
import { type SubdivisionScore, type DimensionScore } from '@/types/scoring';
import { type ScenarioAssessment } from '@/types/scenario';
import { type ResilienceGap } from '@/types/resilience';

export default function AssessmentPage() {
  const params = useParams();
  const id = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [approvals, setApprovals] = useState<StageApproval[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [subdivisionScores, setSubdivisionScores] = useState<SubdivisionScore[]>([]);
  const [dimensionScores, setDimensionScores] = useState<DimensionScore[]>([]);
  const [scenarioAssessments, setScenarioAssessments] = useState<ScenarioAssessment[]>([]);
  const [resilienceGaps, setResilienceGaps] = useState<ResilienceGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageView, setStageView] = useState<{ assessmentId: string; stage: AssessmentStage } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [assessRes, evidenceRes, auditRes, subScoresRes, dimScoresRes, scenarioRes, gapsRes] = await Promise.all([
        fetch(`/api/assessments/${id}`),
        fetch(`/api/assessments/${id}/evidence`),
        fetch(`/api/assessments/${id}/audit`),
        fetch(`/api/assessments/${id}/subdivision-scores`),
        fetch(`/api/assessments/${id}/dimension-scores`),
        fetch(`/api/assessments/${id}/scenario-assessments`),
        fetch(`/api/assessments/${id}/resilience-gaps`),
      ]);
      const assessData = await assessRes.json();
      setAssessment(assessData.assessment);
      setApprovals(assessData.approvals);
      setEvidence(await evidenceRes.json());
      setAuditTrail(await auditRes.json());
      setSubdivisionScores(await subScoresRes.json());
      setDimensionScores(await dimScoresRes.json());
      setScenarioAssessments(await scenarioRes.json());
      setResilienceGaps(await gapsRes.json());
    } catch (err) {
      console.error('Failed to load assessment:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [fetchData]);

  if (loading || !assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full aurora-gradient-subtle mb-3 animate-pulse">
            <div className="w-5 h-5 rounded-full aurora-gradient" />
          </div>
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  const viewedStage = stageView?.assessmentId === id && stageView.stage <= assessment.currentStage
    ? stageView.stage : assessment.currentStage;
  const previousStage = getPreviousStage(viewedStage);
  const nextStage = getNextStage(viewedStage);

  function viewStage(stage: AssessmentStage) {
    if (!assessment || stage > assessment.currentStage) return;
    setStageView(stage === assessment.currentStage ? null : { assessmentId: id, stage });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="aurora-gradient text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-white hover:text-white/80 transition-colors">
            AURORA
          </Link>
          <span className="text-white/40">|</span>
          <span className="font-medium text-white/90">{assessment.companyName}</span>
          <span className="ml-auto text-xs text-white/50">{assessment.assessmentLens}</span>
        </div>
      </header>
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto">
          <WorkflowStepper currentStage={assessment.currentStage} viewedStage={viewedStage}
            approvals={approvals} onStageClick={viewStage} />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <nav aria-label="Stage navigation" className="mb-6 flex flex-wrap items-center justify-between gap-2">
          {previousStage ? (
            <Button variant="outline" onClick={() => viewStage(previousStage)} title={`Back to ${STAGE_LABELS[previousStage]}`}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <Link href="/" className="inline-flex items-center gap-2 text-sm hover:underline">
              <ArrowLeft className="h-4 w-4" /> Assessments
            </Link>
          )}
          {viewedStage < assessment.currentStage && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => viewStage(assessment.currentStage)}>
                <RotateCcw className="h-4 w-4" /> Return to Current Stage
              </Button>
              {nextStage && nextStage <= assessment.currentStage && (
                <Button variant="outline" onClick={() => viewStage(nextStage)} title={`Next: ${STAGE_LABELS[nextStage]}`}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </nav>
        {viewedStage === 1 && (
          <CompanyDiscoveryStage
            assessment={assessment}
            approvals={approvals}
            evidence={evidence}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {viewedStage === 2 && (
          <ScenarioContextStage
            assessment={assessment}
            approvals={approvals}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {viewedStage === 3 && (
          <DimensionScreeningStage
            assessment={assessment}
            approvals={approvals}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {viewedStage === 4 && (
          <EvidencePlanStage
            assessment={assessment}
            approvals={approvals}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {viewedStage === 5 && (
          <EvidenceGatheringStage
            assessment={assessment}
            approvals={approvals}
            evidence={evidence}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {viewedStage === 6 && (
          <SubdivisionScoringStage
            assessment={assessment}
            approvals={approvals}
            evidence={evidence}
            subdivisionScores={subdivisionScores}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {viewedStage === 7 && (
          <DimensionScoringStage
            assessment={assessment}
            approvals={approvals}
            subdivisionScores={subdivisionScores}
            dimensionScores={dimensionScores}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {viewedStage === 8 && (
          <ScenarioStressTestStage
            assessment={assessment}
            approvals={approvals}
            dimensionScores={dimensionScores}
            scenarioAssessments={scenarioAssessments}
            evidence={evidence}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {viewedStage === 9 && (
          <ResilienceGapsStage
            assessment={assessment}
            approvals={approvals}
            resilienceGaps={resilienceGaps}
            evidence={evidence}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {viewedStage === 10 && (
          <FinalDashboardStage
            assessment={assessment}
            approvals={approvals}
            evidence={evidence}
            subdivisionScores={subdivisionScores}
            dimensionScores={dimensionScores}
            scenarioAssessments={scenarioAssessments}
            resilienceGaps={resilienceGaps}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
      </main>
    </div>
  );
}
