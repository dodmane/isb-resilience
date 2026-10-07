'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Download, Check, X, AlertTriangle } from 'lucide-react';
import { getCriteria, evaluateCriteria, validPolicy, getCriterionReviewMode, RUBRIC_VERSION, type ScoringPolicy, type CriterionFinding, type CriterionInputField, type CriterionValidationIssue, type CriterionReviewMode, type SaaSProfile } from '@/lib/framework/criteria';
import { normalize, summarizeAssessment, summarizeDimension, subdivisionNumericScore, scoreToMaturity, isScoringPosition, NORMALIZATION_RANGES, POSITION_POINTS, type ScoringPosition } from '@/lib/framework/scoring';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { SourceLink } from './SourceLink';
import { MaturityBadge } from './MaturityBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { type Assessment, type MaturityLevel, type ScoringMethod } from '@/types/assessment';
import { type SubdivisionScore } from '@/types/scoring';
import { type Evidence } from '@/types/evidence';

const inputClass = 'border rounded px-2 py-1.5 bg-background text-sm w-full min-w-0';

export function ScoringMethodControl({ assessment, onRefresh }: { assessment: Assessment; onRefresh: () => Promise<void> }) {
  const method = assessment.scoringMethod || (assessment.scoringPolicy?.reviewMode === 'manual' ? 'manual' : 'llm_assisted');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function choose(nextMethod: ScoringMethod) {
    if (saving || method === nextMethod) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/assessments/${assessment.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoringMethod: nextMethod }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not change scoring method');
      setError('');
      await onRefresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not change scoring method'); }
    finally { setSaving(false); }
  }

  return <section className="border-y py-4 space-y-2">
    <p className="text-sm font-semibold">Rating method</p>
    <div role="group" aria-label="Rating method" className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant={method === 'llm_assisted' ? 'default' : 'outline'} aria-pressed={method === 'llm_assisted'} disabled={saving}
        onClick={() => choose('llm_assisted')}>AI suggestions</Button>
      <Button type="button" size="sm" variant={method === 'manual' ? 'default' : 'outline'} aria-pressed={method === 'manual'} disabled={saving}
        onClick={() => choose('manual')}>Manual entry</Button>
    </div>
    <p className="text-xs text-muted-foreground">AI suggests Level and Position from accepted evidence; you confirm or edit each rating. Manual entry skips AI. Unsupported ratings can stay unscored.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}

