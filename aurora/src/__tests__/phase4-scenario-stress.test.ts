import { v4 as uuidv4 } from 'uuid';
import {
  createAssessment,
  getScenarioAssessments,
  upsertScenarioAssessment,
} from '@/lib/db/store';
import { SCENARIOS } from '@/lib/framework/scenarios';
import { type AssessmentStage, type MaturityLevel } from '@/types/assessment';
import { type ScenarioAssessment } from '@/types/scenario';

describe('Phase 4: Scenario Stress Test Store', () => {
  const assessmentId = uuidv4();

  beforeAll(() => {
    createAssessment({
      id: assessmentId,
      companyName: 'Scenario Test Co',
      companyDescription: '',
      industry: 'SaaS',
      companySize: 'medium',
      dataSourceMode: 'public',
      currentStage: 8 as AssessmentStage,
      assessmentLens: 'SaaS/IT',
      scenarioNarratives: {},
      dimensionSelections: [],
      evidencePlan: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('should create scenario assessments for each scenario × dimension', () => {
    const now = new Date().toISOString();
    for (const scenario of SCENARIOS) {
      const sa: ScenarioAssessment = {
        id: uuidv4(),
        assessmentId,
        scenarioKey: scenario.key,
        dimensionKey: 'revenue_durability',
        baseMaturity: 3,
        scenarioMaturity: scenario.key === 'exposed_and_reactive' ? 2 : 3,
        direction: scenario.key === 'exposed_and_reactive' ? 'weakens' : 'stable',
        rationale: `Test rationale for ${scenario.name}`,
        confidence: 'medium',
        relevantEvidenceIds: [],
        userApproved: false,
        overrideReason: null,
        isMockRecommendation: true,
        createdAt: now,
        updatedAt: now,
      };
      upsertScenarioAssessment(sa);
    }

    const all = getScenarioAssessments(assessmentId);
    expect(all.length).toBe(4);
  });

  it('should store all 4 charter-defined scenario keys', () => {
    const all = getScenarioAssessments(assessmentId);
    const keys = [...new Set(all.map(a => a.scenarioKey))];
    expect(keys.sort()).toEqual([
      'autonomous_advantage',
      'exposed_and_reactive',
      'managed_modernization',
      'storm_and_signal',
    ]);
  });

  it('should require rationale for every scenario assessment', () => {
    const all = getScenarioAssessments(assessmentId);
    for (const sa of all) {
      expect(sa.rationale).toBeTruthy();
      expect(sa.rationale.length).toBeGreaterThan(5);
    }
  });

  it('should track user approval per assessment', () => {
    const all = getScenarioAssessments(assessmentId);
    const first = all[0];
    expect(first.userApproved).toBe(false);

    const approved: ScenarioAssessment = { ...first, userApproved: true, updatedAt: new Date().toISOString() };
    upsertScenarioAssessment(approved);

    const refreshed = getScenarioAssessments(assessmentId);
    const found = refreshed.find(s => s.scenarioKey === first.scenarioKey && s.dimensionKey === first.dimensionKey);
    expect(found?.userApproved).toBe(true);
  });

  it('should allow override with mandatory reason', () => {
    const all = getScenarioAssessments(assessmentId);
    const target = all.find(s => s.scenarioKey === 'storm_and_signal');
    expect(target).toBeDefined();

    const overridden: ScenarioAssessment = {
      ...target!,
      scenarioMaturity: 1 as MaturityLevel,
      direction: 'weakens',
      overrideReason: 'Significant cyber exposure under this scenario based on recent incidents',
      userApproved: true,
      isMockRecommendation: false,
      updatedAt: new Date().toISOString(),
    };
    upsertScenarioAssessment(overridden);

    const refreshed = getScenarioAssessments(assessmentId);
    const found = refreshed.find(s => s.scenarioKey === 'storm_and_signal');
    expect(found?.scenarioMaturity).toBe(1);
    expect(found?.overrideReason).toContain('cyber exposure');
    expect(found?.userApproved).toBe(true);
  });

  it('should preserve base maturity separately from scenario maturity', () => {
    const all = getScenarioAssessments(assessmentId);
    for (const sa of all) {
      expect(sa.baseMaturity).toBeDefined();
      expect(sa.scenarioMaturity).toBeDefined();
      // base and scenario are independent fields
      if (sa.direction === 'weakens') {
        expect(sa.scenarioMaturity!).toBeLessThan(sa.baseMaturity!);
      }
    }
  });

  it('should track direction (strengthens/stable/weakens) per assessment', () => {
    const all = getScenarioAssessments(assessmentId);
    for (const sa of all) {
      expect(['strengthens', 'stable', 'weakens']).toContain(sa.direction);
    }
  });

  it('should track confidence separately per scenario assessment', () => {
    const all = getScenarioAssessments(assessmentId);
    for (const sa of all) {
      expect(['high', 'medium', 'low']).toContain(sa.confidence);
    }
  });

  it('should upsert existing scenario assessment on same key pair', () => {
    const all = getScenarioAssessments(assessmentId);
    const countBefore = all.length;

    const existing = all[0];
    const updated: ScenarioAssessment = {
      ...existing,
      rationale: 'Updated rationale after review',
      updatedAt: new Date().toISOString(),
    };
    upsertScenarioAssessment(updated);

    const after = getScenarioAssessments(assessmentId);
    expect(after.length).toBe(countBefore);
    const found = after.find(s => s.scenarioKey === existing.scenarioKey && s.dimensionKey === existing.dimensionKey);
    expect(found?.rationale).toBe('Updated rationale after review');
  });
});
