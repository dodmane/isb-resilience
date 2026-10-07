import { getCriteria, evaluateCriteria, RUBRIC_VERSION, type ScoringPolicy, type CriterionFinding } from '@/lib/framework/criteria';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { type Evidence } from '@/types/evidence';

const policy: ScoringPolicy = { rubricVersion: RUBRIC_VERSION, profile: 'standard', periodStart: '2025-01-01', periodEnd: '2025-12-31', approvedAt: '2026-01-01', approvalReason: 'Academic pilot policy agreed before assessment' };
const source: Evidence = { id: 'evidence', assessmentId: 'assessment', claim: 'Documented independent operating review and successful tests', extractedValue: '105', supportingExcerpt: 'Documented operating review: NRR 105%, downside 99%, scope 100%, prior scope 80%; successful tests 2025-06-01 and 2025-12-31.', sourceTitle: 'Report', publisher: 'Auditor', sourceUrl: null, sourceType: 'uploaded_document', publicationDate: '2025-12-31', retrievalTimestamp: '', pageNumber: null, dimensionKey: 'revenue_durability', subdivisionKey: 'retention_nrr', urlResolved: false, status: 'accepted', rejectionReason: null, sourceOrigin: 'user_uploaded', isMock: false, createdAt: '' };
function findings(): CriterionFinding[] {
  return getCriteria('retention_nrr').map(criterion => ({ criterionId: criterion.id, status: 'met', value: criterion.id === 'outcome' ? 105 : criterion.id === 'repeatable' ? 2 : criterion.id === 'scope' ? 100 : null,
    evidenceId: source.id, quote: source.supportingExcerpt, observedAt: '2025-12-31', rationale: 'Reviewed supporting records', basis: 'record',
    observationDates: criterion.id === 'repeatable' ? ['2025-06-01', '2025-12-31'] : undefined }));
}

describe('Governed SaaS criteria', () => {
  it('defines eight measurable criteria for all 45 existing sub-dimensions', () => {
    const subs = Object.values(SUBDIVISIONS).flat();
    expect(subs).toHaveLength(45);
    for (const sub of subs) expect(getCriteria(sub.key)).toHaveLength(8);
  });
  it('assigns Level and Position using cumulative gates', () => {
    expect(evaluateCriteria('retention_nrr', findings(), [source], policy)).toMatchObject({ maturityLevel: 4, position: 'High' });
    const inputs = findings();
    inputs[4].status = 'not_met';
    inputs[7].value = 80;
    expect(evaluateCriteria('retention_nrr', inputs, [source], policy)).toMatchObject({ maturityLevel: 3, position: 'Mid' });
  });
  it('uses numeric thresholds rather than the LLM met assertion', () => {
    const inputs = findings();
    inputs[2].value = 99;
    expect(evaluateCriteria('retention_nrr', inputs, [source], policy).maturityLevel).toBe(2);
  });
  it('does not convert unknown eligibility into weakness', () => {
    const inputs = findings();
    inputs[2].status = 'unknown';
    expect(evaluateCriteria('retention_nrr', inputs, [source], policy).maturityLevel).toBeNull();
  });
  it.each(['fabricated', 'duplicate', 'mock', 'stale', 'missing_numeric'])('rejects %s evidence findings', problem => {
    const inputs = findings();
    const evidence = { ...source };
    if (problem === 'fabricated') inputs[0].quote = 'This quotation does not exist in the source';
    if (problem === 'duplicate') inputs[1].criterionId = inputs[0].criterionId;
    if (problem === 'mock') evidence.isMock = true;
    if (problem === 'stale') inputs[0].observedAt = '2024-12-31';
    if (problem === 'missing_numeric') inputs[2].value = null;
    expect(() => evaluateCriteria('retention_nrr', inputs, [evidence], policy)).toThrow();
  });
  it('uses fixed profile thresholds, not company-specific thresholds', () => {
    expect(getCriteria('disaster_recovery_bcp', 'standard')[2].threshold).toBe(4);
    expect(getCriteria('disaster_recovery_bcp', 'critical')[2].threshold).toBe(1);
    expect(() => evaluateCriteria('retention_nrr', findings(), [source], { ...policy, rubricVersion: 'old' })).toThrow();
  });
  it('rejects unverified claims and fabricated numeric values', () => {
    const inputs = findings();
    inputs[0].basis = 'claim';
    expect(() => evaluateCriteria('retention_nrr', inputs, [source], policy)).toThrow('claims');
    inputs[0].basis = 'record';
    inputs[2].value = 123;
    expect(() => evaluateCriteria('retention_nrr', inputs, [source], policy)).toThrow('numeric value');
  });
  it('rejects fabricated observation dates and impossible calendar dates', () => {
    const inputs = findings();
    inputs[3].observationDates = ['2025-11-01', '2025-12-31'];
    expect(() => evaluateCriteria('retention_nrr', inputs, [source], policy)).toThrow('observation dates');
    expect(() => evaluateCriteria('retention_nrr', findings(), [source], { ...policy, periodEnd: '2025-02-31' })).toThrow();
  });
  it('matches ISO observation dates to exact excerpts written as month-name dates', () => {
    const excerpt = 'Net revenue retention rate was 99% as of October 31, 2024, compared to 99% as of October 31, 2023.';
    const evidence = { ...source, supportingExcerpt: excerpt };
    const inputs = findings().map(finding => ({ ...finding, quote: excerpt, observedAt: '2024-10-31' }));
    inputs[2].value = 99;
    inputs[3].observationDates = ['2023-10-31', '2024-10-31'];
    inputs[7].value = 99;
    const result = evaluateCriteria('retention_nrr', inputs, [evidence], {
      ...policy, periodStart: '2023-01-01', periodEnd: '2024-12-31', approvedAt: '2025-01-01',
    });

    expect(result.resolved[3]).toBe('met');
    expect(result.maturityLevel).toBe(2);
  });
});