export function SubdimensionRatingReview({ assessmentId, dimensionKey, subdivisionKey, score, evidence, onSaved, onCancel }: {
  assessmentId: string; dimensionKey: string; subdivisionKey: string; score?: SubdivisionScore;
  evidence: Evidence[]; onSaved: () => Promise<void>; onCancel: () => void;
}) {
  const [level, setLevel] = useState(score?.maturityLevel?.toString() || '');
  const [position, setPosition] = useState<ScoringPosition | ''>(score?.status === 'stale' ? '' : score?.position || '');
  const [evidenceIds, setEvidenceIds] = useState<string[]>(score?.evidenceIds || []);
  const [rationale, setRationale] = useState(score?.rationale || '');
  const [reviewer, setReviewer] = useState('');
  const [confidence, setConfidence] = useState(score?.confidence || 'medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const numericLevel = level === '' ? null : Number(level) as MaturityLevel;
  const preview = numericLevel && isScoringPosition(position) ? normalize(numericLevel, position) : null;

  function toggleEvidence(id: string) {
    setEvidenceIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/subdivision-scores`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratingMethod: 'level_position', dimensionKey, subdivisionKey,
          maturityLevel: numericLevel, position: numericLevel ? position || null : null,
          evidenceIds, rationale, reviewedBy: reviewer, confidence }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not save rating');
      setError('');
      await onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save rating'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-3 border-t pt-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="text-xs">Level<select aria-label="Rating level" className={inputClass} value={level} onChange={event => setLevel(event.target.value)}>
        <option value="">Not scored</option>{([1, 2, 3, 4] as MaturityLevel[]).map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label className="text-xs">Position<select aria-label="Rating position" className={inputClass} value={position} disabled={!level}
        onChange={event => setPosition(event.target.value as ScoringPosition | '')}>
        <option value="">Select position</option><option value="Low">Low (+3)</option><option value="Mid">Mid (+12)</option><option value="High">High (+21)</option>
      </select></label>
    </div>
    <p className="text-sm font-medium">{preview === null ? 'No numeric score until Level and Position are selected.' : `Calculated sub-dimension score: ${preview}/100`}</p>
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium">Supporting accepted evidence</legend>
      {evidence.filter(item => item.status === 'accepted' && !item.isMock).length === 0
        ? <p className="text-xs text-muted-foreground">No accepted evidence is available. Add/accept evidence first, or leave this rating unscored.</p>
        : evidence.filter(item => item.status === 'accepted' && !item.isMock).map(item => <label key={item.id} className="flex items-start gap-2 text-xs">
          <input type="checkbox" checked={evidenceIds.includes(item.id)} onChange={() => toggleEvidence(item.id)} />
          <span>{item.sourceTitle} · {item.publicationDate || 'Undated'} · {item.claim}</span>
        </label>)}
    </fieldset>
    <Textarea aria-label="Rating rationale" placeholder="Why does the evidence support this Level and Position?" value={rationale} onChange={event => setRationale(event.target.value)} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="text-xs">Reviewer<input aria-label="Rating reviewer" className={inputClass} value={reviewer} onChange={event => setReviewer(event.target.value)} /></label>
      <label className="text-xs">Confidence<select aria-label="Rating confidence" className={inputClass} value={confidence} onChange={event => setConfidence(event.target.value as 'low' | 'medium' | 'high')}>
        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
      </select></label>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex gap-2"><Button size="sm" onClick={save} disabled={saving || !reviewer.trim() || (!!level && !position)}>{saving ? 'Saving...' : 'Confirm Rating'}</Button>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button></div>
  </div>;
}

export function EvidenceWindowNotice({ policy, evidence, scores }: {
  policy?: ScoringPolicy; evidence: Evidence[]; scores: SubdivisionScore[];
}) {
  if (!validPolicy(policy)) return null;
  const datedEvidence = evidence.filter(item => item.status === 'accepted' && !item.isMock && item.publicationDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.publicationDate) && Number.isFinite(Date.parse(item.publicationDate)));
  const outsidePublications = datedEvidence.filter(item => item.publicationDate! < policy.periodStart || item.publicationDate! > policy.periodEnd);
  const observationDates = [...new Set(scores.flatMap(score => [
    score.extractionIssue?.code === 'reporting_window' ? score.extractionIssue.observedAt : null,
    ...(score.criteria || []).map(finding => finding.observedAt),
  ]).filter((date): date is string => !!date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date))))].sort();
  const outsideObservations = observationDates.filter(date => date < policy.periodStart || date > policy.periodEnd);
  if (!outsidePublications.length && !outsideObservations.length) return null;
  const publicationDates = datedEvidence.map(item => item.publicationDate!).sort();
  const earlierDates = [...outsideObservations, ...outsidePublications.map(item => item.publicationDate!)].filter(date => date < policy.periodStart).sort();
  const candidateStart = earlierDates.length ? `${earlierDates[0].slice(0, 4)}-01-01` : null;

  return <section role="status" aria-label="Evidence reporting window guidance" className="border-l-4 border-amber-500 pl-4 py-2 space-y-2 text-sm break-words">
    <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />Review the reporting dates against collected evidence</h3>
    <p>Frozen evaluation window: <strong>{policy.periodStart} to {policy.periodEnd}</strong>.</p>
    {publicationDates.length > 0 && <p>Accepted source publication dates: {publicationDates[0]} to {publicationDates[publicationDates.length - 1]}.
      {' '}{outsidePublications.length} of {datedEvidence.length} dated records were published outside the window.</p>}
    {outsideObservations.length > 0 && <p>Extracted observation dates outside the window: <strong>{outsideObservations.join(', ')}</strong>. Verify these against the cited records.</p>}
    <p>Publication dates and fiscal-year labels are not measurement dates. Older publications alone do not prove a date mismatch; review the actual dates in the supporting excerpts.</p>
    {candidateStart && <p>For a historical evaluation using these records, consider <strong>{candidateStart}</strong> as the start date in a new assessment, then choose an end date matching the intended historical period. Confirm the measurement dates before freezing the new window.</p>}
    <p>The current policy is frozen. Either create a separate historical assessment with appropriate dates, or return to Evidence Gathering and collect measurements within {policy.periodStart} to {policy.periodEnd}. Do not change dates on evidence to make it qualify.</p>
    <p className="text-xs text-muted-foreground">Changing the reporting window only addresses date eligibility. Exact citations, required measurements, repeatability and reviewer approval are still required; no score is guaranteed.</p>
    {outsidePublications.length > 0 && <details className="text-xs">
      <summary className="cursor-pointer font-medium">Sources to check ({outsidePublications.length})</summary>
      <ul className="list-disc pl-5 mt-2 space-y-1">{outsidePublications.map(item =>
        <li key={item.id}>{item.sourceTitle} · {item.publicationDate}</li>
      )}</ul>
    </details>}
  </section>;
}

export function ScoringPolicyControls({ assessment, onRefresh }: { assessment: Assessment; onRefresh: () => Promise<void> }) {
  const [profile, setProfile] = useState<SaaSProfile>('standard');
  const [reviewMode, setReviewMode] = useState<CriterionReviewMode>('llm_assisted');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const policy = assessment.scoringPolicy;
  const activeReviewMode = policy ? getCriterionReviewMode(policy) : reviewMode;

  async function selectReviewMode(nextMode: CriterionReviewMode) {
    if (!policy) {
      setReviewMode(nextMode);
      return;
    }
    if (nextMode === getCriterionReviewMode(policy)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/scoring-policy`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewMode: nextMode }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not change review method');
      setError('');
      await onRefresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not change review method'); }
    finally { setBusy(false); }
  }

  async function freeze() {
    setBusy(true);
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/scoring-policy`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, reviewMode, periodStart: start, periodEnd: end, approvalReason: reason, acknowledged }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not freeze policy');
      setError('');
      await onRefresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Policy could not be saved'); }
    finally { setBusy(false); }
  }

  async function download() {
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/scoring-policy`);
      if (!response.ok) throw new Error('Could not export criterion catalog');
      const url = URL.createObjectURL(new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${RUBRIC_VERSION}-catalog.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Export failed'); }
  }

  return <section className="border-y py-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold text-base">SaaS Criterion Policy</h3>
      <Button size="sm" variant="outline" onClick={download}><Download className="h-4 w-4 mr-1" />Criterion Catalog</Button>
    </div>
    <p className="text-xs text-amber-700">{RUBRIC_VERSION} · Provisional academic policy · Not empirically validated</p>
    <div className="space-y-2">
      <p className="text-xs font-semibold">Criterion review method</p>
      <div role="group" aria-label="Criterion review method" className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={activeReviewMode === 'manual' ? 'default' : 'outline'} aria-pressed={activeReviewMode === 'manual'} disabled={busy}
          onClick={() => selectReviewMode('manual')}>Manual</Button>
        <Button type="button" size="sm" variant={activeReviewMode === 'llm_assisted' ? 'default' : 'outline'} aria-pressed={activeReviewMode === 'llm_assisted'} disabled={busy}
          onClick={() => selectReviewMode('llm_assisted')}>LLM-assisted</Button>
      </div>
      <p className="text-xs text-muted-foreground">{activeReviewMode === 'manual'
        ? 'Enter criterion findings yourself. LLM extraction is disabled.'
        : 'The LLM drafts criterion findings from accepted evidence. The framework applies the criteria and calculates the score; a reviewer must confirm before it counts.'}</p>
      {policy && <p className="text-xs text-muted-foreground">Changing this method does not change the frozen rubric, profile or dates. It is audit-logged and reopens Stage 6 approval.</p>}
    </div>
    {policy ? <div className="text-sm flex flex-wrap items-center gap-3">
      <Lock className="h-4 w-4" /><span>{policy.profile === 'critical' ? 'Critical-service SaaS' : 'Standard SaaS'}</span>
      <span>{policy.periodStart} to {policy.periodEnd}</span><span>Frozen {policy.approvedAt.slice(0, 10)}</span>
      <p className="basis-full text-xs text-muted-foreground break-words">Approval: {policy.approvalReason}</p>
    </div> : <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs space-y-1">Operating profile<select aria-label="SaaS operating profile" className={inputClass} value={profile} onChange={event => setProfile(event.target.value as SaaSProfile)}>
          <option value="standard">Standard SaaS</option><option value="critical">Critical-service SaaS</option>
        </select></label>
        <label className="text-xs space-y-1">Reporting start<input aria-label="Reporting start" type="date" className={inputClass} value={start} onChange={event => setStart(event.target.value)} /></label>
        <label className="text-xs space-y-1">Reporting end<input aria-label="Reporting end" type="date" className={inputClass} value={end} onChange={event => setEnd(event.target.value)} /></label>
      </div>
      <Textarea aria-label="Policy approval reason" placeholder="Approval reason and profile-selection rationale" value={reason} onChange={event => setReason(event.target.value)} />
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
        I approve this provisional rubric before rating and accept that the profile and reporting dates are fixed for this assessment.
      </label>
      <Button disabled={busy || !acknowledged || !start || !end || !reason.trim()} onClick={freeze}><Lock className="h-4 w-4 mr-1" />{busy ? 'Saving...' : 'Freeze Policy'}</Button>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}

export function CriterionReview({ assessmentId, dimensionKey, subdivisionKey, score, evidence, policy, onSaved, onCancel }: {
  assessmentId: string; dimensionKey: string; subdivisionKey: string; score?: SubdivisionScore;
  evidence: Evidence[]; policy: ScoringPolicy; onSaved: () => Promise<void>; onCancel: () => void;
}) {
  const criteria = getCriteria(subdivisionKey, policy.profile);
  const [findings, setFindings] = useState<CriterionFinding[]>(() => criteria.map(criterion => score?.criteria?.find(finding => finding.criterionId === criterion.id) || {
    criterionId: criterion.id, status: 'unknown', basis: 'unknown', value: null, evidenceId: null, quote: '', observedAt: null, rationale: 'Evidence not yet established',
  }));
  const [reviewer, setReviewer] = useState('');
  const [reason, setReason] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [validationIssue, setValidationIssue] = useState<CriterionValidationIssue | null>(() => score?.extractionIssue || null);
  let preview = 'Incomplete criterion findings';
  try {
    const result = evaluateCriteria(subdivisionKey, findings, evidence, policy);
    preview = result.maturityLevel && result.position ? `Level ${result.maturityLevel} · ${result.position} · ${normalize(result.maturityLevel, result.position)}/100` : result.reason;
  } catch (failure) { preview = failure instanceof Error ? failure.message : preview; }

  function update(index: number, changes: Partial<CriterionFinding>) {
    setFindings(current => current.map((finding, findingIndex) => findingIndex === index ? { ...finding, ...changes } : finding));
    const criterionId = criteria[index].id;
    setValidationIssue(current => current?.criterionId === criterionId ? null : current);
    setError('');
  }

  function hasFieldIssue(field: CriterionInputField, criterionId: string | null = null) {
    return validationIssue?.criterionId === criterionId && validationIssue.fields.includes(field);
  }

  function fieldClass(field: CriterionInputField, criterionId: string | null = null) {
    return `${inputClass} ${hasFieldIssue(field, criterionId) ? 'border-red-600 ring-1 ring-red-600' : ''}`;
  }

  function clearFieldIssue(field: CriterionInputField) {
    setValidationIssue(current => {
      if (current?.criterionId !== null || !current.fields.includes(field)) return current;
      const fields = current.fields.filter(item => item !== field);
      return fields.length ? { ...current, fields } : null;
    });
    setError('');
  }

  async function save() {
    setBusy(true);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/subdivision-scores`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensionKey, subdivisionKey, criteria: findings, reviewedBy: reviewer, overrideReason: reason,
          scoreOverride: endpoint === '' ? null : Number(endpoint) }) });
      if (!response.ok) {
        const result = await response.json();
        const issue = result.validationIssue as CriterionValidationIssue | null;
        setValidationIssue(issue);
        setError(issue?.criterionId ? '' : result.error || 'Could not review criteria');
        return;
      }
      setValidationIssue(null);
      setError('');
      await onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Review could not be saved'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4 border-t pt-3">
    {validationIssue?.criterionId === null && <p role="alert" className="text-xs text-amber-700 break-words">{validationIssue.message}</p>}
    {criteria.map((criterion, index) => {
      const finding = findings[index];
      const issue = validationIssue?.criterionId === criterion.id ? validationIssue : null;
      const issueId = `criterion-${criterion.id}-error`;
      return <fieldset key={criterion.id} className="border-b pb-3 space-y-2 min-w-0">
        <legend className={`text-xs font-semibold ${issue ? 'text-red-700' : ''}`}>{criterion.level === 'position' ? 'Position' : `Level ${criterion.level}`} · {criterion.id}{issue && ' · Needs attention'}</legend>
        <p className="text-xs break-words">{criterion.requirement}{criterion.operator && ` (${criterion.operator} ${criterion.threshold} ${criterion.unit})`}</p>
        {issue && <p id={issueId} role="alert" className="text-xs text-red-700 break-words">{issue.message}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-xs">Finding<select aria-label={`${criterion.id} finding`} aria-invalid={hasFieldIssue('finding', criterion.id)} aria-describedby={hasFieldIssue('finding', criterion.id) ? issueId : undefined} className={fieldClass('finding', criterion.id)} value={finding.status}
            onChange={event => update(index, { status: event.target.value as CriterionFinding['status'], basis: event.target.value === 'unknown' ? 'unknown' : 'record' })}>
            <option value="unknown">Unknown</option><option value="met">Met</option><option value="not_met">Not Met</option>
          </select></label>
          <label className="text-xs">Supporting record<select aria-label={`${criterion.id} evidence`} aria-invalid={hasFieldIssue('supportingRecord', criterion.id)} aria-describedby={hasFieldIssue('supportingRecord', criterion.id) ? issueId : undefined} className={fieldClass('supportingRecord', criterion.id)} value={finding.evidenceId || ''}
            onChange={event => { const source = evidence.find(item => item.id === event.target.value); update(index, { evidenceId: source?.id || null, quote: source?.supportingExcerpt || source?.claim || '' }); }}>
            <option value="">Select evidence</option>{evidence.filter(item => item.status === 'accepted' && !item.isMock).map(item => <option key={item.id} value={item.id}>{item.sourceTitle}</option>)}
          </select></label>
          {criterion.operator && <label className="text-xs">Measured value ({criterion.unit})<input aria-label={`${criterion.id} value`} aria-invalid={hasFieldIssue('measuredValue', criterion.id)} aria-describedby={hasFieldIssue('measuredValue', criterion.id) ? issueId : undefined} type="number" min={0} step="any" className={fieldClass('measuredValue', criterion.id)}
            value={finding.value ?? ''} onChange={event => update(index, { value: event.target.value === '' ? null : Number(event.target.value) })} /></label>}
          <label className="text-xs">Observation date<input aria-label={`${criterion.id} observation date`} aria-invalid={hasFieldIssue('observationDate', criterion.id)} aria-describedby={hasFieldIssue('observationDate', criterion.id) ? issueId : undefined} type="date" className={fieldClass('observationDate', criterion.id)} min={policy.periodStart} max={policy.periodEnd}
            value={finding.observedAt || ''} onChange={event => update(index, { observedAt: event.target.value || null })} /></label>
        </div>
        {criterion.id === 'repeatable' && <label className="block text-xs">Distinct observation dates<input aria-label="Repeatability dates" aria-invalid={hasFieldIssue('repeatabilityDates', criterion.id)} aria-describedby={hasFieldIssue('repeatabilityDates', criterion.id) ? issueId : undefined} className={fieldClass('repeatabilityDates', criterion.id)} placeholder="YYYY-MM-DD, YYYY-MM-DD"
          value={finding.observationDates?.join(', ') || ''} onChange={event => update(index, { observationDates: event.target.value.split(',').map(date => date.trim()).filter(Boolean) })} /></label>}
        <Textarea aria-label={`${criterion.id} exact excerpt`} aria-invalid={hasFieldIssue('exactExcerpt', criterion.id)} aria-describedby={hasFieldIssue('exactExcerpt', criterion.id) ? issueId : undefined} className={hasFieldIssue('exactExcerpt', criterion.id) ? 'border-red-600 ring-1 ring-red-600' : ''} placeholder="Exact supporting excerpt" rows={2} value={finding.quote} onChange={event => update(index, { quote: event.target.value })} />
        <Textarea aria-label={`${criterion.id} rationale`} aria-invalid={hasFieldIssue('criterionRationale', criterion.id)} aria-describedby={hasFieldIssue('criterionRationale', criterion.id) ? issueId : undefined} className={hasFieldIssue('criterionRationale', criterion.id) ? 'border-red-600 ring-1 ring-red-600' : ''} placeholder="Criterion rationale" rows={2} value={finding.rationale} onChange={event => update(index, { rationale: event.target.value })} />
      </fieldset>;
    })}
    <p className="text-sm font-medium break-words">Calculated result: {preview}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="text-xs">Reviewer<input aria-label="Criterion reviewer" aria-invalid={hasFieldIssue('reviewer')} className={fieldClass('reviewer')} value={reviewer} onChange={event => { setReviewer(event.target.value); clearFieldIssue('reviewer'); }} /></label>
      <label className="text-xs">Endpoint exception (0–2 or 98–100)<input aria-label="Endpoint exception" aria-invalid={hasFieldIssue('endpointException')} type="number" min={0} max={100} step={1} className={fieldClass('endpointException')} value={endpoint} onChange={event => { setEndpoint(event.target.value); clearFieldIssue('endpointException'); }} /></label>
    </div>
    <Textarea aria-label="Criterion review reason" aria-invalid={hasFieldIssue('reviewReason')} className={hasFieldIssue('reviewReason') ? 'border-red-600 ring-1 ring-red-600' : ''} placeholder="Review decision and justification" value={reason} onChange={event => { setReason(event.target.value); clearFieldIssue('reviewReason'); }} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex gap-2"><Button size="sm" onClick={save} disabled={busy || !reviewer.trim() || !reason.trim()}><Check className="h-4 w-4 mr-1" />{busy ? 'Saving...' : 'Confirm Criterion Review'}</Button>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}><X className="h-4 w-4 mr-1" />Cancel</Button></div>
  </div>;
}

export function EvaluationReadiness({ assessment, scores }: { assessment: Assessment; scores: SubdivisionScore[] }) {
  const summary = summarizeAssessment(scores);
  const reviewMethod = assessment.scoringMethod || (assessment.scoringPolicy?.reviewMode === 'manual' ? 'manual' : 'llm_assisted');
  const [error, setError] = useState('');
  async function download() {
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/dimension-scores?summary=true&export=true`);
      if (!response.ok) throw new Error('Could not export assessment trace');
      const url = URL.createObjectURL(new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `aurora-${assessment.id}-evaluation.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Export failed'); }
  }
  return <section className="border-y py-4 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-base">Evaluation Readiness</h3>
      <Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4 mr-1" />Audit Export</Button></div>
    <p className="font-medium text-sm">{summary.readiness.status === 'review_ready' ? 'Ready for academic review' : 'Not ready for a valid evaluation'}</p>
    <p className="text-xs text-amber-700">Provisional Level + Position rubric · Calibration and outcome validation pending</p>
    <p className="text-xs">Review method: {reviewMethod === 'manual' ? 'Manual' : 'AI suggestions with reviewer confirmation'}</p>
    {assessment.scoringPolicy && <p className="text-xs">Legacy assessment policy: {assessment.scoringPolicy.rubricVersion} · {assessment.scoringPolicy.profile} · {assessment.scoringPolicy.periodStart} to {assessment.scoringPolicy.periodEnd}</p>}
    <p className="text-sm">Composite: {summary.composite.normalizedScore?.toFixed(1) ?? 'Insufficient coverage'}
      {' · '}{summary.composite.qualifyingCount}/15 qualifying dimensions · {summary.coveragePercent.toFixed(0)}% sub-dimension coverage</p>
    {summary.readiness.blockers.length > 0 && <ul className="list-disc pl-5 text-xs space-y-1">{summary.readiness.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>}
    {summary.readiness.criticalWeaknesses.length > 0 && <p className="text-xs text-destructive break-words">Critical weaknesses: {summary.readiness.criticalWeaknesses.join(', ')}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}

export function SubdimensionScoringReport({ assessment, scores, evidence }: {
  assessment: Assessment; scores: SubdivisionScore[]; evidence: Evidence[];
}) {
  const policy = assessment.scoringPolicy;
  const selectedDimensions = DIMENSIONS.filter(dimension =>
    assessment.dimensionSelections?.some(selection => selection.dimensionKey === dimension.key && selection.deepAssessment)
  );
  const reviewMethod = assessment.scoringMethod || (policy?.reviewMode === 'manual' ? 'manual' : 'llm_assisted');
  const statusLabel = (status: string) => status.replaceAll('_', ' ');

  return <section className="space-y-6" aria-labelledby="subdimension-scoring-report">
    <div className="space-y-2 border-b pb-4">
      <h3 id="subdimension-scoring-report" className="text-lg font-semibold">Sub-dimension Scoring &amp; Evaluation</h3>
      <p className="text-sm text-muted-foreground">Direct Level + Position · {reviewMethod === 'manual' ? 'Manual ratings' : 'AI suggestions with reviewer confirmation'}</p>
      <p className="text-xs text-amber-700">Provisional rubric; calibration and outcome validation remain pending.</p>
      <ul className="list-disc pl-5 text-xs space-y-1">
        <li>Choose the highest Level supported by evidence: 1 Basic, 2 Developing, 3 Established or 4 Advanced. Use the lower Level with High Position when evidence is between Levels.</li>
        <li>Position is a reviewer judgment: Low (+3), Mid (+12) or High (+21). Missing or insufficient evidence can remain unscored, not zero.</li>
        <li>Score = Level band minimum + Position points. Only current, reviewed ratings count. A dimension averages at least two eligible sub-dimensions; the composite averages all qualifying dimensions, with no minimum dimension count.</li>
      </ul>
      <p className="text-xs text-muted-foreground">The LLM suggests Level and Position from accepted evidence when enabled. You confirm or edit the suggestion, or enter a rating manually. The application calculates the numeric score; it does not perform exact-quote or reporting-window validation in this simplified flow. Ratings retain linked evidence and reviewer attribution.</p>
    </div>
    {selectedDimensions.map(dimension => {
      const summary = summarizeDimension(dimension.key, scores);
      const includedScores = SUBDIVISIONS[dimension.key].map(subdivision => subdivisionNumericScore(
        scores.find(score => score.dimensionKey === dimension.key && score.subdivisionKey === subdivision.key)
      )).filter((value): value is number => value !== null);
      return <section key={dimension.key} className="space-y-4 min-w-0" aria-labelledby={`scoring-${dimension.key}`}>
        <div className="border-b pb-2 space-y-1 print:break-after-avoid">
          <h4 id={`scoring-${dimension.key}`} className="font-semibold text-base">{dimension.number}. {dimension.name}</h4>
          <p className="text-xs text-muted-foreground">{summary.evidenceStatus} evidence · {summary.scoredCount}/{summary.totalCount} eligible ratings
            {' · '}{summary.normalizedScore === null ? 'Dimension excluded: at least two eligible ratings required' :
              `Dimension calculation: (${includedScores.join(' + ')}) / ${includedScores.length} = ${summary.normalizedScore.toFixed(1)}/100; Level ${summary.maturityLevel}`}</p>
        </div>
        {SUBDIVISIONS[dimension.key].map((subdivision, index) => {
          const score = scores.find(item => item.dimensionKey === dimension.key && item.subdivisionKey === subdivision.key);
          const numericScore = subdivisionNumericScore(score);
          const directRating = score?.ratingMethod === 'level_position';
          const criteria = directRating ? [] : getCriteria(subdivision.key, validPolicy(policy) ? policy.profile : 'standard');
          const subEvidence = evidence.filter(item => item.dimensionKey === dimension.key && item.subdivisionKey === subdivision.key);
          let evaluated: ReturnType<typeof evaluateCriteria> | null = null;
          let evaluationIssue = '';
          if (score?.status === 'stale') evaluationIssue = score.staleReason || 'Criterion trail requires a new review';
          else if (directRating && score?.status === 'needs_review') evaluationIssue = 'Level/Position suggestion is waiting for reviewer confirmation';
          else if (directRating && score?.status === 'insufficient_evidence') evaluationIssue = score.rationale || 'Reviewer left this sub-dimension unscored';
          else if (directRating) evaluationIssue = score?.reviewedBy ? 'Level/Position rating confirmed by reviewer' : 'Rating not reviewed';
          else if (!validPolicy(policy)) evaluationIssue = 'Legacy criterion rating requires its frozen policy';
          else if (!score?.criteria || JSON.stringify(score.policy) !== JSON.stringify(policy)) evaluationIssue = 'No criterion findings under the current frozen policy';
          else {
            try { evaluated = evaluateCriteria(subdivision.key, score.criteria, subEvidence, policy); }
            catch (failure) { evaluationIssue = failure instanceof Error ? failure.message : 'Criterion trail could not be validated'; }
          }
          const blockedGate = evaluated?.maturityLevel && evaluated.maturityLevel < 4 ? criteria
            .map((criterion, criterionIndex) => ({ ...criterion, result: evaluated!.resolved[criterionIndex] }))
            .filter(criterion => criterion.level === evaluated!.maturityLevel! + 1 && criterion.result !== 'met') : [];

          return <article key={subdivision.key} className="border-b pb-5 space-y-3 min-w-0 break-words">
            <div className="flex flex-wrap items-center justify-between gap-2 print:break-after-avoid">
              <h5 className="text-sm font-semibold">{dimension.number}.{index + 1} {subdivision.name}</h5>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <MaturityBadge level={scoreToMaturity(numericScore)} />
                <span className="font-mono">{numericScore === null ? 'Not scored' : `${numericScore}/100`}</span>
                <span className="capitalize">{statusLabel(score?.status || 'not_started')}</span>
                {score && <ConfidenceBadge confidence={score.confidence} />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{subdivision.description}</p>
            <div className="text-xs space-y-1 print:break-inside-avoid">
              <p><strong>Why this result:</strong> {evaluationIssue || evaluated?.reason || 'No rating or criterion review recorded.'}</p>
              {score?.rationale && <p><strong>Recorded rationale:</strong> {score.rationale}</p>}
              {blockedGate.length > 0 && <p><strong>Next Level gate:</strong> {blockedGate.map(criterion => `${criterion.id}: ${statusLabel(criterion.result)}`).join('; ')}.</p>}
              {numericScore !== null && directRating && score?.maturityLevel && score.position && <p><strong>Calculation:</strong> Level {score.maturityLevel} band minimum {NORMALIZATION_RANGES[score.maturityLevel][0]}
                {' + '}{score.position} {POSITION_POINTS[score.position]} = {normalize(score.maturityLevel, score.position)}/100.</p>}
              {numericScore !== null && evaluated?.maturityLevel && evaluated.position && <p><strong>Calculation:</strong> Level {evaluated.maturityLevel} band minimum {NORMALIZATION_RANGES[evaluated.maturityLevel][0]}
                {' + '}{evaluated.position} {POSITION_POINTS[evaluated.position]} = {normalize(evaluated.maturityLevel, evaluated.position)}/100
                {score?.scoreOverride != null && `; justified endpoint exception replaces this with ${numericScore}/100`}.</p>}
              {numericScore === null && <p><strong>Aggregation:</strong> Excluded from dimension and composite calculations.
                {score?.status === 'needs_review' && evaluated?.maturityLevel && evaluated.position &&
                  ` Pending recommendation: Level ${evaluated.maturityLevel}, ${evaluated.position}, ${normalize(evaluated.maturityLevel, evaluated.position)}/100; reviewer confirmation required.`}</p>}
              {numericScore !== null && !directRating && <p><strong>Common standard baseline:</strong> {score?.absoluteScore == null ? 'Unavailable' : `${score.absoluteScore}/100`}</p>}
              <p><strong>Reviewer:</strong> {score?.reviewedBy || 'Not reviewed'}{score?.reviewedAt && ` · ${score.reviewedAt}`}</p>
              {score?.overrideReason && <p><strong>Review justification:</strong> {score.overrideReason}</p>}
              {score && <p><strong>Extraction provenance:</strong> {score.extractionModel || 'Not recorded'} · Prompt {score.promptVersion || 'Not recorded'}</p>}
            </div>
            <div className="space-y-3">
              {directRating ? <div className="space-y-2 text-xs print:break-inside-avoid">
                <p><strong>Rating method:</strong> Level + Position, confirmed by {score.reviewedBy || 'reviewer pending'}.</p>
                {score.evidenceIds.map(id => {
                  const source = subEvidence.find(item => item.id === id);
                  return source ? <div key={id} className="border-l-2 pl-3 space-y-1">
                    <p><strong>Evidence:</strong> {source.sourceTitle} · {source.publisher} · {source.publicationDate || 'Undated'}</p>
                    <p>{source.claim}</p>
                    {source.sourceUrl && <p className="break-all">{source.sourceUrl}</p>}
                    <p className="text-muted-foreground">Evidence ID: {source.id}</p>
                  </div> : <p key={id} className="text-amber-700">Referenced evidence no longer available: {id}</p>;
                })}
                {score.evidenceIds.length === 0 && <p>No accepted evidence linked.</p>}
              </div> : criteria.map((criterion, criterionIndex) => {
                const finding = score?.criteria?.find(item => item.criterionId === criterion.id);
                const source = subEvidence.find(item => item.id === finding?.evidenceId);
                const result = evaluated?.resolved[criterionIndex];
                return <div key={criterion.id} className="border-l-2 pl-3 space-y-1 text-xs print:break-inside-avoid">
                  <p className="font-semibold">{criterion.level === 'position' ? 'Position' : `Level ${criterion.level}`} · {criterion.id}
                    {' · '}{result ? `Evaluated: ${statusLabel(result)}` : 'Not validated'}
                    {finding && ` · Recorded: ${statusLabel(finding.status)}`}</p>
                  <p><strong>Requirement:</strong> {criterion.requirement}
                    {criterion.operator && ` (${criterion.operator} ${criterion.threshold} ${criterion.unit})`}</p>
                  <p><strong>Observed value:</strong> {finding?.value == null ? 'Not recorded' : `${finding.value} ${criterion.unit || ''}`}
                    {' · '}<strong>Observation date:</strong> {finding?.observedAt || 'Not recorded'}
                    {' · '}<strong>Basis:</strong> {finding?.basis || 'unknown'}</p>
                  {finding?.observationDates?.length ? <p><strong>Repeatability dates:</strong> {finding.observationDates.join(', ')}</p> : null}
                  <p><strong>Criterion rationale:</strong> {finding?.rationale || 'No criterion finding recorded.'}</p>
                  {finding?.quote && <blockquote className="border-l pl-2 text-muted-foreground whitespace-pre-wrap">{finding.quote}</blockquote>}
                  {source ? <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2"><span><strong>Source:</strong> {source.sourceTitle}</span>
                      <SourceLink url={source.sourceUrl} urlResolved={source.urlResolved} />
                    </div>
                    <p className="text-muted-foreground">{source.publisher} · {source.sourceType} · Published {source.publicationDate || 'Undated'}
                      {source.pageNumber != null && ` · Page ${source.pageNumber}`} · {source.status}{source.isMock && ' · Mock evidence'}</p>
                    {source.sourceUrl && <p className="break-all print:text-black">{source.sourceUrl}</p>}
                    <p className="text-muted-foreground">Evidence ID: {source.id}</p>
                  </div> : <p className="text-muted-foreground">{finding?.evidenceId ? `Referenced evidence unavailable: ${finding.evidenceId}` : 'No supporting record cited.'}</p>}
                </div>;
              })}
            </div>
          </article>;
        })}
      </section>;
    })}
  </section>;
}