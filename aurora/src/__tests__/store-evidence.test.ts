import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, existsSync } from 'fs';
import path from 'path';

// Override data dir before importing store
const TEST_DATA_DIR = path.join(process.cwd(), '.aurora-data-test');

// Must set env before dynamic import
process.env.AURORA_DATA_DIR = TEST_DATA_DIR;

// We need to clear module cache and re-import to use test dir
// Instead, we test the store by using the API contracts directly

import {
  createAssessment,
  getAssessment,
  getAllAssessments,
  updateAssessment,
  createEvidence,
  getEvidenceForAssessment,
  updateEvidence,
  upsertStageApproval,
  getStageApprovals,
  addAuditEntry,
  getAuditTrail,
  invalidateApprovalsAfterStage,
} from '@/lib/db/store';
import { type Assessment, type StageApproval, type AssessmentStage } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';

describe('Store & Evidence', () => {
  const testAssessmentId = uuidv4();

  beforeAll(() => {
    // Clear any existing test data
    const storePath = path.join(process.cwd(), '.aurora-data', 'store.json');
    if (existsSync(storePath)) {
      // Write a clean store
      writeFileSync(storePath, JSON.stringify({
        assessments: [],
        stageApprovals: [],
        evidence: [],
        auditTrail: [],
      }, null, 2));
    }
  });

  describe('Assessment CRUD', () => {
    it('should create an assessment', () => {
      const assessment: Assessment = {
        id: testAssessmentId,
        companyName: 'Test Corp',
        companyDescription: '',
        industry: '',
        companySize: null,
        dataSourceMode: 'public',
        currentStage: 1 as AssessmentStage,
        assessmentLens: 'SaaS/IT',
        scenarioNarratives: {},
        dimensionSelections: [],
        evidencePlan: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = createAssessment(assessment);
      expect(result.id).toBe(testAssessmentId);
      expect(result.companyName).toBe('Test Corp');
    });

    it('should retrieve an assessment', () => {
      const result = getAssessment(testAssessmentId);
      expect(result).toBeDefined();
      expect(result?.companyName).toBe('Test Corp');
    });

    it('should list all assessments', () => {
      const all = getAllAssessments();
      expect(all.length).toBeGreaterThanOrEqual(1);
    });

    it('should update an assessment', () => {
      const updated = updateAssessment(testAssessmentId, { industry: 'SaaS' });
      expect(updated?.industry).toBe('SaaS');
    });
  });

  describe('Evidence Approval Flow', () => {
    let evidenceId: string;

    it('should create evidence', () => {
      const ev: Evidence = {
        id: uuidv4(),
        assessmentId: testAssessmentId,
        claim: 'Test claim',
        extractedValue: 'Test value',
        supportingExcerpt: 'Test excerpt',
        sourceTitle: 'Test Source',
        publisher: 'Test Publisher',
        sourceUrl: 'https://example.com/report',
        sourceType: 'annual_report',
        publicationDate: '2024-01-01',
        retrievalTimestamp: new Date().toISOString(),
        pageNumber: null,
        dimensionKey: 'revenue_durability',
        subdivisionKey: null,
        urlResolved: true,
        status: 'proposed',
        rejectionReason: null,
        sourceOrigin: 'llm_research',
        isMock: true,
        createdAt: new Date().toISOString(),
      };

      const result = createEvidence(ev);
      evidenceId = result.id;
      expect(result.status).toBe('proposed');
    });

    it('should accept evidence', () => {
      const updated = updateEvidence(evidenceId, { status: 'accepted' });
      expect(updated?.status).toBe('accepted');
    });

    it('should reject evidence with reason', () => {
      const ev2: Evidence = {
        id: uuidv4(),
        assessmentId: testAssessmentId,
        claim: 'Dubious claim',
        extractedValue: '',
        supportingExcerpt: '',
        sourceTitle: 'Unknown',
        publisher: 'Unknown',
        sourceUrl: null,
        sourceType: 'other',
        publicationDate: null,
        retrievalTimestamp: new Date().toISOString(),
        pageNumber: null,
        dimensionKey: 'revenue_durability',
        subdivisionKey: null,
        urlResolved: false,
        status: 'proposed',
        rejectionReason: null,
        sourceOrigin: 'llm_research',
        isMock: true,
        createdAt: new Date().toISOString(),
      };
      createEvidence(ev2);

      const rejected = updateEvidence(ev2.id, {
        status: 'rejected',
        rejectionReason: 'Source not credible',
      });
      expect(rejected?.status).toBe('rejected');
      expect(rejected?.rejectionReason).toBe('Source not credible');
    });

    it('should retrieve evidence for assessment', () => {
      const items = getEvidenceForAssessment(testAssessmentId);
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Invalid Source URLs', () => {
    it('should mark evidence with null URL as unresolved', () => {
      const ev: Evidence = {
        id: uuidv4(),
        assessmentId: testAssessmentId,
        claim: 'Claim without URL',
        extractedValue: '',
        supportingExcerpt: '',
        sourceTitle: 'No Source',
        publisher: 'Unknown',
        sourceUrl: null,
        sourceType: 'other',
        publicationDate: null,
        retrievalTimestamp: new Date().toISOString(),
        pageNumber: null,
        dimensionKey: 'revenue_durability',
        subdivisionKey: null,
        urlResolved: false,
        status: 'proposed',
        rejectionReason: null,
        sourceOrigin: 'llm_research',
        isMock: true,
        createdAt: new Date().toISOString(),
      };
      const result = createEvidence(ev);
      expect(result.urlResolved).toBe(false);
      expect(result.sourceUrl).toBeNull();
    });
  });

  describe('Missing Evidence', () => {
    it('should return empty array for assessment with no evidence', () => {
      const fakeId = uuidv4();
      const items = getEvidenceForAssessment(fakeId);
      expect(items).toEqual([]);
    });
  });

  describe('Stage Approvals & Workflow Locking', () => {
    it('should create a stage approval', () => {
      const approval: StageApproval = {
        id: uuidv4(),
        assessmentId: testAssessmentId,
        stage: 1 as AssessmentStage,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        notes: 'Looks good',
      };
      upsertStageApproval(approval);
      const result = getStageApprovals(testAssessmentId);
      expect(result.find((a) => a.stage === 1)?.status).toBe('approved');
    });

    it('should invalidate approvals after a rejected stage', () => {
      // Add stage 2 approval
      upsertStageApproval({
        id: uuidv4(),
        assessmentId: testAssessmentId,
        stage: 2 as AssessmentStage,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        notes: '',
      });

      // Invalidate everything after stage 1
      invalidateApprovalsAfterStage(testAssessmentId, 1 as AssessmentStage);

      const approvals = getStageApprovals(testAssessmentId);
      const stage2 = approvals.find((a) => a.stage === 2);
      expect(stage2?.status).toBe('pending');
    });
  });

  describe('Audit Trail', () => {
    it('should record audit entries', () => {
      addAuditEntry({
        id: uuidv4(),
        assessmentId: testAssessmentId,
        action: 'test_action',
        entityType: 'test',
        entityId: 'test-1',
        oldValue: null,
        newValue: { test: true },
        reason: 'Testing audit trail',
        actor: 'user',
        timestamp: new Date().toISOString(),
      });

      const trail = getAuditTrail(testAssessmentId);
      expect(trail.length).toBeGreaterThanOrEqual(1);
      expect(trail.some((e) => e.action === 'test_action')).toBe(true);
    });

    it('should return empty trail for unknown assessment', () => {
      const trail = getAuditTrail(uuidv4());
      expect(trail).toEqual([]);
    });
  });
});
