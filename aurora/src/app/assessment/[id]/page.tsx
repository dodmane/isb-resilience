'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
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
import { type Assessment, type StageApproval } from '@/types/assessment';
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

  async function toggleMockData() {
    if (!assessment) return;
    const updatedMock = !assessment.useMockData;
    await fetch(`/api/assessments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useMockData: updatedMock }),
    });
    await fetchData();
  }

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

  return (
    <div className="min-h-screen bg-background">
      <header className="aurora-gradient text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-white hover:text-white/80 transition-colors">
            AURORA
          </Link>
          <span className="text-white/40">|</span>
          <span className="font-medium text-white/90">{assessment.companyName}</span>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleMockData}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 font-medium ${
                assessment.useMockData
                  ? 'bg-amber-400/20 text-amber-200 border-amber-400/40 hover:bg-amber-400/30'
                  : 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-400/30'
              }`}
              title="Click to toggle between LLM API and Mock Data mode"
            >
              <span className={`w-2 h-2 rounded-full ${assessment.useMockData ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {assessment.useMockData ? 'Mock Data: ON' : 'LLM API: ON (Default)'}
            </button>
            <span className="text-xs text-white/50">{assessment.assessmentLens}</span>
          </div>
        </div>
      </header>
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto">
          <WorkflowStepper currentStage={assessment.currentStage} approvals={approvals} />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {assessment.currentStage === 1 && (
          <CompanyDiscoveryStage
            assessment={assessment}
            approvals={approvals}
            evidence={evidence}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {assessment.currentStage === 2 && (
          <ScenarioContextStage
            assessment={assessment}
            approvals={approvals}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {assessment.currentStage === 3 && (
          <DimensionScreeningStage
            assessment={assessment}
            approvals={approvals}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {assessment.currentStage === 4 && (
          <EvidencePlanStage
            assessment={assessment}
            approvals={approvals}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {assessment.currentStage === 5 && (
          <EvidenceGatheringStage
            assessment={assessment}
            approvals={approvals}
            evidence={evidence}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {assessment.currentStage === 6 && (
          <SubdivisionScoringStage
            assessment={assessment}
            approvals={approvals}
            evidence={evidence}
            subdivisionScores={subdivisionScores}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {assessment.currentStage === 7 && (
          <DimensionScoringStage
            assessment={assessment}
            approvals={approvals}
            subdivisionScores={subdivisionScores}
            dimensionScores={dimensionScores}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {assessment.currentStage === 8 && (
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
        {assessment.currentStage === 9 && (
          <ResilienceGapsStage
            assessment={assessment}
            approvals={approvals}
            resilienceGaps={resilienceGaps}
            evidence={evidence}
            auditTrail={auditTrail}
            onRefresh={fetchData}
          />
        )}
        {assessment.currentStage === 10 && (
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
