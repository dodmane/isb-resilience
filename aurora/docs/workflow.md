# AURORA — Workflow

## Gated Workflow State Machine

The assessment follows 10 mandatory checkpoints. Each checkpoint presents
**Review → Edit → Approve & Continue**. The next stage remains locked until the
user explicitly approves the current one.

```
┌───────────────────────────────────────────────────────────────────┐
│  [1] Company     [2] Scenario   [3] Dimension   [4] Evidence     │
│      Discovery       Context       Screening       Plan          │
│        ↓               ↓              ↓             ↓            │
│  [5] Gathered    [6] Subdiv.    [7] Dimension   [8] Scenario     │
│      Evidence       Scoring       Scoring       Stress Test      │
│        ↓               ↓              ↓             ↓            │
│  [9] Resilience  [10] Final                                      │
│      Gaps           Assessment                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Stage Details

### Stage 1 — Company Discovery

**Goal:** Establish who is being assessed.

**Inputs:**
- Company name
- Data source mode: `PUBLIC` / `UPLOADED` / `PUBLIC + UPLOADED`
- Optional: uploaded documents

**LLM role:** Research the company using public sources. Extract company
profile, industry, size classification, key business model characteristics.

**User actions:**
- Review discovered profile
- Edit any field
- Upload additional documents
- Approve & Continue

**Gate output:** Company profile saved; data source mode locked.

---

### Stage 2 — Scenario Context

**Goal:** Present the four AURORA scenarios in the context of the assessed company.

**Inputs:** Company profile from Stage 1.

**LLM role:** Contextualize each of the four scenarios to the specific company:
- Autonomous Advantage (High AI / Stable Macro)
- Storm and Signal (High AI / High Macro)
- Managed Modernization (Low AI / Stable Macro)
- Exposed and Reactive (Low AI / High Macro)

Generate scenario-specific narratives relevant to the company's industry and size.

**User actions:**
- Review scenario narratives
- Edit narratives and assumptions
- Approve & Continue

**Gate output:** Four contextualized scenario narratives approved.

---

### Stage 3 — Dimension Screening

**Goal:** Screen all 15 dimensions; select which get deeper SaaS/IT assessment.

**LLM role:** Recommend which dimensions are most material to this company's
business model for deeper (3-subdivision) assessment.

**User actions:**
- Review 15-dimension list with LLM recommendations
- Toggle which dimensions receive deep assessment
- Edit screening rationale
- Approve & Continue

**Gate output:** Dimension selection saved (deep vs. surface-level per dimension).

---

### Stage 4 — Evidence Plan

**Goal:** Define what evidence to gather for each selected dimension and subdivision.

**LLM role:** Propose an evidence plan — what sources to search, what data
points to look for, which subdivisions need evidence.

**User actions:**
- Review evidence plan
- Add/remove evidence targets
- Specify additional URLs or document sources
- Approve & Continue

**Gate output:** Evidence plan locked.

---

### Stage 5 — Gathered Evidence

**Goal:** Execute the evidence plan; gather and classify evidence.

**LLM role:**
- Research public sources per the plan
- Extract evidence items with full metadata:
  - claim, extracted value, supporting excerpt
  - source title, publisher, URL, source type
  - publication date, retrieval timestamp, page number
  - dimension, subdivision
- Flag any URL that cannot be verified as `url_resolved = false`

**User actions:**
- Review each evidence item
- Accept / reject evidence (with reason)
- Add own evidence (URL, upload, manual entry)
- Mark dimensions as insufficient evidence
- Use: Find More Evidence, Upload Evidence, Add Evidence, Record Assumption, Leave Unscored
- Approve & Continue

**Gate output:** Evidence register populated and approved.

---

### Stage 6 — Subdivision Scoring

**Goal:** Score each subdivision (1–4 maturity) from evidence.

**LLM role:** Propose a maturity level for each subdivision based on the
accepted evidence. Provide rationale.

**User actions:**
- Review proposed scores with linked evidence
- Override any score (with reason recorded)
- Mark as NOT SCORED — INSUFFICIENT EVIDENCE
- Set confidence (HIGH / MEDIUM / LOW)
- Approve & Continue

**Gate output:** Subdivision maturity scores locked.

---

### Stage 7 — Dimension Scoring

**Goal:** Calculate dimension scores from subdivision averages.

**Application logic (deterministic):**
- Dimension maturity = average of subdivision maturity scores
- Normalized score = map maturity to 0–100 range
- Confidence = derived from subdivision confidences

**User actions:**
- Review calculated dimension scores
- Override dimension score (with reason)
- Approve & Continue

**Gate output:** 15-dimension maturity profile locked.

---

### Stage 8 — Scenario Stress Test

**Goal:** Assess how base maturity behaves under each of the four scenarios.

**LLM role:** For each dimension × scenario combination:
- Propose scenario-adjusted maturity level
- Provide adjustment rationale
- Link to relevant evidence
- Assign confidence

**User actions:**
- Review scenario adjustments per dimension
- Override adjustments (with reason)
- Approve & Continue

**Gate output:** Scenario-adjusted maturity grid approved.

---

### Stage 9 — Resilience Gaps

**Goal:** Identify resilience gaps, classify capabilities.

**LLM role:** Analyze the scored results to identify:
- Strong capabilities (resilient across scenarios)
- Conditional capabilities (resilient in some scenarios)
- Exposed capabilities (vulnerable under stress)
- Evidence-backed gap descriptions
- Business resilience implications

Recommendations remain at framework/leadership level — no detailed
implementation plans.

**User actions:**
- Review gap analysis
- Edit classifications
- Edit implications
- Approve & Continue

**Gate output:** Gap analysis locked.

---

### Stage 10 — Final Assessment / Dashboard

**Goal:** Present the complete executive dashboard.

**Contents:**
- Company profile
- Assessment lens (SaaS/IT)
- 15-dimension Resilience Radar (Recharts)
- Maturity levels + normalized scores
- Assessment confidence per dimension
- Scenario resilience matrix
- Strong / Conditional / Exposed classification
- Leadership Focus Map
- Early Warning Indicators
- Evidence Register (all evidence, navigable)
- Assessment Audit Trail

**User actions:**
- Final review
- Export (future: PDF)
- Mark assessment as complete

---

## State Transitions

```typescript
type Stage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Allowed transitions
function canAdvance(current: Stage, approvals: StageApproval[]): boolean {
  return approvals.find(a => a.stage === current)?.status === 'approved';
}

// User can always go back to review earlier stages (read-only)
// Re-editing an earlier stage invalidates all subsequent approvals
```

## Rejection Flow

When a user rejects a stage:
1. Record rejection reason in `stage_approvals`
2. Stage remains editable
3. LLM can be re-invoked to regenerate proposals
4. User must re-approve before advancing
