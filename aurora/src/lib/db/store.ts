import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { type Assessment, type StageApproval, type AssessmentStage } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { type AuditEntry } from '@/types/audit';
import { type SubdivisionScore, type DimensionScore } from '@/types/scoring';
import { type ScenarioAssessment } from '@/types/scenario';
import { type ResilienceGap } from '@/types/resilience';

const DATA_DIR = path.join(process.cwd(), '.aurora-data');

interface StoreData {
  assessments: Assessment[];
  stageApprovals: StageApproval[];
  evidence: Evidence[];
  auditTrail: AuditEntry[];
  subdivisionScores: SubdivisionScore[];
  dimensionScores: DimensionScore[];
  scenarioAssessments: ScenarioAssessment[];
  resilienceGaps: ResilienceGap[];
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStorePath(): string {
  return path.join(DATA_DIR, 'store.json');
}

function readStore(): StoreData {
  ensureDataDir();
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    const empty: StoreData = { assessments: [], stageApprovals: [], evidence: [], auditTrail: [], subdivisionScores: [], dimensionScores: [], scenarioAssessments: [], resilienceGaps: [] };
    writeFileSync(storePath, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(readFileSync(storePath, 'utf-8'));
}

function writeStore(data: StoreData): void {
  ensureDataDir();
  writeFileSync(getStorePath(), JSON.stringify(data, null, 2));
}

// Assessments
export function getAllAssessments(): Assessment[] {
  return readStore().assessments;
}

export function getAssessment(id: string): Assessment | undefined {
  return readStore().assessments.find((a) => a.id === id);
}

export function createAssessment(assessment: Assessment): Assessment {
  const store = readStore();
  store.assessments.push(assessment);
  writeStore(store);
  return assessment;
}

export function updateAssessment(id: string, updates: Partial<Assessment>): Assessment | undefined {
  const store = readStore();
  const idx = store.assessments.findIndex((a) => a.id === id);
  if (idx === -1) return undefined;
  store.assessments[idx] = { ...store.assessments[idx], ...updates, updatedAt: new Date().toISOString() };
  writeStore(store);
  return store.assessments[idx];
}

export function deleteAssessment(id: string): boolean {
  const store = readStore();
  const before = store.assessments.length;
  store.assessments = store.assessments.filter((a) => a.id !== id);
  store.stageApprovals = store.stageApprovals.filter((a) => a.assessmentId !== id);
  store.evidence = store.evidence.filter((e) => e.assessmentId !== id);
  store.auditTrail = store.auditTrail.filter((a) => a.assessmentId !== id);
  if (store.subdivisionScores) store.subdivisionScores = store.subdivisionScores.filter((s) => s.assessmentId !== id);
  if (store.dimensionScores) store.dimensionScores = store.dimensionScores.filter((s) => s.assessmentId !== id);
  if (store.scenarioAssessments) store.scenarioAssessments = store.scenarioAssessments.filter((s) => s.assessmentId !== id);
  if (store.resilienceGaps) store.resilienceGaps = store.resilienceGaps.filter((g) => g.assessmentId !== id);
  writeStore(store);
  return store.assessments.length < before;
}

// Stage Approvals
export function getStageApprovals(assessmentId: string): StageApproval[] {
  return readStore().stageApprovals.filter((a) => a.assessmentId === assessmentId);
}

export function getStageApproval(assessmentId: string, stage: AssessmentStage): StageApproval | undefined {
  return readStore().stageApprovals.find((a) => a.assessmentId === assessmentId && a.stage === stage);
}

export function upsertStageApproval(approval: StageApproval): StageApproval {
  const store = readStore();
  const idx = store.stageApprovals.findIndex(
    (a) => a.assessmentId === approval.assessmentId && a.stage === approval.stage
  );
  if (idx === -1) {
    store.stageApprovals.push(approval);
  } else {
    store.stageApprovals[idx] = approval;
  }
  writeStore(store);
  return approval;
}

export function invalidateApprovalsAfterStage(assessmentId: string, stage: AssessmentStage): void {
  const store = readStore();
  store.stageApprovals = store.stageApprovals.map((a) => {
    if (a.assessmentId === assessmentId && a.stage > stage) {
      return { ...a, status: 'pending' as const, approvedAt: null };
    }
    return a;
  });
  writeStore(store);
}

// Evidence
export function getEvidenceForAssessment(assessmentId: string): Evidence[] {
  return readStore().evidence.filter((e) => e.assessmentId === assessmentId);
}

export function getEvidenceById(id: string): Evidence | undefined {
  return readStore().evidence.find((e) => e.id === id);
}

export function createEvidence(evidence: Evidence): Evidence {
  const store = readStore();
  store.evidence.push(evidence);
  writeStore(store);
  return evidence;
}

export function updateEvidence(id: string, updates: Partial<Evidence>): Evidence | undefined {
  const store = readStore();
  const idx = store.evidence.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  store.evidence[idx] = { ...store.evidence[idx], ...updates };
  writeStore(store);
  return store.evidence[idx];
}

// Audit Trail
export function getAuditTrail(assessmentId: string): AuditEntry[] {
  return readStore().auditTrail.filter((a) => a.assessmentId === assessmentId);
}

export function addAuditEntry(entry: AuditEntry): AuditEntry {
  const store = readStore();
  store.auditTrail.push(entry);
  writeStore(store);
  return entry;
}

// Subdivision Scores
export function getSubdivisionScores(assessmentId: string): SubdivisionScore[] {
  const store = readStore();
  return (store.subdivisionScores || []).filter((s) => s.assessmentId === assessmentId);
}

export function upsertSubdivisionScore(score: SubdivisionScore): SubdivisionScore {
  const store = readStore();
  if (!store.subdivisionScores) store.subdivisionScores = [];
  const idx = store.subdivisionScores.findIndex(
    (s) => s.assessmentId === score.assessmentId && s.dimensionKey === score.dimensionKey && s.subdivisionKey === score.subdivisionKey
  );
  if (idx === -1) {
    store.subdivisionScores.push(score);
  } else {
    store.subdivisionScores[idx] = score;
  }
  writeStore(store);
  return score;
}

// Dimension Scores
export function getDimensionScores(assessmentId: string): DimensionScore[] {
  const store = readStore();
  return (store.dimensionScores || []).filter((s) => s.assessmentId === assessmentId);
}

export function upsertDimensionScore(score: DimensionScore): DimensionScore {
  const store = readStore();
  if (!store.dimensionScores) store.dimensionScores = [];
  const idx = store.dimensionScores.findIndex(
    (s) => s.assessmentId === score.assessmentId && s.dimensionKey === score.dimensionKey
  );
  if (idx === -1) {
    store.dimensionScores.push(score);
  } else {
    store.dimensionScores[idx] = score;
  }
  writeStore(store);
  return score;
}

// Scenario Assessments
export function getScenarioAssessments(assessmentId: string): ScenarioAssessment[] {
  const store = readStore();
  return (store.scenarioAssessments || []).filter((s) => s.assessmentId === assessmentId);
}

export function upsertScenarioAssessment(sa: ScenarioAssessment): ScenarioAssessment {
  const store = readStore();
  if (!store.scenarioAssessments) store.scenarioAssessments = [];
  const idx = store.scenarioAssessments.findIndex(
    (s) => s.assessmentId === sa.assessmentId && s.scenarioKey === sa.scenarioKey && s.dimensionKey === sa.dimensionKey
  );
  if (idx === -1) {
    store.scenarioAssessments.push(sa);
  } else {
    store.scenarioAssessments[idx] = sa;
  }
  writeStore(store);
  return sa;
}

// Resilience Gaps
export function getResilienceGaps(assessmentId: string): ResilienceGap[] {
  const store = readStore();
  return (store.resilienceGaps || []).filter((g) => g.assessmentId === assessmentId);
}

export function setResilienceGaps(assessmentId: string, gaps: ResilienceGap[]): void {
  const store = readStore();
  if (!store.resilienceGaps) store.resilienceGaps = [];
  store.resilienceGaps = store.resilienceGaps.filter((g) => g.assessmentId !== assessmentId);
  store.resilienceGaps.push(...gaps);
  writeStore(store);
}
