import { generateScenarioReasoningMock } from '@/lib/llm/scenario-reasoning';
import { SCENARIOS } from '@/lib/framework/scenarios';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { type DimensionScore } from '@/types/scoring';
import { type Evidence } from '@/types/evidence';
import { type MaturityLevel } from '@/types/assessment';

function makeDimScore(overrides: Partial<DimensionScore> = {}): DimensionScore {
  return {
    id: 'ds-1',
    assessmentId: 'a-1',
    dimensionKey: 'revenue_durability',
    maturityLevel: 3 as MaturityLevel,
    normalizedScore: 78,
    confidence: 'medium',
    status: 'scored',
    overrideReason: null,
    subdivisionScoreIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: 'ev-1',
    assessmentId: 'a-1',
    claim: 'Test claim',
    extractedValue: 'value',
    supportingExcerpt: 'excerpt',
    sourceTitle: 'Source',
    publisher: 'Pub',
    sourceUrl: 'https://example.com',
    sourceType: 'annual_report',
    publicationDate: '2024-01-01',
    retrievalTimestamp: new Date().toISOString(),
    pageNumber: null,
    dimensionKey: 'revenue_durability',
    subdivisionKey: 'retention_nrr',
    urlResolved: true,
    status: 'accepted',
    rejectionReason: null,
    sourceOrigin: 'llm_research',
    isMock: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Scenario Reasoning', () => {
  describe('generateScenarioReasoning', () => {
    it('should return null maturity when base is not scored', () => {
      const score = makeDimScore({ maturityLevel: null });
      const result = generateScenarioReasoningMock('revenue_compression', 'revenue_durability', score, []);
      expect(result.scenarioMaturity).toBeNull();
      expect(result.direction).toBe('stable');
    });

    it('should use all 6 shock injection vectors', () => {
      const score = makeDimScore();
      for (const scenario of SCENARIOS) {
        const result = generateScenarioReasoningMock(scenario.key, 'revenue_durability', score, []);
        expect(result.scenarioMaturity).not.toBeUndefined();
        expect(result.rationale.length).toBeGreaterThan(10);
      }
    });

    it('should not create new scenarios beyond the 6 shock injection vectors', () => {
      expect(SCENARIOS).toHaveLength(6);
      const keys = SCENARIOS.map(s => s.key);
      expect(keys).toEqual([
        'revenue_compression',
        'cloud_cyber_outage',
        'cogs_margin_squeeze',
        'talent_attrition',
        'capital_market_freeze',
        'ai_disruption_commodity',
      ]);
    });

    it('should weaken revenue_durability under revenue_compression', () => {
      const score = makeDimScore({ maturityLevel: 3 });
      const result = generateScenarioReasoningMock('revenue_compression', 'revenue_durability', score, []);
      expect(result.direction).toBe('weakens');
      expect(result.scenarioMaturity).toBeLessThan(3);
    });

    it('should weaken innovation_rd_capacity under ai_disruption_commodity', () => {
      const score = makeDimScore({ dimensionKey: 'innovation_rd_capacity', maturityLevel: 3 });
      const result = generateScenarioReasoningMock('ai_disruption_commodity', 'innovation_rd_capacity', score, []);
      expect(result.direction).toBe('weakens');
      expect(result.scenarioMaturity).toBeLessThan(3);
    });

    it('should keep maturity stable when no impact', () => {
      const score = makeDimScore({ dimensionKey: 'erp_data_backbone', maturityLevel: 3 });
      const result = generateScenarioReasoningMock('managed_modernization', 'erp_data_backbone', score, []);
      expect(result.direction).toBe('stable');
      expect(result.scenarioMaturity).toBe(3);
    });

    it('should never adjust maturity below 1', () => {
      const score = makeDimScore({ maturityLevel: 1 });
      for (const scenario of SCENARIOS) {
        const result = generateScenarioReasoningMock(scenario.key, 'revenue_durability', score, []);
        if (result.scenarioMaturity !== null) {
          expect(result.scenarioMaturity).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('should never adjust maturity above 4', () => {
      const score = makeDimScore({ maturityLevel: 4, dimensionKey: 'innovation_rd_capacity' });
      for (const scenario of SCENARIOS) {
        const result = generateScenarioReasoningMock(scenario.key, 'innovation_rd_capacity', score, []);
        if (result.scenarioMaturity !== null) {
          expect(result.scenarioMaturity).toBeLessThanOrEqual(4);
        }
      }
    });

    it('should always provide a rationale', () => {
      const score = makeDimScore();
      for (const scenario of SCENARIOS) {
        for (const dim of DIMENSIONS.slice(0, 5)) {
          const result = generateScenarioReasoningMock(scenario.key, dim.key, score, []);
          expect(result.rationale).toBeTruthy();
          expect(result.rationale.length).toBeGreaterThan(10);
        }
      }
    });

    it('should include heuristic marker in rationale', () => {
      const score = makeDimScore();
      const result = generateScenarioReasoningMock('autonomous_advantage', 'revenue_durability', score, []);
      expect(result.rationale).toContain('Heuristic');
    });

    it('should return valid confidence', () => {
      const score = makeDimScore();
      for (const scenario of SCENARIOS) {
        const result = generateScenarioReasoningMock(scenario.key, 'revenue_durability', score, []);
        expect(['high', 'medium', 'low']).toContain(result.confidence);
      }
    });

    it('should have higher confidence with more evidence', () => {
      const score = makeDimScore();
      const noEv = generateScenarioReasoningMock('autonomous_advantage', 'revenue_durability', score, []);
      const withEv = generateScenarioReasoningMock('autonomous_advantage', 'revenue_durability', score, [
        makeEvidence(), makeEvidence({ id: 'ev-2' }),
      ]);

      const confOrder = { low: 0, medium: 1, high: 2 };
      expect(confOrder[withEv.confidence]).toBeGreaterThanOrEqual(confOrder[noEv.confidence]);
    });

    it('should cover all 15 dimensions for each scenario', () => {
      const score = makeDimScore();
      for (const scenario of SCENARIOS) {
        for (const dim of DIMENSIONS) {
          const result = generateScenarioReasoningMock(scenario.key, dim.key, score, []);
          expect(result.rationale).toBeTruthy();
          expect(result.scenarioMaturity).not.toBeUndefined();
        }
      }
    });
  });
});
