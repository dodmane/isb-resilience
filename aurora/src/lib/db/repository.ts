import { createHash } from 'node:crypto';
import { Firestore, type DocumentData } from '@google-cloud/firestore';
import * as local from './store';
import { type Assessment, type AssessmentStage, type StageApproval } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { type AuditEntry } from '@/types/audit';
import { type DimensionScore, type SubdivisionScore } from '@/types/scoring';
import { type ScenarioAssessment } from '@/types/scenario';
import { type ResilienceGap } from '@/types/resilience';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { getAssessmentSubdivisions } from '@/lib/framework/subdivisions';
import { summarizeDimension } from '@/lib/framework/scoring';

type CollectionName = 'assessments' | 'stageApprovals' | 'evidence' | 'auditTrail' |
  'subdivisionScores' | 'dimensionScores' | 'scenarioAssessments' | 'resilienceGaps';

let firestore: Firestore | undefined;

export function storageBackend(): 'json' | 'firestore' {
  const backend = process.env.AURORA_STORAGE_BACKEND || (process.env.K_SERVICE ? 'firestore' : 'json');
  if (backend !== 'json' && backend !== 'firestore') throw new Error('AURORA_STORAGE_BACKEND must be json or firestore');
  if (process.env.K_SERVICE && backend === 'json') throw new Error('Cloud Run requires Firestore storage; local JSON data is temporary');
  return backend;
}

function database() {
  if (!firestore) {
    firestore = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
      databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
    });
  }
  return firestore;
}

function collection(name: CollectionName) {
  const prefix = process.env.AURORA_FIRESTORE_PREFIX || 'aurora';
  if (!/^[a-zA-Z0-9_-]+$/.test(prefix)) throw new Error('Invalid AURORA_FIRESTORE_PREFIX');
  return database().collection(`${prefix}_${name}`);
}

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function compoundId(...parts: (string | number)[]) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

async function find<T>(name: CollectionName, assessmentId?: string): Promise<T[]> {
  const reference = collection(name);
  const result = await (assessmentId === undefined ? reference : reference.where('assessmentId', '==', assessmentId)).get();
  return result.docs.map(document => document.data() as T);
}

async function get<T>(name: CollectionName, id: string): Promise<T | undefined> {
  const result = await collection(name).doc(id).get();
  return result.exists ? result.data() as T : undefined;
}

async function put<T>(name: CollectionName, id: string, value: T): Promise<T> {
  await collection(name).doc(id).set(clean(value) as DocumentData);
  return value;
}

export async function getAllAssessments(): Promise<Assessment[]> {
  return storageBackend() === 'json' ? local.getAllAssessments() : find<Assessment>('assessments');
}

export async function getAssessment(id: string): Promise<Assessment | undefined> {
  return storageBackend() === 'json' ? local.getAssessment(id) : get<Assessment>('assessments', id);
}

export async function createAssessment(assessment: Assessment): Promise<Assessment> {
  if (storageBackend() === 'json') return local.createAssessment(assessment);
  await collection('assessments').doc(assessment.id).create(clean(assessment) as DocumentData);
  return assessment;
}

export async function updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment | undefined> {
  if (storageBackend() === 'json') return local.updateAssessment(id, updates);
  return database().runTransaction(async transaction => {
    const reference = collection('assessments').doc(id);
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) return undefined;
    const updated = { ...snapshot.data(), ...updates, updatedAt: new Date().toISOString() } as Assessment;
    transaction.set(reference, clean(updated));
    return updated;
  });
}

export async function deleteAssessment(id: string): Promise<boolean> {
  if (storageBackend() === 'json') return local.deleteAssessment(id);
  if (!(await getAssessment(id))) return false;
  const relatedCollections: CollectionName[] = ['stageApprovals', 'evidence', 'auditTrail', 'subdivisionScores',
    'dimensionScores', 'scenarioAssessments', 'resilienceGaps'];
  for (const name of relatedCollections) {
    const documents = await collection(name).where('assessmentId', '==', id).get();
    for (let offset = 0; offset < documents.docs.length; offset += 400) {
      const batch = database().batch();
      documents.docs.slice(offset, offset + 400).forEach(document => batch.delete(document.ref));
      await batch.commit();
    }
  }
  await collection('assessments').doc(id).delete();
  return true;
}

export async function getStageApprovals(assessmentId: string): Promise<StageApproval[]> {
  if (storageBackend() === 'json') return local.getStageApprovals(assessmentId);
  const [assessment, approvals, scores] = await Promise.all([
    getAssessment(assessmentId), find<StageApproval>('stageApprovals', assessmentId), getSubdivisionScores(assessmentId),
  ]);
  return local.validateStageApprovals(assessment, approvals, scores);
}

export async function getStageApproval(assessmentId: string, stage: AssessmentStage): Promise<StageApproval | undefined> {
  return (await getStageApprovals(assessmentId)).find(approval => approval.stage === stage);
}

export async function upsertStageApproval(approval: StageApproval): Promise<StageApproval> {
  return storageBackend() === 'json' ? local.upsertStageApproval(approval) :
    put('stageApprovals', compoundId(approval.assessmentId, approval.stage), approval);
}

