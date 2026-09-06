import { v4 as uuidv4 } from 'uuid';
import {
  createAssessment,
  getSubdivisionScores,
  upsertSubdivisionScore,
  getDimensionScores,
  upsertDimensionScore,
} from '@/lib/db/store';
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

  describe('Subdivision Scoring', () => {
    it('should create subdivision scores', () => {
      const score: SubdivisionScore = {
        id: uuidv4(),
        assessmentId,
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'retention_nrr',
        maturityLevel: 3,
        normalizedScore: normalize(3),
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
      expect(found?.maturityLevel).toBe(3);
      expect(found?.normalizedScore).toBe(78);
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
      expect(found?.status).toBe('insufficient_evidence');
    });

    it('should allow override with mandatory reason', () => {
      const score: SubdivisionScore = {
        id: uuidv4(),
        assessmentId,
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'customer_concentration_demand',
        maturityLevel: 2,
        normalizedScore: normalize(2),
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
      expect(found?.status).toBe('overridden');
      expect(found?.overrideReason).toBeTruthy();
      expect(found?.maturityLevel).toBe(2);
    });

    it('should upsert (update) existing subdivision score', () => {
      const scores = getSubdivisionScores(assessmentId);
      const existing = scores.find(s => s.subdivisionKey === 'retention_nrr');
      expect(existing).toBeDefined();

      const updated: SubdivisionScore = {
        ...existing!,
        maturityLevel: 4,
        normalizedScore: normalize(4),
        status: 'overridden',
        overrideReason: 'Upgraded after additional evidence review',
        updatedAt: new Date().toISOString(),
      };

      upsertSubdivisionScore(updated);
      const refreshed = getSubdivisionScores(assessmentId);
      const found = refreshed.find(s => s.subdivisionKey === 'retention_nrr');
      expect(found?.maturityLevel).toBe(4);
      expect(found?.normalizedScore).toBe(95);
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

    it('should round to nearest integer', () => {
      const result = calculateDimensionMaturity([2, 3, 3]);
      expect(result).toBe(3); // (2+3+3)/3 = 2.67 -> 3
    });

    it('should store dimension score', () => {
      const dimScore: DimensionScore = {
        id: uuidv4(),
        assessmentId,
        dimensionKey: 'revenue_durability',
        maturityLevel: 3,
        normalizedScore: normalize(3),
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
      expect(found?.maturityLevel).toBe(3);
      expect(found?.normalizedScore).toBe(78);
    });

    it('should allow dimension score override with reason', () => {
      const scores = getDimensionScores(assessmentId);
      const existing = scores.find(s => s.dimensionKey === 'revenue_durability');

      const overridden: DimensionScore = {
        ...existing!,
        maturityLevel: 2,
        normalizedScore: normalize(2),
        status: 'overridden',
        overrideReason: 'Overriding based on executive judgment about churn risk',
        updatedAt: new Date().toISOString(),
      };

      upsertDimensionScore(overridden);
      const refreshed = getDimensionScores(assessmentId);
      const found = refreshed.find(s => s.dimensionKey === 'revenue_durability');
      expect(found?.status).toBe('overridden');
      expect(found?.overrideReason).toContain('executive judgment');
      expect(found?.maturityLevel).toBe(2);
    });
  });

  describe('Normalization', () => {
    it('should normalize Level 1 to range 25-40', () => {
      const score = normalize(1);
      expect(score).toBeGreaterThanOrEqual(25);
      expect(score).toBeLessThanOrEqual(40);
    });

    it('should normalize Level 2 to range 50-65', () => {
      const score = normalize(2);
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(65);
    });

    it('should normalize Level 3 to range 70-85', () => {
      const score = normalize(3);
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(85);
    });

    it('should normalize Level 4 to range 90-100', () => {
      const score = normalize(4);
      expect(score).toBeGreaterThanOrEqual(90);
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
      expect(nrrScore?.maturityLevel).toBe(4);
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
});
