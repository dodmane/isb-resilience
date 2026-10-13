import { type Assessment } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { evidenceSnapshot } from '@/lib/framework/criteria';

const mockDocuments = new Map<string, Record<string, unknown>>();
let mockFailReads = false;

jest.mock('@google-cloud/firestore', () => {
  function document(referencePath: string) {
    return {
      path: referencePath,
      async get() {
        if (mockFailReads) throw new Error('Firestore unavailable');
        return { exists: mockDocuments.has(referencePath), data: () => mockDocuments.get(referencePath) };
      },
      async set(value: Record<string, unknown>) { mockDocuments.set(referencePath, value); },
      async create(value: Record<string, unknown>) {
        if (mockDocuments.has(referencePath)) throw new Error('Already exists');
        mockDocuments.set(referencePath, value);
      },
      async delete() { mockDocuments.delete(referencePath); },
    };
  }
  function query(name: string, assessmentId?: string) {
    return {
      doc: (id: string) => document(`${name}/${id}`),
      where: (_field: string, _operator: string, value: string) => query(name, value),
      async get() {
        if (mockFailReads) throw new Error('Firestore unavailable');
        return { docs: [...mockDocuments.entries()]
          .filter(([referencePath, value]) => referencePath.startsWith(`${name}/`) &&
            (assessmentId === undefined || value.assessmentId === assessmentId))
          .map(([referencePath, value]) => ({ ref: document(referencePath), data: () => value })) };
      },
    };
  }
  return {
    Firestore: class {
      collection(name: string) { return query(name); }
      async runTransaction(callback: (transaction: unknown) => Promise<unknown>) {
        const writes: (() => void)[] = [];
        const result = await callback({
          get: (reference: { get: () => Promise<unknown> }) => reference.get(),
          set: (reference: { path: string }, value: Record<string, unknown>) => writes.push(() => mockDocuments.set(reference.path, value)),
          update: (reference: { path: string }, value: Record<string, unknown>) => writes.push(() => mockDocuments.set(reference.path, {
            ...mockDocuments.get(reference.path), ...value,
          })),
          delete: (reference: { path: string }) => writes.push(() => mockDocuments.delete(reference.path)),
        });
        writes.forEach(write => write());
        return result;
      }
      batch() {
        const references: string[] = [];
        return {
          delete: (reference: { path: string }) => references.push(reference.path),
          async commit() { references.forEach(referencePath => mockDocuments.delete(referencePath)); },
        };
      }
    },
  };
});

import * as repository from '@/lib/db/repository';

const assessment: Assessment = {
  id: 'persistent-assessment', companyName: 'Persistent Company', companyDescription: 'Saved profile',
  industry: 'SaaS', companySize: 'small', dataSourceMode: 'public', currentStage: 10,
  assessmentLens: 'SaaS/IT', scenarioNarratives: { autonomous_advantage: 'Saved narrative' },
  dimensionSelections: [], evidencePlan: [], scoringMethod: 'manual', createdAt: '2026-10-13', updatedAt: '2026-10-13',
};

const evidence: Evidence = {
  id: 'persistent-evidence', assessmentId: assessment.id, claim: 'Saved evidence', extractedValue: '105%',
  supportingExcerpt: 'NRR was 105%', sourceTitle: 'Annual report', publisher: 'Company', sourceUrl: null,
  sourceType: 'annual_report', publicationDate: '2026-01-01', retrievalTimestamp: '2026-10-13', pageNumber: null,
  dimensionKey: 'revenue_durability', subdivisionKey: 'retention_nrr', urlResolved: false,
  status: 'accepted', rejectionReason: null, sourceOrigin: 'user_provided', isMock: false, createdAt: '2026-10-13',
};

