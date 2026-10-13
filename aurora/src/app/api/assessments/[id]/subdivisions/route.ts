import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAssessment, updateAssessment, addAuditEntry, invalidateApprovalsAfterStage } from '@/lib/db/repository';
import { DIMENSIONS, type DimensionKey } from '@/lib/framework/dimensions';
import { SUBDIVISIONS, getAssessmentSubdivisions, type AssessmentSubdivision } from '@/lib/framework/subdivisions';
import { type EvidencePlanItem } from '@/types/assessment';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = (await getAssessment(id));
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

  const body = await request.json();
  if (!Array.isArray(body.customSubdivisions) || !Array.isArray(body.excludedSubdivisionKeys)) {
    return NextResponse.json({ error: 'customSubdivisions and excludedSubdivisionKeys arrays are required' }, { status: 400 });
  }

  const dimensionKeys = new Set(DIMENSIONS.map(dimension => dimension.key));
  const deeplyAssessedDimensions = new Set((assessment.dimensionSelections || []).filter(selection => selection.deepAssessment)
    .map(selection => selection.dimensionKey));
  const normalizedCustom: AssessmentSubdivision[] = [];
  const customKeys = new Set<string>();
  for (const item of body.customSubdivisions) {
    if (!item || typeof item !== 'object' || !dimensionKeys.has(item.dimensionKey) || !deeplyAssessedDimensions.has(item.dimensionKey) ||
      typeof item.key !== 'string' || !/^custom_[a-z0-9_]+$/.test(item.key) ||
      typeof item.name !== 'string' || !item.name.trim() ||
      typeof item.description !== 'string' || !item.description.trim() ||
      !Array.isArray(item.evidenceHints) || item.evidenceHints.some((hint: unknown) => typeof hint !== 'string')) {
      return NextResponse.json({ error: 'Each custom sub-dimension requires a valid dimension, key, name, description, and evidence hints' }, { status: 400 });
    }
    const uniqueKey = `${item.dimensionKey}:${item.key}`;
    const conflictsWithFramework = (SUBDIVISIONS[item.dimensionKey as DimensionKey] || []).some(subdivision => subdivision.key === item.key);
    if (customKeys.has(uniqueKey) || conflictsWithFramework) {
      return NextResponse.json({ error: `Duplicate sub-dimension key: ${item.key}` }, { status: 400 });
    }
    customKeys.add(uniqueKey);
    normalizedCustom.push({
      dimensionKey: item.dimensionKey,
      key: item.key,
      name: item.name.trim(),
      description: item.description.trim(),
      evidenceHints: item.evidenceHints.map((hint: string) => hint.trim()).filter(Boolean),
    });
  }

  const excludedSubdivisionKeys: string[] = [...new Set<string>(body.excludedSubdivisionKeys.filter(
    (key: unknown): key is string => typeof key === 'string',
  ))];
  const knownKeys = new Set([
    ...DIMENSIONS.flatMap(dimension => (SUBDIVISIONS[dimension.key] || []).map(subdivision => `${dimension.key}:${subdivision.key}`)),
    ...normalizedCustom.map(subdivision => `${subdivision.dimensionKey}:${subdivision.key}`),
  ]);
  if (excludedSubdivisionKeys.some(key => !knownKeys.has(key))) {
    return NextResponse.json({ error: 'An excluded sub-dimension key is not part of this assessment' }, { status: 400 });
  }

  const previousActive = DIMENSIONS.flatMap(dimension => getAssessmentSubdivisions(
    dimension.key, assessment.customSubdivisions, assessment.excludedSubdivisionKeys,
  ).map(subdivision => `${dimension.key}:${subdivision.key}`));
  const nextActive = DIMENSIONS.flatMap(dimension => getAssessmentSubdivisions(
    dimension.key, normalizedCustom, excludedSubdivisionKeys,
  ).map(subdivision => `${dimension.key}:${subdivision.key}`));
  const addedKeys = nextActive.filter(key => !previousActive.includes(key));
  const activeSet = new Set(nextActive);
  const evidencePlan: EvidencePlanItem[] = (assessment.evidencePlan || []).filter(item =>
    !item.subdivisionKey || activeSet.has(`${item.dimensionKey}:${item.subdivisionKey}`));
  for (const key of addedKeys) {
    const [dimensionKey, subdivisionKey] = key.split(':');
    const subdivision = getAssessmentSubdivisions(dimensionKey as DimensionKey, normalizedCustom, excludedSubdivisionKeys)
      .find(item => item.key === subdivisionKey);
    if (!subdivision) continue;
    evidencePlan.push({
      dimensionKey,
      subdivisionKey,
      searchTargets: [...subdivision.evidenceHints],
      sourceTypes: ['annual_report', 'regulatory_filing', 'investor_relations'],
      notes: '',
      planOrigin: subdivisionKey.startsWith('custom_') ? 'reviewer' : 'framework_default',
    });
  }

  const changed = JSON.stringify(previousActive) !== JSON.stringify(nextActive);
  (await updateAssessment(id, { customSubdivisions: normalizedCustom, excludedSubdivisionKeys, evidencePlan, evidencePlanInitialized: true }));
  if (changed) (await invalidateApprovalsAfterStage(id, 3));
  (await addAuditEntry({
    id: uuidv4(), assessmentId: id, action: 'assessment_subdivisions_updated', entityType: 'assessment', entityId: id,
    oldValue: { customSubdivisions: assessment.customSubdivisions || [], excludedSubdivisionKeys: assessment.excludedSubdivisionKeys || [] },
    newValue: { customSubdivisions: normalizedCustom, excludedSubdivisionKeys, addedKeys },
    reason: 'Assessment sub-dimension scope updated', actor: 'user', timestamp: new Date().toISOString(),
  }));
  return NextResponse.json({ customSubdivisions: normalizedCustom, excludedSubdivisionKeys, evidencePlan });
}