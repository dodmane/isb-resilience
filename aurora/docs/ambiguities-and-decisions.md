# AURORA — Ambiguities, Contradictions & Design Decisions

## Ambiguities Found in the Charter

### 1. Subdivision Definitions Not Specified

**Charter says:** "For dimensions selected for deeper SaaS/IT assessment, exactly three structured subdivisions."

**Missing:** The charter does not enumerate the exact 3 subdivisions per dimension.
It describes what each dimension tests (e.g., "Retention, net revenue retention,
pricing power, customer concentration and demand resilience" for Revenue Durability)
but does not explicitly split these into 3 named subdivisions.

**Decision:** Derive subdivisions from the dimension descriptions. Each dimension's
test criteria are grouped into 3 logical clusters. These are defined in
`scoring-engine.md`. User should validate these before implementation.

---

### 2. Deep vs. Surface Assessment Handling

**Charter says:** Deeper assessment is applied to "dimensions most material to the
organization's business model." All 15 are screened; only some get the 3-subdivision
deep treatment.

**Missing:** What does a "surface-level" assessment look like? Is it a single 1–4
score without subdivisions? Or is it skipped entirely?

**Decision:** Surface-assessed dimensions receive a single 1–4 maturity score
(no subdivision breakdown). Deep-assessed dimensions go through the full
3-subdivision flow. All 15 appear on the radar.

---

### 3. Normalization — Midpoint vs. Range

**Charter says:** Level 1 = 25–40, Level 2 = 50–65, Level 3 = 70–85, Level 4 = 90–100.

**Missing:** Should the normalized value be the midpoint of the range, or should
it vary within the range? What determines where in the range a score falls?

**Decision:** Default to midpoint. Optionally allow user to adjust within the range
to express within-level nuance (e.g., "strong 3" = 85 vs. "weak 3" = 70).

---

### 4. Rounding When Averaging Subdivision Scores

**Charter says:** "averages the sub-dimension scores to produce the dimension result."

**Missing:** How to handle non-integer averages. If three subdivisions score
2, 3, 3 → average = 2.67. Does this round to 3?

**Decision:** Round to nearest integer. Ties (e.g., 2.5) round up. Display the
raw average alongside the rounded maturity level for transparency.

---

### 5. Evidence for Surface-Level Dimensions

**Charter says:** Every claim needs evidence. But if a dimension gets only surface
assessment (no subdivisions), how much evidence is required?

**Decision:** Surface dimensions still require at least one evidence item or an
explicit "insufficient evidence" marker. The evidence links directly to the
dimension rather than a subdivision.

---

### 6. Scenario Maturity — Can It Increase?

**Charter says:** "Scenario assessment evaluates how that capability behaves under
each AURORA future." And "Every scenario adjustment must have rationale, evidence,
confidence, user approval."

**Missing:** Can scenario-adjusted maturity be higher than base? (e.g., a company
with strong AI readiness might score higher in "Autonomous Advantage")

**Decision:** Yes, scenario adjustments can go up or down. The adjustment direction
and rationale are captured and user-approved.

---

### 7. "Leadership Focus Map" Not Defined

**Charter says:** Output includes a "Leadership Focus Map."

**Missing:** No visual spec or definition of what this map contains.

**Decision:** Implement as a prioritized 2×2 matrix: Maturity (x) vs. Scenario
Sensitivity (y), highlighting which dimensions leadership should focus on first.
Derived from gap analysis output.

---

### 8. "Early Warning Indicators" Not Enumerated

**Charter says:** Output includes "Early Warning Indicators."

**Missing:** The charter mentions scenario triggers and early-warning indicators
but doesn't define what they are or how they're generated.

**Decision:** LLM generates per-scenario early-warning indicators during the
scenario context stage. These are specific, monitorable signals (e.g., "customer
churn rate exceeds 5%", "cloud compute costs increase >20% YoY"). User reviews
and approves them.

---

### 9. Gap Between 0–24 and 41–49 in Normalization

**Charter says:** Level 1 = 25–40, Level 2 = 50–65. There's a gap between 0–24
(below Level 1) and 41–49 (between Level 1 and Level 2).

**Decision:** These gaps are intentional — they represent the conceptual distance
between maturity levels. The normalized score will always fall within one of the
four defined ranges. The gaps ensure clear visual separation on charts.

---

### 10. Priority Bar Mentioned but Not Detailed

**Charter mentions:** "AURORA Priority Bar" as a deliverable.

**Missing:** No definition of what the Priority Bar is or how it's calculated.

**Decision:** Implement as a ranked horizontal bar chart showing dimensions ordered
by urgency (exposed → conditional → strong). This visualization complements the
radar chart by showing priority order rather than multidimensional profile.

---

## Contradictions

### None Found

The charter is internally consistent. The scoring methodology (1–4 maturity,
3 subdivisions, averaging, normalization ranges) is clearly defined. The
four scenarios are consistently described. The separation between framework logic
and LLM responsibilities is explicit.

---

## Deterministic vs. LLM-Driven

### Deterministic (Application Code)

| Item | Location |
|---|---|
| 15 dimension definitions | `lib/framework/dimensions.ts` |
| 3 subdivisions per dimension | `lib/framework/subdivisions.ts` |
| 4 scenario definitions (axes + names) | `lib/framework/scenarios.ts` |
| Maturity rubric (1–4 labels + criteria) | `lib/framework/rubric.ts` |
| Normalization ranges (25–40, 50–65, 70–85, 90–100) | `lib/framework/normalization.ts` |
| Dimension score = avg(subdivision scores) | `lib/framework/scoring.ts` |
| Workflow state machine (10 stages) | `lib/workflow/stages.ts` |
| Gate enforcement (approve before advance) | `lib/workflow/transitions.ts` |
| Audit trail persistence | `lib/db/queries/audit.ts` |
| Evidence metadata schema | `lib/db/schema.ts` |
| Confidence assessment rules | `lib/framework/scoring.ts` |
| Resilience classification (strong/conditional/exposed) | `lib/framework/scoring.ts` |

### LLM-Driven (Proposals Only — User Approves)

| Item | LLM Prompt |
|---|---|
| Company research & profile generation | `lib/llm/prompts/company-discovery.ts` |
| Scenario narrative contextualization | `lib/llm/prompts/scenario-context.ts` |
| Dimension screening recommendation | `lib/llm/prompts/dimension-screening.ts` |
| Evidence plan generation | `lib/llm/prompts/evidence-plan.ts` |
| Public-source evidence extraction | `lib/llm/research.ts` |
| Evidence classification (dimension + subdivision) | `lib/llm/evidence.ts` |
| Maturity-level proposal with rationale | `lib/llm/scoring-recommendation.ts` |
| Scenario stress-test reasoning | `lib/llm/scenario-reasoning.ts` |
| Gap identification & implication text | `lib/llm/prompts/gap-analysis.ts` |
| Early-warning indicator generation | `lib/llm/prompts/early-warnings.ts` |
| Leadership focus area suggestions | `lib/llm/prompts/leadership-focus.ts` |