describe('Firestore assessment persistence', () => {
  beforeEach(() => {
    mockDocuments.clear();
    mockFailReads = false;
    process.env.AURORA_STORAGE_BACKEND = 'firestore';
  });

  afterEach(() => {
    process.env.AURORA_STORAGE_BACKEND = 'json';
    delete process.env.K_SERVICE;
  });

  it('loads saved assessments and evidence from a new repository instance', async () => {
    await repository.createAssessment(assessment);
    await repository.createEvidence(evidence);
    let restarted!: typeof repository;
    await jest.isolateModulesAsync(async () => { restarted = await import('@/lib/db/repository'); });

    expect(await restarted.getAllAssessments()).toEqual([assessment]);
    expect(await restarted.getEvidenceForAssessment(assessment.id)).toEqual([evidence]);
  });

  it('preserves unrelated fields on update and removes optional undefined values', async () => {
    await repository.createAssessment(assessment);
    await repository.updateAssessment(assessment.id, { companyName: 'Updated', discoveryIsMock: undefined });
    expect(await repository.getAssessment(assessment.id)).toMatchObject({ companyName: 'Updated', scenarioNarratives: assessment.scenarioNarratives });
    expect(await repository.getAssessment(assessment.id)).not.toHaveProperty('discoveryIsMock');
  });

  it('invalidates scoring approvals atomically when evidence changes', async () => {
    await repository.createAssessment(assessment);
    await repository.createEvidence(evidence);
    await repository.upsertStageApproval({ id: 'approval', assessmentId: assessment.id, stage: 6, status: 'approved', approvedAt: '2026-10-13', notes: '' });
    await repository.updateEvidence(evidence.id, { claim: 'Updated evidence' });

    expect(await repository.getEvidenceById(evidence.id)).toMatchObject({ claim: 'Updated evidence' });
    expect(await repository.getStageApprovals(assessment.id)).toMatchObject([{ status: 'pending', approvedAt: null }]);
  });

  it('upserts scenarios by their assessment/scenario/dimension key without duplicating records', async () => {
    const scenario = {
      id: 'scenario-1', assessmentId: assessment.id, scenarioKey: 'autonomous_advantage' as const,
      dimensionKey: 'revenue_durability', baseMaturity: 3 as const, scenarioMaturity: 3 as const,
      direction: 'stable' as const, rationale: 'Original', confidence: 'medium' as const,
      relevantEvidenceIds: [], userApproved: true, overrideReason: null, isMockRecommendation: false,
      createdAt: '2026-10-13', updatedAt: '2026-10-13',
    };
    await repository.upsertScenarioAssessment(scenario);
    await repository.upsertScenarioAssessment({ ...scenario, id: 'scenario-2', rationale: 'Updated' });
    expect(await repository.getScenarioAssessments(assessment.id)).toMatchObject([{ id: 'scenario-2', rationale: 'Updated' }]);
  });

  it('retains reviewed ratings and report gaps across repository instances', async () => {
    await repository.createAssessment(assessment);
    await repository.createEvidence(evidence);
    await repository.upsertSubdivisionScore({
      id: 'rating', assessmentId: assessment.id, dimensionKey: evidence.dimensionKey, subdivisionKey: evidence.subdivisionKey!,
      maturityLevel: 3, position: 'Mid', ratingMethod: 'level_position', normalizedScore: 63, absoluteScore: 63,
      confidence: 'medium', status: 'scored', rationale: 'Reviewed evidence', overrideReason: null,
      evidenceIds: [evidence.id], evidenceSnapshot: evidenceSnapshot([evidence]), reviewedBy: 'Reviewer',
      reviewedAt: '2026-10-13', isMockRecommendation: false, createdAt: '2026-10-13', updatedAt: '2026-10-13',
    });
    const gap = {
      id: 'gap', assessmentId: assessment.id, dimensionKey: evidence.dimensionKey, subdivisionKey: evidence.subdivisionKey,
      currentMaturity: 3, scenarioKey: 'exposed_and_reactive', scenarioMaturity: 2, gapDescription: 'Saved gap',
      businessImplication: 'Saved implication', recommendation: 'Saved recommendation', supportingEvidenceIds: [evidence.id],
      classification: 'exposed' as const, createdAt: '2026-10-13',
    };
    await repository.setResilienceGaps(assessment.id, [gap]);
    let restarted!: typeof repository;
    await jest.isolateModulesAsync(async () => { restarted = await import('@/lib/db/repository'); });

    expect(await restarted.getSubdivisionScores(assessment.id)).toMatchObject([{ normalizedScore: 63, status: 'scored', reviewedBy: 'Reviewer' }]);
    expect(await restarted.getResilienceGaps(assessment.id)).toEqual([gap]);
    await restarted.setResilienceGaps(assessment.id, [{ ...gap, id: 'replacement-gap' }]);
    expect(await restarted.getResilienceGaps(assessment.id)).toHaveLength(1);
  });

  it('deletes related records without deleting another assessment', async () => {
    await repository.createAssessment(assessment);
    await repository.createAssessment({ ...assessment, id: 'another-assessment' });
    await repository.createEvidence(evidence);
    await repository.addAuditEntry({ id: 'audit', assessmentId: assessment.id, action: 'created', entityType: 'assessment',
      entityId: assessment.id, oldValue: null, newValue: {}, reason: 'Test', actor: 'user', timestamp: '2026-10-13' });
    expect(await repository.deleteAssessment(assessment.id)).toBe(true);
    expect(await repository.getEvidenceForAssessment(assessment.id)).toEqual([]);
    expect(await repository.getAuditTrail(assessment.id)).toEqual([]);
    expect(await repository.getAllAssessments()).toMatchObject([{ id: 'another-assessment' }]);
  });

  it('surfaces Firestore failures without falling back to temporary JSON storage', async () => {
    mockFailReads = true;
    await expect(repository.getAllAssessments()).rejects.toThrow('Firestore unavailable');
  });

  it('rejects temporary JSON storage on Cloud Run', () => {
    process.env.K_SERVICE = 'aurora';
    process.env.AURORA_STORAGE_BACKEND = 'json';
    expect(() => repository.storageBackend()).toThrow('Cloud Run requires Firestore storage');
  });
});