export async function invalidateApprovalsAfterStage(assessmentId: string, stage: AssessmentStage): Promise<void> {
  if (storageBackend() === 'json') return local.invalidateApprovalsAfterStage(assessmentId, stage);
  await database().runTransaction(async transaction => {
    const approvals = await transaction.get(collection('stageApprovals').where('assessmentId', '==', assessmentId));
    for (const document of approvals.docs) {
      if (document.data().stage > stage) transaction.update(document.ref, { status: 'pending', approvedAt: null });
    }
  });
}

export async function getEvidenceForAssessment(assessmentId: string): Promise<Evidence[]> {
  return storageBackend() === 'json' ? local.getEvidenceForAssessment(assessmentId) : find<Evidence>('evidence', assessmentId);
}

export async function getEvidenceById(id: string): Promise<Evidence | undefined> {
  return storageBackend() === 'json' ? local.getEvidenceById(id) : get<Evidence>('evidence', id);
}

export async function createEvidence(evidence: Evidence): Promise<Evidence> {
  return storageBackend() === 'json' ? local.createEvidence(evidence) : put('evidence', evidence.id, evidence);
}

export async function updateEvidence(id: string, updates: Partial<Evidence>): Promise<Evidence | undefined> {
  if (storageBackend() === 'json') return local.updateEvidence(id, updates);
  return database().runTransaction(async transaction => {
    const reference = collection('evidence').doc(id);
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) return undefined;
    const existing = snapshot.data() as Evidence;
    const approvals = await transaction.get(collection('stageApprovals').where('assessmentId', '==', existing.assessmentId));
    const updated = { ...existing, ...updates };
    transaction.set(reference, clean(updated));
    for (const document of approvals.docs) {
      if (document.data().stage >= 6) transaction.update(document.ref, { status: 'pending', approvedAt: null });
    }
    return updated;
  });
}

export async function getAuditTrail(assessmentId: string): Promise<AuditEntry[]> {
  const entries = storageBackend() === 'json' ? local.getAuditTrail(assessmentId) : await find<AuditEntry>('auditTrail', assessmentId);
  return entries.sort((first, second) => first.timestamp.localeCompare(second.timestamp));
}

export async function addAuditEntry(entry: AuditEntry): Promise<AuditEntry> {
  return storageBackend() === 'json' ? local.addAuditEntry(entry) : put('auditTrail', entry.id, entry);
}

export async function getSubdivisionScores(assessmentId: string): Promise<SubdivisionScore[]> {
  if (storageBackend() === 'json') return local.getSubdivisionScores(assessmentId);
  const [assessment, scores, evidence] = await Promise.all([
    getAssessment(assessmentId), find<SubdivisionScore>('subdivisionScores', assessmentId), getEvidenceForAssessment(assessmentId),
  ]);
  return local.validateSubdivisionScores(assessment, scores, evidence);
}

export async function upsertSubdivisionScore(score: SubdivisionScore): Promise<SubdivisionScore> {
  return storageBackend() === 'json' ? local.upsertSubdivisionScore(score) :
    put('subdivisionScores', compoundId(score.assessmentId, score.dimensionKey, score.subdivisionKey), score);
}

export async function getDimensionScores(assessmentId: string): Promise<DimensionScore[]> {
  if (storageBackend() === 'json') return local.getDimensionScores(assessmentId);
  const [assessment, subdivisions, scores] = await Promise.all([
    getAssessment(assessmentId), getSubdivisionScores(assessmentId), find<DimensionScore>('dimensionScores', assessmentId),
  ]);
  return scores.map(score => {
    const result = summarizeDimension(score.dimensionKey, subdivisions, getAssessmentSubdivisions(
      score.dimensionKey as DimensionKey, assessment?.customSubdivisions, assessment?.excludedSubdivisionKeys,
    ));
    return { ...score, normalizedScore: result.normalizedScore, maturityLevel: result.maturityLevel,
      status: result.normalizedScore === null ? 'insufficient_evidence' : 'scored', overrideReason: null };
  });
}

export async function upsertDimensionScore(score: DimensionScore): Promise<DimensionScore> {
  return storageBackend() === 'json' ? local.upsertDimensionScore(score) :
    put('dimensionScores', compoundId(score.assessmentId, score.dimensionKey), score);
}

export async function getScenarioAssessments(assessmentId: string): Promise<ScenarioAssessment[]> {
  return storageBackend() === 'json' ? local.getScenarioAssessments(assessmentId) : find<ScenarioAssessment>('scenarioAssessments', assessmentId);
}

export async function upsertScenarioAssessment(scenario: ScenarioAssessment): Promise<ScenarioAssessment> {
  return storageBackend() === 'json' ? local.upsertScenarioAssessment(scenario) :
    put('scenarioAssessments', compoundId(scenario.assessmentId, scenario.scenarioKey, scenario.dimensionKey), scenario);
}

export async function getResilienceGaps(assessmentId: string): Promise<ResilienceGap[]> {
  return storageBackend() === 'json' ? local.getResilienceGaps(assessmentId) : find<ResilienceGap>('resilienceGaps', assessmentId);
}

export async function setResilienceGaps(assessmentId: string, gaps: ResilienceGap[]): Promise<void> {
  if (storageBackend() === 'json') return local.setResilienceGaps(assessmentId, gaps);
  await database().runTransaction(async transaction => {
    const existing = await transaction.get(collection('resilienceGaps').where('assessmentId', '==', assessmentId));
    existing.docs.forEach(document => transaction.delete(document.ref));
    gaps.forEach(gap => transaction.set(collection('resilienceGaps').doc(gap.id), clean(gap)));
  });
}