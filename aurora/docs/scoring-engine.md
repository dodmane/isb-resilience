to produce the dimension result."
# AURORA Scoring Engine: Level + Position

## Evidence and Reviewer Input

The active Stage 6 flow does not require a SaaS Criterion Policy, frozen reporting
window, eight-item checklist, exact-quote match or repeatability-date validation.
It uses accepted, non-mock evidence assigned to the sub-dimension as support for a
Level + Position assessment. Evidence source metadata and publication dates remain
visible to the reviewer; reviewers should still consider whether sources cover a
comparable period. The tool does not infer the observation period or reject a rating
solely because a date falls outside a locked window.

When AI suggestions are selected, the model proposes Level, Position, rationale,
confidence and IDs for the accepted evidence it used. With no usable suggestion,
the sub-dimension remains unscored and the reviewer can enter a rating manually or
leave it unscored. The reviewer confirms or edits every rating before it counts.
The application retains basic checks: valid Level/Position pairing, evidence IDs
must refer to accepted non-mock records assigned to that sub-dimension, reviewer
identity is recorded, and changed evidence makes an existing rating stale.

## Final Summary Report Trace

The final dashboard includes an always-visible **Sub-dimension Scoring & Evaluation**
section covering all 45 configured SaaS sub-dimensions, including those not assessed.
The section is part of the existing Print / PDF report, not a hidden tab or collapsed panel.

For each dimension, the report shows eligible-rating coverage, evidence status and
the arithmetic used to calculate its average, or why it is excluded under R1.
For each sub-dimension, it shows:

- Current eligible score, Level, confidence and review/stale status.
- AI proposal or manual rating, reviewer rationale, confidence and review status.
- Level band minimum plus Position points and the resulting numeric score.
- Reviewer identity/date and extraction model/prompt provenance when applicable.
- Selected evidence claims, source titles/publishers/dates, evidence IDs and source URLs.

The report does not ask the LLM to generate new rationales. Pending proposals are
labelled and excluded from averages. Stale records show why they no longer count.
Unscored ratings and missing evidence remain distinct from a Level 1 assessment.
The Level descriptions and score mapping are provisional framework judgments, not
empirically calibrated or predictive benchmarks.

Implemented from the supplied `AURORA_Scoring_Template.xlsx - Rubric.csv` and
`AURORA_Scoring_Template.xlsx - README.csv`. This specification replaces the old
midpoint normalization and rounded-average maturity model.

## Rubric and Inputs

Every scored sub-dimension uses accepted supporting evidence, a Level and a Position.
Missing or insufficient evidence can remain unscored; it is not automatically Level 1
or zero. A reviewer can directly enter Level + Position when an AI suggestion is
unavailable or not useful. AI suggestions are drafts until a reviewer confirms them.

| Level | Label | Integer band | Definition | Low | Mid | High |
|---|---|---|---|---|---|---|
| 1 | Basic / Not Met | 0-25 | Minimal capability; criteria absent or weak; high vulnerability | 3 | 12 | 21 |
| 2 | Developing / Partially Met | 26-50 | Some criteria met; inconsistent or incomplete capability | 29 | 38 | 47 |
| 3 | Established / Mostly Met | 51-75 | Most criteria met; reliable, repeatable processes | 54 | 63 | 72 |
| 4 | Advanced / Fully Met | 76-100 | All criteria met; automated, predictive or fully integrated | 79 | 88 | 97 |

Sub-dimension score = level band minimum + Position points:
Low adds 3, Mid adds 12, High adds 21. These are twelve discrete ordinary scores,
not a freely editable continuum.

Choose the highest Level supported by accepted evidence. Between Levels, use the
lower Level with High Position. Low means the evidence barely supports the selected
Level, Mid means it clearly supports it, and High means it strongly supports it
without establishing the next Level. The reviewer records their identity and can add
a rationale; the app does not require a separate eight-criterion justification form.

