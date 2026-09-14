import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAssessment, updateAssessment, addAuditEntry } from '@/lib/db/store';
import { generateScenarioNarratives } from '@/lib/llm/scenarios';

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

    const narratives = await generateScenarioNarratives(
      assessment.companyName,
      assessment.industry,
      assessment.companySize || 'medium',
      Boolean(assessment.useMockData)
    );

    updateAssessment(id, { scenarioNarratives: narratives });

    addAuditEntry({
      id: uuidv4(),
      assessmentId: id,
      action: 'scenario_narratives_generated',
      entityType: 'assessment',
      entityId: id,
      oldValue: null,
      newValue: { scenarioCount: Object.keys(narratives).length },
      reason: assessment.useMockData ? 'Scenario narratives generated via Mock Data' : 'Scenario narratives generated via LLM',
      actor: 'system',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ narratives });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scenario narrative generation failed' }, { status: 500 });
  }
}
