import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAssessment, updateAssessment, addAuditEntry } from '@/lib/db/repository';
import { generateScenarioNarratives } from '@/lib/llm/scenarios';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = (await getAssessment(id));
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  const narratives = await generateScenarioNarratives(
    assessment.companyName,
    assessment.industry,
    assessment.companySize || 'medium'
  );

  (await updateAssessment(id, { scenarioNarratives: narratives }));

  (await addAuditEntry({
    id: uuidv4(),
    assessmentId: id,
    action: 'scenario_narratives_generated',
    entityType: 'assessment',
    entityId: id,
    oldValue: null,
    newValue: { scenarioCount: Object.keys(narratives).length },
    reason: 'Scenario narratives generated via mock AI',
    actor: 'system',
    timestamp: new Date().toISOString(),
  }));

  return NextResponse.json({ narratives });
}