## Aggregation and Coverage

1. R1: average numeric scores of scored sub-dimensions equally. Ignore missing rows.
  Require at least **2** scored sub-dimensions; otherwise the dimension has no score
  and is excluded from the composite.
2. Composite: average all qualifying dimension scores equally. There is no minimum
  qualifying-dimension count; with zero qualifying dimensions, show **Insufficient
  coverage** because no average can be calculated.
3. Derive dimension and composite Levels from the numeric average using band-minimum
   lookup. Do not average or round maturity levels and then normalize them.

Dimensions have equal weight even when one has two ratings and another has three.
No source-confidence or materiality weights are applied. Calculations retain full
precision; the dimension screen displays scores to one decimal place.

For fractional averages, the workbook's band-minimum lookup is authoritative:
Level 1 is [0,26), Level 2 [26,51), Level 3 [51,76), Level 4 [76,100].
For example, 25.9 remains Level 1 and 75.5 remains Level 3. Display rounding does
not change the underlying Level. This resolves the gaps between the printed integer bands.

| Evidence status | Condition |
|---|---|
| Full | All configured sub-dimensions scored, and R1 met |
| Partial | R1 met, but some configured sub-dimensions missing |
| Insufficient | Some scored sub-dimensions, but below R1 |
| None | No scored sub-dimensions |

The application retains its existing 15 dimensions and 45 SaaS/IT sub-dimensions
and stable keys. The CSV explicitly permits industry-specific wording. Missing
rows count as missing evidence; unknown subdivision keys do not count toward coverage.
Unassessed dimensions remain missing. A composite can be calculated from a single
qualifying dimension, but is less representative; always report the qualifying count
and coverage beside the score.

## Bias Check and Comparison

R3 uses a **1 point** tolerance. Compare the valid reported composite (Full + Partial)
with the mean of Full-only qualifying dimensions:

`biasDelta = reportedComposite - fullEvidenceOnlyMean`

If delta > 1, flag **possibly overstated**; if delta < -1, flag **possibly understated**.
Exactly +/-1 is within tolerance. Without a valid composite or any Full dimension,
the check is **unavailable**, not passed. The Full-only mean is a sensitivity diagnostic,
not a separately certified composite: it can use fewer than twelve dimensions.
This operational interpretation of R3 should be confirmed against the unavailable
Evidence & Benchmark sheet formulas.

Like-for-like composites use only dimension keys where BOTH companies meet R1.
Compute a separate equal-weight mean for each company over that same intersection.
At least one shared qualifying dimension is needed to calculate a comparison. In the
direct rating flow, reporting periods are not stored or enforced; verify that matched
evidence actually covers comparable periods before interpreting the comparison.

Coverage percentage = scored sub-dimensions / all 45 configured sub-dimensions * 100.
Source-quality confidence remains separate and never changes scores. The CSV mentions
High/Medium/Low coverage-confidence thresholds on another sheet but omits their values.
No invented coverage-confidence thresholds are applied; raw coverage is reported.

## Worked Example

Liquidity & Runway: Level 3 + Mid = 63; Level 2 + High = 47; Level 2 + Mid = 38.
Dimension score = (63 + 47 + 38) / 3 = 49.333..., Level 2, Full evidence.
If the final rating is missing: (63 + 47) / 2 = 55, Level 3, Partial evidence.
If only one rating remains in this dimension: Insufficient evidence for this dimension.
If it is the only dimension assessed, there is no qualifying dimension and no composite.
The increase from missing weak evidence is real selection bias, not improved capability.

## Application and API

- Stage 6 offers **AI suggestions** or **Manual entry** directly. It does not require
  users to configure a SaaS Criterion Policy or reporting window before scoring.
- With AI suggestions enabled, the LLM recommends Level, Position, confidence,
  rationale and IDs for accepted evidence. If it cannot support a rating, the
  sub-dimension stays unscored and the user can enter a rating or leave it blank.
