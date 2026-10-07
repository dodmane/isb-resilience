import { v4 as uuidv4 } from 'uuid';
import {
  createAssessment,
  getSubdivisionScores,
  upsertSubdivisionScore,
  getDimensionScores,
  upsertDimensionScore,
  createEvidence,
  updateEvidence,
  deleteAssessment,
} from '@/lib/db/store';
import { NextRequest } from 'next/server';
import { PATCH as patchSubdivision } from '@/app/api/assessments/[id]/subdivision-scores/route';
import { PATCH as patchDimension } from '@/app/api/assessments/[id]/dimension-scores/route';
import { POST as freezePolicy } from '@/app/api/assessments/[id]/scoring-policy/route';
import { PATCH as patchAssessment } from '@/app/api/assessments/[id]/route';
import { POST as approveStage } from '@/app/api/assessments/[id]/approvals/route';
import { getCriteria, type CriterionFinding } from '@/lib/framework/criteria';
import { normalize, calculateDimensionMaturity } from '@/lib/framework/scoring';
import { type AssessmentStage, type MaturityLevel } from '@/types/assessment';
import { type SubdivisionScore, type DimensionScore } from '@/types/scoring';

describe('Phase 3: Maturity Assessment', () => {
  const assessmentId = uuidv4();

  beforeAll(() => {
    createAssessment({
      id: assessmentId,
      companyName: 'Scoring Test Co',
      companyDescription: '',
      industry: 'SaaS',
      companySize: 'medium',
      dataSourceMode: 'public',
      currentStage: 6 as AssessmentStage,
      assessmentLens: 'SaaS/IT',
      scenarioNarratives: {},
      dimensionSelections: [
        { dimensionKey: 'revenue_durability', selected: true, deepAssessment: true, relevanceRationale: '' },
      ],
      evidencePlan: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
  afterAll(() => { deleteAssessment(assessmentId); });

  describe('Subdivision Scoring', () => {
    it('should retain legacy subdivision records but exclude them from current scoring', () => {
      const score: SubdivisionScore = {
        id: uuidv4(),
        assessmentId,
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'retention_nrr',
        maturityLevel: 3,
        position: 'Mid',
        normalizedScore: normalize(3, 'Mid'),
        confidence: 'high',
        status: 'scored',
        rationale: 'Strong NRR evidence',
        overrideReason: null,
        evidenceIds: ['ev-1'],
        isMockRecommendation: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      upsertSubdivisionScore(score);
      const scores = getSubdivisionScores(assessmentId);
      const found = scores.find(s => s.subdivisionKey === 'retention_nrr');
      expect(found).toBeDefined();
      expect(found?.maturityLevel).toBeNull();
      expect(found?.normalizedScore).toBeNull();
      expect(found?.status).toBe('stale');
    });

    it('should store NOT SCORED for insufficient evidence', () => {
      const score: SubdivisionScore = {
        id: uuidv4(),
        assessmentId,
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'pricing_power_mix',
        maturityLevel: null,
        normalizedScore: null,
        confidence: 'low',
        status: 'insufficient_evidence',
        rationale: 'NOT SCORED — INSUFFICIENT EVIDENCE',
        overrideReason: null,
        evidenceIds: [],
        isMockRecommendation: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      upsertSubdivisionScore(score);
      const scores = getSubdivisionScores(assessmentId);
      const found = scores.find(s => s.subdivisionKey === 'pricing_power_mix');
      expect(found?.maturityLevel).toBeNull();
      expect(found?.status).toBe('stale');
    });

    it('should not accept an old override reason as a criterion trail', () => {
      const score: SubdivisionScore = {
        id: uuidv4(),
        assessmentId,
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'customer_concentration_demand',
        maturityLevel: 2,
        position: 'Mid',
        normalizedScore: normalize(2, 'Mid'),
        confidence: 'medium',
        status: 'overridden',
        rationale: 'Original AI recommendation',
        overrideReason: 'Based on additional internal data showing high customer concentration',
        evidenceIds: ['ev-2'],
        isMockRecommendation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      upsertSubdivisionScore(score);
      const scores = getSubdivisionScores(assessmentId);
      const found = scores.find(s => s.subdivisionKey === 'customer_concentration_demand');
      expect(found?.status).toBe('stale');
      expect(found?.overrideReason).toBeTruthy();
      expect(found?.maturityLevel).toBeNull();
    });

    it('should upsert (update) existing subdivision score', () => {
      const scores = getSubdivisionScores(assessmentId);
      const existing = scores.find(s => s.subdivisionKey === 'retention_nrr');
      expect(existing).toBeDefined();

      const updated: SubdivisionScore = {
        ...existing!,
        maturityLevel: 4,
        normalizedScore: normalize(4, 'Mid'),
        status: 'overridden',
        overrideReason: 'Upgraded after additional evidence review',
        updatedAt: new Date().toISOString(),
      };

      upsertSubdivisionScore(updated);
      const refreshed = getSubdivisionScores(assessmentId);
      const found = refreshed.find(s => s.subdivisionKey === 'retention_nrr');
      expect(found?.maturityLevel).toBeNull();
      expect(found?.normalizedScore).toBeNull();
    });
  });

  describe('Dimension Scoring from Subdivision Averages', () => {
    it('should calculate dimension maturity as average of scored subdivisions', () => {
      // retention_nrr = 4, pricing_power_mix = null, customer_concentration_demand = 2
      const levels: (MaturityLevel | null)[] = [4, null, 2];
      const result = calculateDimensionMaturity(levels);
      expect(result).toBe(3); // (4+2)/2 = 3
    });

    it('should return null when no subdivisions are scored', () => {
      const result = calculateDimensionMaturity([null, null, null]);
      expect(result).toBeNull();
    });

    it('should derive the level from the numeric average band', () => {
      const result = calculateDimensionMaturity([2, 3, 3]);
      expect(result).toBe(3); // (2+3+3)/3 = 2.67 -> 3
    });

    it('should store dimension score', () => {
      const dimScore: DimensionScore = {
        id: uuidv4(),
        assessmentId,
        dimensionKey: 'revenue_durability',
        maturityLevel: 3,
        normalizedScore: normalize(3, 'Mid'),
        confidence: 'medium',
        status: 'scored',
        overrideReason: null,
        subdivisionScoreIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      upsertDimensionScore(dimScore);
      const scores = getDimensionScores(assessmentId);
      const found = scores.find(s => s.dimensionKey === 'revenue_durability');
      expect(found?.maturityLevel).toBeNull();
      expect(found?.normalizedScore).toBeNull();
    });

    it('should ignore legacy dimension overrides and derive scores from subdivisions', () => {
      const scores = getDimensionScores(assessmentId);
      const existing = scores.find(s => s.dimensionKey === 'revenue_durability');

      const overridden: DimensionScore = {
        ...existing!,
        maturityLevel: 2,
        normalizedScore: normalize(2, 'Mid'),
        status: 'overridden',
        overrideReason: 'Overriding based on executive judgment about churn risk',
        updatedAt: new Date().toISOString(),
      };

      upsertDimensionScore(overridden);
      const refreshed = getDimensionScores(assessmentId);
      const found = refreshed.find(s => s.dimensionKey === 'revenue_durability');
      expect(found?.status).toBe('insufficient_evidence');
      expect(found?.overrideReason).toBeNull();
      expect(found?.maturityLevel).toBeNull();
      expect(found?.normalizedScore).toBeNull();
    });
  });

  describe('Normalization', () => {
    it('should normalize Level 1 to range 0-25', () => {
      const score = normalize(1, 'Mid');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(25);
    });

    it('should normalize Level 2 to range 26-50', () => {
      const score = normalize(2, 'Mid');
      expect(score).toBeGreaterThanOrEqual(26);
      expect(score).toBeLessThanOrEqual(50);
    });

    it('should normalize Level 3 to range 51-75', () => {
      const score = normalize(3, 'Mid');
      expect(score).toBeGreaterThanOrEqual(51);
      expect(score).toBeLessThanOrEqual(75);
    });

    it('should normalize Level 4 to range 76-100', () => {
      const score = normalize(4, 'Mid');
      expect(score).toBeGreaterThanOrEqual(76);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Confidence Separation', () => {
    it('should store confidence separately from maturity', () => {
      const scores = getSubdivisionScores(assessmentId);
      for (const score of scores) {
        // Confidence exists as its own field, not affecting maturity
        expect(['high', 'medium', 'low']).toContain(score.confidence);
        // Maturity is independent
        if (score.maturityLevel !== null) {
          expect([1, 2, 3, 4]).toContain(score.maturityLevel);
        }
      }
    });

    it('should not let confidence alter the maturity score', () => {
      const scores = getSubdivisionScores(assessmentId);
      const nrrScore = scores.find(s => s.subdivisionKey === 'retention_nrr');
      // Maturity should be purely based on evidence/override, not confidence
      expect(nrrScore?.maturityLevel).toBeNull();
      // Even though confidence might vary
      expect(nrrScore?.confidence).toBeDefined();
    });
  });

  describe('Score Traceability', () => {
    it('should link subdivision scores to evidence IDs', () => {
      const scores = getSubdivisionScores(assessmentId);
      const scored = scores.filter(s => s.maturityLevel !== null);
      for (const score of scored) {
        // Every scored subdivision should reference evidence
        expect(Array.isArray(score.evidenceIds)).toBe(true);
      }
    });

    it('should link dimension scores to subdivision score IDs', () => {
      const dimScores = getDimensionScores(assessmentId);
      for (const score of dimScores) {
        expect(Array.isArray(score.subdivisionScoreIds)).toBe(true);
      }
    });
  });

  describe('Workbook API validation', () => {
    function request(body: Record<string, unknown>) {
      return new NextRequest('http://localhost/api/scores', { method: 'PATCH', body: JSON.stringify(body) });
    }
    const context = { params: Promise.resolve({ id: assessmentId }) };
    const evidenceId = uuidv4();
    const excerpt = 'Audited operating controls, NRR 105%, gross margin 80%, scope 80%; successful reviews 2026-01-01 and 2026-07-01; advanced automation is absent.';
    function findings(subdivisionKey = 'retention_nrr', sourceId = evidenceId): CriterionFinding[] {
      return getCriteria(subdivisionKey).map(criterion => ({ criterionId: criterion.id, status: criterion.id === 'adaptive' ? 'not_met' : 'met',
        basis: 'record', value: criterion.id === 'outcome' ? subdivisionKey === 'retention_nrr' ? 105 : 80 : criterion.id === 'repeatable' ? 2 : criterion.id === 'scope' ? 80 : null,
        evidenceId: sourceId, quote: excerpt, observedAt: '2026-07-01', rationale: 'Reviewer verified recorded operating results',
        observationDates: criterion.id === 'repeatable' ? ['2026-01-01', '2026-07-01'] : undefined }));
    }
    const input = { dimensionKey: 'revenue_durability', subdivisionKey: 'retention_nrr',
      criteria: findings(), reviewedBy: 'Academic Reviewer', overrideReason: 'Reviewed audited retention metrics' };

    beforeAll(async () => {
      const response = await freezePolicy(request({ profile: 'standard', periodStart: '2026-01-01', periodEnd: '2026-10-01',
        approvalReason: 'Fixed academic policy agreed before scoring', acknowledged: true }), context);
      expect(response.status).toBe(200);
    });

    it.each([
      { position: null }, { maturityLevel: 5 }, { criteria: [] }, { reviewedBy: '' },
      { overrideReason: ' ' }, { scoreOverride: 50 }, { scoreOverride: -1 },
      { scoreOverride: 100.5 }, { subdivisionKey: 'unknown' },
    ])('rejects invalid rating %j', async (changes) => {
      const response = await patchSubdivision(request({ ...input, ...changes }), context);
      expect(response.status).toBe(400);
    });

    it('rejects ratings without accepted evidence', async () => {
      const response = await patchSubdivision(request(input), context);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('accepted');
    });

    it('accepts a direct reviewed Level/Position rating without a frozen criterion policy', async () => {
      const directAssessmentId = uuidv4();
      const directEvidenceId = uuidv4();
      createAssessment({
        id: directAssessmentId, companyName: 'Direct Rating Test Co', companyDescription: '', industry: 'SaaS', companySize: 'small',
        dataSourceMode: 'public', currentStage: 6 as AssessmentStage, assessmentLens: 'SaaS/IT', scenarioNarratives: {},
        dimensionSelections: [{ dimensionKey: 'revenue_durability', selected: true, deepAssessment: true, relevanceRationale: '' }],
        evidencePlan: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      createEvidence({ id: directEvidenceId, assessmentId: directAssessmentId, claim: 'NRR was 105%', extractedValue: '105%',
        supportingExcerpt: 'Net revenue retention was 105% for the measured customer cohort.', sourceTitle: 'Annual Report', publisher: 'Test Co',
        sourceUrl: 'https://example.com/report', sourceType: 'annual_report', publicationDate: '2026-03-01', retrievalTimestamp: new Date().toISOString(),
        pageNumber: null, dimensionKey: 'revenue_durability', subdivisionKey: 'retention_nrr', urlResolved: true, status: 'accepted',
        rejectionReason: null, sourceOrigin: 'user_provided', isMock: false, createdAt: new Date().toISOString() });

      try {
        const response = await patchSubdivision(request({ ratingMethod: 'level_position', dimensionKey: 'revenue_durability',
          subdivisionKey: 'retention_nrr', maturityLevel: 3, position: 'Mid', evidenceIds: [directEvidenceId],
          rationale: 'The audited report shows NRR above the selected Level.', reviewedBy: 'Reviewer', confidence: 'medium' }),
          { params: Promise.resolve({ id: directAssessmentId }) });
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ ratingMethod: 'level_position', normalizedScore: 63, status: 'scored' });
        expect(getSubdivisionScores(directAssessmentId)[0]).toMatchObject({ reviewedBy: 'Reviewer', evidenceIds: [directEvidenceId] });
      } finally {
        deleteAssessment(directAssessmentId);
      }
    });

    it('saves reviewed criteria and recomputes aggregates without direct maturity inputs', async () => {
      const secondId = uuidv4();
      for (const [sourceId, sub] of [[evidenceId, 'retention_nrr'], [secondId, 'pricing_power_mix']]) createEvidence({ id: sourceId, assessmentId, claim: 'Audited retention metrics', extractedValue: '105% NRR',
        supportingExcerpt: excerpt, sourceTitle: 'Audited annual report', publisher: 'Test Company',
        sourceUrl: 'https://example.com/report', sourceType: 'annual_report', publicationDate: '2026-01-01',
        retrievalTimestamp: new Date().toISOString(), pageNumber: null, dimensionKey: 'revenue_durability',
        subdivisionKey: sub, urlResolved: true, status: 'accepted', rejectionReason: null,
        sourceOrigin: 'user_provided', isMock: false, createdAt: new Date().toISOString() });
      const response = await patchSubdivision(request(input), context);
      expect(response.status).toBe(200);
      expect((await response.json()).normalizedScore).toBe(63);
      const second = await patchSubdivision(request({ ...input, subdivisionKey: 'pricing_power_mix', criteria: findings('pricing_power_mix', secondId) }), context);
      expect(second.status).toBe(200);
      expect(getDimensionScores(assessmentId)[0].normalizedScore).toBe(63);
      const endpoint = await patchSubdivision(request({ ...input, scoreOverride: 100 }), context);
      expect(endpoint.status).toBe(400);
    });

    it('records unknown criteria without converting unknown into zero', async () => {
      const response = await patchSubdivision(request({ ...input, criteria: findings().map(finding => ({ ...finding, status: 'unknown', basis: 'unknown' })) }), context);
      expect(response.status).toBe(200);
      expect((await response.json()).normalizedScore).toBeNull();
      expect(getDimensionScores(assessmentId)[0].normalizedScore).toBeNull();
    });

    it('rejects formula-only dimension overrides', async () => {
      expect((await patchDimension()).status).toBe(405);
    });
    it('prevents post-hoc policy changes through either API', async () => {
      expect((await freezePolicy(request({ profile: 'critical' }), context)).status).toBe(409);
      expect((await patchAssessment(request({ scoringPolicy: {} }), context)).status).toBe(400);
    });
    it('blocks approval when reviews or evaluation coverage are incomplete', async () => {
      expect((await approveStage(request({ stage: 6, status: 'approved' }), context)).status).toBe(409);
    });
    it('marks a reviewed rating stale when its evidence changes', async () => {
      const response = await patchSubdivision(request(input), context);
      expect(response.status).toBe(200);
      updateEvidence(evidenceId, { supportingExcerpt: 'Evidence changed after review' });
      const stale = getSubdivisionScores(assessmentId).find(score => score.subdivisionKey === 'retention_nrr');
      expect(stale?.status).toBe('stale');
      expect(stale?.normalizedScore).toBeNull();
      expect(getDimensionScores(assessmentId)[0].normalizedScore).toBeNull();
    });
  });
});
