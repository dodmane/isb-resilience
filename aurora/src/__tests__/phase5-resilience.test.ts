import { v4 as uuidv4 } from 'uuid';
import {
  classifyDimension,
  generateResilienceGaps,
  generateEarlyWarningIndicators,
} from '@/lib/framework/resilience';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SCENARIOS } from '@/lib/framework/scenarios';
import { type DimensionScore } from '@/types/scoring';
import { type ScenarioAssessment } from '@/types/scenario';
import { type Evidence } from '@/types/evidence';

function makeDimScore(overrides: Partial<DimensionScore> = {}): DimensionScore {
  return {
    id: uuidv4(), assessmentId: 'a-1', dimensionKey: 'revenue_durability',
    maturityLevel: 3, normalizedScore: 78, confidence: 'medium', status: 'scored',
    overrideReason: null, subdivisionScoreIds: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSA(overrides: Partial<ScenarioAssessment> = {}): ScenarioAssessment {
  return {
    id: uuidv4(), assessmentId: 'a-1', scenarioKey: 'autonomous_advantage',
    dimensionKey: 'revenue_durability', baseMaturity: 3, scenarioMaturity: 3,
    direction: 'stable', rationale: 'Test', confidence: 'medium',
    relevantEvidenceIds: [], userApproved: true, overrideReason: null,
    isMockRecommendation: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: uuidv4(), assessmentId: 'a-1', claim: 'Test', extractedValue: '', supportingExcerpt: '',
    sourceTitle: 'Source', publisher: 'Pub', sourceUrl: 'https://example.com',
    sourceType: 'annual_report', publicationDate: '2024-01-01',
    retrievalTimestamp: new Date().toISOString(), pageNumber: null,
    dimensionKey: 'revenue_durability', subdivisionKey: null, urlResolved: true,
    status: 'accepted', rejectionReason: null, sourceOrigin: 'llm_research',
    isMock: false, createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Resilience Classification', () => {
  it('should classify as strong when base >= 3 and all scenarios >= 3', () => {
    const ds = makeDimScore({ maturityLevel: 3 });
    const sas = SCENARIOS.map(s => makeSA({ scenarioKey: s.key, scenarioMaturity: 3 }));
    expect(classifyDimension(ds, sas)).toBe('strong');
  });

  it('should classify as exposed when base < 3', () => {
    const ds = makeDimScore({ maturityLevel: 2 });
    const sas = SCENARIOS.map(s => makeSA({ scenarioKey: s.key, scenarioMaturity: 2 }));
    expect(classifyDimension(ds, sas)).toBe('exposed');
  });

  it('should classify as conditional when some scenarios drop below 3', () => {
    const ds = makeDimScore({ maturityLevel: 3 });
    const sas = [
      makeSA({ scenarioKey: 'revenue_compression', scenarioMaturity: 2 }),
      makeSA({ scenarioKey: 'cloud_cyber_outage', scenarioMaturity: 3 }),
      makeSA({ scenarioKey: 'cogs_margin_squeeze', scenarioMaturity: 3 }),
      makeSA({ scenarioKey: 'talent_attrition', scenarioMaturity: 3 }),
      makeSA({ scenarioKey: 'capital_market_freeze', scenarioMaturity: 3 }),
      makeSA({ scenarioKey: 'ai_disruption_commodity', scenarioMaturity: 3 }),
    ];
    expect(classifyDimension(ds, sas)).toBe('conditional');
  });

  it('should classify as exposed when maturity is null', () => {
    const ds = makeDimScore({ maturityLevel: null });
    expect(classifyDimension(ds, [])).toBe('exposed');
  });
});

describe('Resilience Gaps', () => {
  it('should generate gaps for weakening dimensions', () => {
    const dimScores = [makeDimScore({ maturityLevel: 3 })];
    const sas = [makeSA({ scenarioKey: 'revenue_compression', direction: 'weakens', scenarioMaturity: 2 })];
    const evidence = [makeEvidence()];
    const gaps = generateResilienceGaps('a-1', dimScores, sas, evidence);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0].classification).toBeDefined();
    expect(gaps[0].gapDescription.length).toBeGreaterThan(10);
    expect(gaps[0].businessImplication.length).toBeGreaterThan(10);
    expect(gaps[0].recommendation.length).toBeGreaterThan(10);
  });

  it('should generate gap for base maturity < 3 even without weakening scenario', () => {
    const dimScores = [makeDimScore({ maturityLevel: 2 })];
    const sas = [makeSA({ scenarioKey: 'capital_market_freeze', direction: 'stable', scenarioMaturity: 2 })];
    const gaps = generateResilienceGaps('a-1', dimScores, sas, []);
    expect(gaps.some(g => g.scenarioKey === 'base')).toBe(true);
  });

  it('should not generate gaps for null-maturity dimensions', () => {
    const dimScores = [makeDimScore({ maturityLevel: null })];
    const gaps = generateResilienceGaps('a-1', dimScores, [], []);
    expect(gaps).toHaveLength(0);
  });

  it('should link gaps to supporting evidence IDs', () => {
    const ev = makeEvidence();
    const dimScores = [makeDimScore({ maturityLevel: 3 })];
    const sas = [makeSA({ scenarioKey: 'storm_and_signal', direction: 'weakens', scenarioMaturity: 2 })];
    const gaps = generateResilienceGaps('a-1', dimScores, sas, [ev]);
    expect(gaps[0].supportingEvidenceIds).toContain(ev.id);
  });

  it('should not produce implementation roadmaps or consulting plans', () => {
    const dimScores = [makeDimScore({ maturityLevel: 2 })];
    const sas = [makeSA({ direction: 'weakens', scenarioMaturity: 1 })];
    const gaps = generateResilienceGaps('a-1', dimScores, sas, []);
    for (const gap of gaps) {
      const lower = gap.recommendation.toLowerCase();
      expect(lower).not.toContain('implementation plan');
      expect(lower).not.toContain('roadmap');
      expect(lower).not.toContain('investment advice');
      expect(lower).not.toContain('operational playbook');
    }
  });

  it('gap recommendation should reference the dimension name', () => {
    const dimScores = [makeDimScore({ maturityLevel: 2, dimensionKey: 'liquidity_runway' })];
    const sas = [makeSA({ dimensionKey: 'liquidity_runway', direction: 'weakens', scenarioMaturity: 1 })];
    const gaps = generateResilienceGaps('a-1', dimScores, sas, []);
    const relGaps = gaps.filter(g => g.dimensionKey === 'liquidity_runway');
    expect(relGaps.length).toBeGreaterThan(0);
    expect(relGaps.some(g => g.recommendation.includes('Liquidity'))).toBe(true);
  });
});