- Manual entry uses the same Level + Position score formula. The reviewer identifies
  themselves and links accepted evidence to each scored sub-dimension. This is a
  lightweight traceability check, not the former exact-quote/eight-criterion gate.
- Saved ratings record the reviewer, evidence links, rationale, model/prompt provenance
  and evidence snapshot. If linked evidence changes, the rating becomes stale and
  must be reviewed again. Saving or changing a rating invalidates later approvals.
- Stage 7: formula-only dimension scores, evidence counts/status, composite,
  coverage percentage, R3 flag and assessment-selector like-for-like comparison.
  Direct comparisons match sub-dimensions; new assessments do not record a reporting
  window, so verify evidence periods manually before treating scores as comparable.
- Dimension and composite overrides are not permitted. Adjust supporting
  sub-dimension ratings instead. The old dimension PATCH endpoint returns 405.
- Older criterion-backed records and the legacy policy API remain readable for
  compatibility; new Stage 6 ratings use the direct Level + Position path. Legacy
  endpoint exceptions are not offered in the simplified rating form.
- Base maturity used by scenario stress testing now comes from numeric score bands.
  Scenario-specific maturity adjustments remain a separate, unchanged process.

Example subdivision PATCH body:

```json
{
  "ratingMethod": "level_position",
  "dimensionKey": "liquidity_runway",
  "subdivisionKey": "cash_generation_buffers",
  "maturityLevel": 3,
  "position": "Mid",
  "evidenceIds": ["accepted-evidence-id"],
  "reviewedBy": "Reviewer name",
  "rationale": "The accepted cash-flow disclosure supports established capability."
}
```

Set both `maturityLevel` and `position` to null to leave the sub-dimension unscored.
Dimension GET preserves its existing array response. Add `?summary=true` for aggregate
diagnostics and `&compareWith=<assessmentId>` for a like-for-like comparison. New
direct assessments do not record a reporting window, so compare evidence periods
before interpreting a cross-company comparison.

Implementation: `src/lib/framework/scoring.ts`, scoring route handlers,
`src/lib/llm/rating-recommendation.ts`, and Stage 6/7 components.
Default thresholds live in `COVERAGE_RULES`; changing them is a code/configuration
decision, not a post-hoc adjustment in the UI. Agree thresholds before assessment.
The legacy `calculateDimensionMaturity` helper assumes explicit Mid positions
for level-only caller arrays; production aggregation uses actual numeric ratings instead.

## Existing Data and Review

### Revisiting Workflow Pages

Every reached stage can be reopened using the workflow stepper. Back opens the
previous stage, Next browses forward through already reached stages, and Return to
Current Stage restores the latest reached page. Company Discovery links back to
the assessment list. Unreached stages remain locked.

Navigation changes only the viewed page, not saved `currentStage`, scores or approvals.
Approvals still control actual progression. Saved data is reloaded when revisiting;
unsaved local form drafts are not retained when switching stage components.
Editing saved inputs may invalidate later approvals under the existing stage-specific
rules; reopening a page alone does not invalidate anything.

Persisted ratings without Position remain intact on disk but are exposed as unscored
under the new model. They are not silently assigned Mid or converted from old midpoint
scores. Regenerate proposals or review each rating and supply its Position.
Legacy dimension overrides are ignored; dimension reads derive current averages from
the underlying ratings, avoiding stale aggregates after edits.

Rating changes invalidate Stage 6 and subsequent approvals; dimension recalculation
invalidates Stage 7 and subsequent approvals. Review/reapprove the scoring stages and
regenerate downstream scenario/gap outputs after migrating or changing base scores.
The read-time compatibility handling does not automatically invalidate historical
approvals or rewrite historical scenario/gap records.

## Old Model vs. New Model

