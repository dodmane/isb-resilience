import { v4 as uuidv4 } from 'uuid';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  createAssessment,
  getAssessment,
  updateAssessment,
  upsertStageApproval,
  getStageApprovals,
} from '@/lib/db/store';
import { canAdvanceToStage } from '@/lib/workflow/stages';
import { type Assessment, type AssessmentStage } from '@/types/assessment';

describe('Phase 2 Workflow Integration', () => {
  const assessmentId = uuidv4();

  beforeAll(() => {
    const storePath = path.join(process.cwd(), '.aurora-data', 'store.json');
    if (existsSync(storePath)) {
      const store = JSON.parse(readFileSync(storePath, 'utf-8'));
      if (store.assessments.find((a: Assessment) => a.id === assessmentId)) return;
    }

    createAssessment({
      id: assessmentId,
      companyName: 'Workflow Test Co',
      companyDescription: 'Test company',
      industry: 'SaaS',
      companySize: 'medium',
      dataSourceMode: 'public',
      currentStage: 1 as AssessmentStage,
      assessmentLens: 'SaaS/IT',
      scenarioNarratives: {},
      dimensionSelections: [],
      evidencePlan: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('should not advance from stage 1 to stage 3 (skipping stage 2)', () => {
    upsertStageApproval({
      id: uuidv4(),
      assessmentId,
      stage: 1 as AssessmentStage,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      notes: '',
    });

    const approvals = getStageApprovals(assessmentId).map(a => ({
      stage: a.stage, status: a.status,
    }));

    expect(canAdvanceToStage(2 as AssessmentStage, approvals)).toBe(true);
    expect(canAdvanceToStage(3 as AssessmentStage, approvals)).toBe(false);
  });

  it('should advance through stages 1-5 with sequential approvals', () => {
    for (let stage = 1; stage <= 4; stage++) {
      upsertStageApproval({
        id: uuidv4(),
        assessmentId,
        stage: stage as AssessmentStage,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        notes: `Stage ${stage} approved`,
      });
    }

    const approvals = getStageApprovals(assessmentId).map(a => ({
      stage: a.stage, status: a.status,
    }));

    expect(canAdvanceToStage(5 as AssessmentStage, approvals)).toBe(true);
    expect(canAdvanceToStage(6 as AssessmentStage, approvals)).toBe(false);
  });

  it('should store dimension selections on assessment', () => {
    const selections = [
      { dimensionKey: 'revenue_durability', selected: true, deepAssessment: true, relevanceRationale: 'Core SaaS metric' },
      { dimensionKey: 'opex_elasticity', selected: true, deepAssessment: true, relevanceRationale: 'Cost flexibility' },
      { dimensionKey: 'business_development_ma', selected: true, deepAssessment: false, relevanceRationale: 'Less material' },
    ];

    updateAssessment(assessmentId, { dimensionSelections: selections });
    const updated = getAssessment(assessmentId);
    expect(updated?.dimensionSelections).toHaveLength(3);
    expect(updated?.dimensionSelections?.find(s => s.dimensionKey === 'revenue_durability')?.deepAssessment).toBe(true);
    expect(updated?.dimensionSelections?.find(s => s.dimensionKey === 'business_development_ma')?.deepAssessment).toBe(false);
  });

  it('should store evidence plan on assessment', () => {
    const plan = [
      { dimensionKey: 'revenue_durability', subdivisionKey: 'retention_nrr', searchTargets: ['NRR'], sourceTypes: ['annual_report'], notes: '' },
      { dimensionKey: 'revenue_durability', subdivisionKey: 'pricing_power_mix', searchTargets: ['pricing'], sourceTypes: ['annual_report'], notes: '' },
    ];

    updateAssessment(assessmentId, { evidencePlan: plan });
    const updated = getAssessment(assessmentId);
    expect(updated?.evidencePlan).toHaveLength(2);
    expect(updated?.evidencePlan?.[0].subdivisionKey).toBe('retention_nrr');
  });

  it('should store scenario narratives on assessment', () => {
    const narratives = {
      autonomous_advantage: 'Test narrative 1',
      storm_and_signal: 'Test narrative 2',
      managed_modernization: 'Test narrative 3',
      exposed_and_reactive: 'Test narrative 4',
    };

    updateAssessment(assessmentId, { scenarioNarratives: narratives });
    const updated = getAssessment(assessmentId);
    expect(Object.keys(updated?.scenarioNarratives || {})).toHaveLength(4);
  });

  it('should not allow stage 5 approval before stage 4 is approved', () => {
    // Create a fresh assessment for this test
    const freshId = uuidv4();
    createAssessment({
      id: freshId,
      companyName: 'Fresh Co',
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
    });

    // Approve stages 1, 2, 3 but NOT 4
    for (let stage = 1; stage <= 3; stage++) {
      upsertStageApproval({
        id: uuidv4(),
        assessmentId: freshId,
        stage: stage as AssessmentStage,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        notes: '',
      });
    }

    const approvals = getStageApprovals(freshId).map(a => ({
      stage: a.stage, status: a.status,
    }));

    expect(canAdvanceToStage(4 as AssessmentStage, approvals)).toBe(true);
    expect(canAdvanceToStage(5 as AssessmentStage, approvals)).toBe(false);
  });
});