describe('Early Warning Indicators', () => {
  it('should generate indicators for weakening dimensions', () => {
    const dimScores = [makeDimScore({ maturityLevel: 3 })];
    const sas = [makeSA({ direction: 'weakens', scenarioMaturity: 2 })];
    const indicators = generateEarlyWarningIndicators(dimScores, sas);
    expect(indicators.length).toBeGreaterThan(0);
    expect(indicators[0].indicator.length).toBeGreaterThan(5);
    expect(indicators[0].trigger.length).toBeGreaterThan(5);
  });

  it('should generate indicators for low base maturity dimensions', () => {
    const dimScores = [makeDimScore({ maturityLevel: 2 })];
    const indicators = generateEarlyWarningIndicators(dimScores, []);
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('should not generate indicators for strong dimensions', () => {
    const dimScores = [makeDimScore({ maturityLevel: 4 })];
    const sas = SCENARIOS.map(s => makeSA({ scenarioKey: s.key, direction: 'stable', scenarioMaturity: 4 }));
    const indicators = generateEarlyWarningIndicators(dimScores, sas);
    expect(indicators).toHaveLength(0);
  });

  it('should have indicators for all 15 dimensions', () => {
    const dimScores = DIMENSIONS.map(d => makeDimScore({ dimensionKey: d.key, maturityLevel: 2 }));
    const indicators = generateEarlyWarningIndicators(dimScores, []);
    const dimKeys = [...new Set(indicators.map(i => i.dimensionKey))];
    expect(dimKeys.length).toBe(15);
  });
});

describe('Store: Resilience Gaps', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { setResilienceGaps, getResilienceGaps } = require('@/lib/db/store');
  it('should store and retrieve gaps', () => {
    const assessmentId = uuidv4();
    const gaps = [
      {
        id: uuidv4(), assessmentId, dimensionKey: 'revenue_durability',
        subdivisionKey: null, currentMaturity: 3, scenarioKey: 'exposed_and_reactive',
        scenarioMaturity: 2, gapDescription: 'Test gap', businessImplication: 'Test implication',
        recommendation: 'Test recommendation', supportingEvidenceIds: [],
        classification: 'exposed' as const, createdAt: new Date().toISOString(),
      },
    ];
    setResilienceGaps(assessmentId, gaps);
    const retrieved = getResilienceGaps(assessmentId);
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].dimensionKey).toBe('revenue_durability');
  });
});