| Aspect | Previous implementation | Current workbook model |
|---|---|---|
| Sub-dimension input | Level only | Level + Low/Mid/High Position |
| Numeric conversion | Rounded midpoint: 33, 58, 78, 95 | Band minimum + offset: twelve scores from 3 to 97 |
| Dimension calculation | Average Levels, round to nearest Level, then normalize | Average numeric scores; derive Level by band lookup |
| Within-level variation | Not represented in the implemented calculation | Explicit Low/Mid/High judgment |
| Missing evidence | Average available Levels, even if only one is scored | Require at least two scored sub-dimensions |
| Composite | No coverage-gated overall composite in the old scoring engine | Equal mean of all qualifying dimensions; zero qualifying dimensions means no composite |
| Comparison | No shared-coverage comparison in the old engine | Mean over shared qualifying dimensions; at least one is mathematically required |
| Bias diagnostic | None | Partial-inclusive mean vs. Full-only mean, one-point tolerance |
| Fallback recommendation | Source count/quality could infer a capability Level | No guessed rating without a valid AI recommendation or evaluator input |
| Dimension override | Direct maturity override permitted | Formula-only; revise underlying ratings instead |

Both models use equal-weight averaging, not materiality weights. The difference is
what gets averaged and how sufficient evidence is established.

Example: two scored sub-dimensions at Level 3 and Level 4, both Mid:

- Old: average Levels = 3.5, round to Level 4, normalize to 95.
- New: scores = 63 and 88; average = 75.5; band lookup gives Level 3.

The old method can award the next Level before the numeric average reaches its
threshold. The new model avoids that rounding effect and preserves within-level
information, but its numeric spacing is still a policy choice, not a calibrated
measurement scale. Even unchanged Level 3 evidence moves from old 78 to new 63:
scores across model versions are not directly comparable.

**Recommendation:** use the new model for audited decision support and comparisons.
Its explicit evidence gaps, coverage gates and reproducible arithmetic are stronger
than the old implementation. Keep the maturity profile alongside the composite.
Neither model has demonstrated predictive validity for real disruption outcomes.
Version the rubric and re-score historical assessments before claiming improvement
or deterioration across versions.

## How the LLM Suggests a Rating

1. Select accepted, non-mock evidence assigned to the selected dimension and
   sub-dimension. Without such evidence, return no rating.
2. Send the model the sub-dimension description and the evidence claims, extracted
   values, excerpts and source metadata.
3. Ask for a Level, Position, confidence, rationale and evidence IDs. The LLM may
   make a qualitative judgment from the evidence; it must not invent facts or citations.
   It is a suggestion, not a verified finding or final decision.
4. Validate that Level and Position are a valid pair and cited evidence IDs belong
   to accepted records assigned to that sub-dimension. There is no required eight-item
   criterion response, exact quote matching or locked reporting-date check in this flow.
5. A reviewer accepts or edits the suggestion, links supporting accepted evidence,
   and confirms it. If the model is unavailable or cannot support a rating, the result
   stays unscored for manual entry.
6. The application deterministically converts Level + Position into the score:

```json
{
  "maturityLevel": 3,
  "position": "Mid",
  "confidence": "medium",
  "evidenceIds": ["accepted-evidence-id"],
  "rationale": "Evidence supports repeatable and tested capability, with gaps remaining."
}
```

`score = bandMinimum[3] + positionPoints[Mid] = 51 + 12 = 63`

The LLM does not choose a free-form number or perform dimension/composite math.
Confidence does not multiply or discount 63. Accepted evidence is approved for use,
not independently proven true; URL availability does not establish claim accuracy.

For a dimension with scores 63, 47 and 38, application arithmetic returns 49.333...,
Level 2. It then averages qualifying dimension scores equally to obtain the composite
when at least one dimension qualifies. A sub-dimension is a capability being evaluated;
Position is a within-Level refinement, not another nested dimension.

