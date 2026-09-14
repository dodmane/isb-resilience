import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAssessment,
  getDimensionScores,
  getEvidenceForAssessment,
  getScenarioAssessments,
  upsertScenarioAssessment,
  addAuditEntry,
} from '@/lib/db/store';
import { SCENARIOS } from '@/lib/framework/scenarios';
import { type ScenarioKey } from '@/lib/framework/scenarios';
import { generateScenarioReasoningAsync } from '@/lib/llm/scenario-reasoning';
import { type ScenarioAssessment } from '@/types/scenario';
import { type MaturityLevel, type Confidence } from '@/types/assessment';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessments = getScenarioAssessments(id);
  return NextResponse.json(assessments);
}

// Generate scenario assessments for all dimension × scenario combinations
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assessment = getAssessment(id);
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const dimScores = getDimensionScores(id);
    const evidence = getEvidenceForAssessment(id);
    const existing = getScenarioAssessments(id);
    const now = new Date().toISOString();
    const results: ScenarioAssessment[] = [];

    for (const scenario of SCENARIOS) {
      for (const dimScore of dimScores) {
        // Skip if already user-approved
        const alreadyApproved = existing.find(
          e => e.scenarioKey === scenario.key && e.dimensionKey === dimScore.dimensionKey && e.userApproved
        );
        if (alreadyApproved) continue;

        const dimEvidence = evidence.filter(
          e => e.dimensionKey === dimScore.dimensionKey && e.status === 'accepted'
        );

        const reasoning = await generateScenarioReasoningAsync(
          scenario.key,
          dimScore.dimensionKey,
          dimScore,
          dimEvidence,
          Boolean(assessment.useMockData)
        );

        const sa: ScenarioAssessment = {
          id: uuidv4(),
          assessmentId: id,
          scenarioKey: scenario.key,
          dimensionKey: dimScore.dimensionKey,
          baseMaturity: dimScore.maturityLevel,
          scenarioMaturity: reasoning.scenarioMaturity,
          direction: reasoning.direction,
          rationale: reasoning.rationale,
          confidence: reasoning.confidence,
          relevantEvidenceIds: dimEvidence.map(e => e.id),
          userApproved: false,
          overrideReason: null,
          isMockRecommendation: reasoning.isMock,
          createdAt: now,
          updatedAt: now,
        };

        upsertScenarioAssessment(sa);
        results.push(sa);
      }
    }

    addAuditEntry({
      id: uuidv4(),
      assessmentId: id,
      action: 'scenario_assessments_generated',
      entityType: 'assessment',
      entityId: id,
      oldValue: null,
      newValue: { generatedCount: results.length, scenarios: SCENARIOS.map(s => s.key) },
      reason: assessment.useMockData ? 'Scenario stress-test assessments generated via Mock Data' : 'Scenario stress-test assessments generated via LLM',
      actor: 'system',
      timestamp: now,
    });

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scenario stress testing failed' }, { status: 500 });
  }
}

// Update a single scenario assessment (override or approve)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const {
    scenarioKey, dimensionKey, scenarioMaturity,
    overrideReason, userApproved, confidence,
  } = body as {
    scenarioKey: ScenarioKey;
    dimensionKey: string;
    scenarioMaturity?: MaturityLevel | null;
    overrideReason?: string;
    userApproved?: boolean;
    confidence?: Confidence;
  };

  if (!scenarioKey || !dimensionKey) {
    return NextResponse.json({ error: 'scenarioKey and dimensionKey required' }, { status: 400 });
  }

  // Override requires reason
  if (scenarioMaturity !== undefined && !overrideReason?.trim() && userApproved !== true) {
    return NextResponse.json({ error: 'Override reason required when changing scenario maturity' }, { status: 400 });
  }

  const existing = getScenarioAssessments(id);
  const current = existing.find(
    s => s.scenarioKey === scenarioKey && s.dimensionKey === dimensionKey
  );

  if (!current) {
    return NextResponse.json({ error: 'Scenario assessment not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updated: ScenarioAssessment = {
    ...current,
    scenarioMaturity: scenarioMaturity !== undefined ? scenarioMaturity : current.scenarioMaturity,
    overrideReason: overrideReason || current.overrideReason,
    userApproved: userApproved !== undefined ? userApproved : current.userApproved,
    confidence: confidence || current.confidence,
    direction: scenarioMaturity !== undefined && current.baseMaturity !== null
      ? (scenarioMaturity !== null && scenarioMaturity > current.baseMaturity ? 'strengthens'
        : scenarioMaturity !== null && scenarioMaturity < current.baseMaturity ? 'weakens' : 'stable')
      : current.direction,
    isMockRecommendation: scenarioMaturity !== undefined ? false : current.isMockRecommendation,
    updatedAt: now,
  };

  upsertScenarioAssessment(updated);

  const action = userApproved ? 'scenario_assessment_approved' : 'scenario_assessment_overridden';
  addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action,
    entityType: 'scenario_assessment',
    entityId: current.id,
    oldValue: { scenarioMaturity: current.scenarioMaturity, userApproved: current.userApproved },
    newValue: { scenarioMaturity: updated.scenarioMaturity, userApproved: updated.userApproved, overrideReason },
    reason: overrideReason || `Scenario assessment ${action}`,
    actor: 'user',
    timestamp: now,
  });

  return NextResponse.json(updated);
}