**Current limitations:** the model judges generic Level descriptions, not per-
sub-dimension threshold checklists. Valid IDs show which records it referenced, but
the app does not prove that those records semantically justify the recommendation.
Reviewers must check the source, period, scope and rationale. Numeric consistency
and the accuracy of the model judgment are not guaranteed by this simplified flow.

## Recommended Improvements

These are proposals, not additional scoring behavior silently introduced into the
CSV-based implementation.

1. **Keep the default workflow lightweight.** Use the current Level + Position proposal
  and reviewer flow for ordinary assessments. If reviewers find a high-impact area
  ambiguous, add a short optional measure-specific guide for that sub-dimension rather
  than making a long checklist mandatory for every rating.
2. **Separate evidence quality from Position.** Thin or dated evidence is uncertainty,
  not necessarily low capability. Show capability strength, source confidence and
  coverage independently. Any change to the CSV's Position interpretation requires
  an agreed rubric revision, not an undisclosed implementation change.
3. **Strengthen coverage reporting.** With no composite-level minimum, a single
  dimension can produce a composite from just two of 45 ratings. Keep coverage visible
  beside every headline and explain that missing dimensions
  are not part of the average. Avoid new mandatory percentage/critical-dimension gates
  unless reviewers establish that the extra requirements fit the assessment purpose.
4. **Compare matched sub-dimensions and periods.** Shared dimensions alone can hide
  different missing components. Report overlap counts and suppress conclusions when
  company evidence is not genuinely comparable.
5. **Expose sensitivity, not false certainty.** Show the effect of missing items and
  plausible adjacent ratings, retaining the profile and critical weaknesses beside
  the mean. Label sensitivity ranges as scenarios, not statistical confidence intervals.
6. **Calibrate reviewers and validate outcomes.** Independently score reference cases,
  measure agreement, resolve disagreements and test whether ratings distinguish
  known disruption/recovery outcomes. Prefer broad decision categories over rankings
  based on one-point differences until calibrated.
7. **Version the assessment contract.** Store rating method, prompt/model version,
  evidence IDs, source period when known, and human decisions. If reporting periods
  are required for a comparison, record them explicitly. Mark downstream scenario/gap
  outputs stale when their base evidence or ratings change.
8. **Make approval gates meaningful.** Before final sign-off, verify current evidence,
  valid ratings, reviewer decisions and R1. An assessment with no qualifying dimension
  has no composite; when coverage is sparse, label the composite accordingly rather
  than implying it represents the full framework.

## Issues and Limitations

- **Missing-data bias:** R1 permits a composite with as few as 2 of 45 ratings, if
  both ratings are in one dimension. Missing weak capabilities can inflate results.
  R3 is a sensitivity test,
  not proof of unbiased coverage; it cannot detect gaps inside Full dimensions.
- **Comparison bias:** shared qualifying dimensions can still have different scored
  sub-dimensions. Dimension-level like-for-like is not sub-dimension-level matching.
- **Ordinal arithmetic:** equal numeric increments imply comparable capability
  distances across levels and dimensions, although the rubric has not established
  that empirically. Do not interpret one-point differences as statistical precision.
- **Threshold cliffs:** small numeric differences near 26/51/76 change Levels.
  Display rounding can show 76.0 beside Level 3 for an underlying 75.96.
- **Undefined confidence thresholds and R3 details:** the supplied exports lack
  the Evidence & Benchmark sheet and its formulas. Confirm before claiming exact
  workbook parity for those diagnostics.
- **Evaluator discretion:** rubric definitions are generic; agree measurable,
  industry-specific criteria and calibration examples to make ratings reproducible.
  Human review must enforce capability/evidence standards; input validation alone cannot.
- **Scope:** workbook company-name inputs, spreadsheet editing, and a new industry
  taxonomy are not introduced. Existing assessment workflows and SaaS/IT taxonomy remain.

Regression tests cover all twelve scores, boundaries, the liquidity example, R1/R3,
like-for-like overlap, legacy ratings, endpoint exceptions and rating API validation.
