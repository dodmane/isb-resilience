# AURORA — Scoring Engine

## Principles

1. The maturity level (1–4) is the **primary** assessment output.
2. The normalized 0–100 value is a **representation**, not mathematical precision.
3. No arbitrary weights are applied to dimensions or subdivisions.
4. Confidence is tracked separately and never inflates/deflates maturity.
5. No score may exist without evidence or an explicit "insufficient evidence" marker.

## Maturity Rubric

| Level | Label | Description |
|---|---|---|
| 1 | Basic / Not Met | Capability is absent, ad-hoc, or reactive. No structured approach. |
| 2 | Developing / Partially Met | Capability exists but is inconsistent, incomplete, or untested. |
| 3 | Established / Mostly Met | Capability is structured, documented, and operational with minor gaps. |
| 4 | Advanced / Fully Met | Capability is mature, tested, adaptive, and demonstrably resilient. |

## Normalization

```typescript
const NORMALIZATION_RANGES: Record<MaturityLevel, [number, number]> = {
  1: [25, 40],
  2: [50, 65],
  3: [70, 85],
  4: [90, 100],
};

function normalize(maturityLevel: MaturityLevel): number {
  const [low, high] = NORMALIZATION_RANGES[maturityLevel];
  return Math.round((low + high) / 2);
  // Level 1 → 33, Level 2 → 58, Level 3 → 78, Level 4 → 95
}
```

The midpoint is used as the default normalized value. Users may adjust within the
range if they want to express within-level nuance (e.g., a "strong 3" vs "weak 3").

## Scoring Flow

```
Evidence Items
    ↓ (classification by dimension + subdivision)
Subdivision Maturity (1–4)
    ↓ (average of applicable subdivisions)
Dimension Maturity (1–4)
    ↓ (normalize)
Dimension Normalized Score (0–100)
```

### Subdivision → Dimension Averaging

```typescript
function calculateDimensionMaturity(
  subdivisionScores: SubdivisionScore[]
): number {
  const scored = subdivisionScores.filter(s => s.maturity_level !== null);
  if (scored.length === 0) return null; // NOT SCORED
  const avg = scored.reduce((sum, s) => sum + s.maturity_level, 0) / scored.length;
  return Math.round(avg); // Round to nearest integer (1–4)
}
```

No weights. Pure average. This is per charter: "averages the sub-dimension scores
to produce the dimension result."

### Handling Partial Scoring

If only 1 or 2 of 3 subdivisions have evidence:
- Average only the scored subdivisions
- Set dimension confidence to LOW (fewer data points)
- Display which subdivisions remain unscored

If 0 subdivisions are scored:
- Dimension status = `NOT SCORED — INSUFFICIENT EVIDENCE`

## Confidence Assessment

```typescript
type Confidence = 'high' | 'medium' | 'low';

// Confidence considers:
// - Evidence coverage (how many subdivisions have evidence)
// - Source authority (primary vs secondary sources)
// - Recency (how old is the evidence)
// - Consistency (do sources agree)

function assessSubdivisionConfidence(
  evidenceItems: Evidence[]
): Confidence {
  if (evidenceItems.length === 0) return 'low';
  
  const hasPrimarySource = evidenceItems.some(e => 
    ['annual_report', 'regulatory_filing'].includes(e.source_type)
  );
  const isRecent = evidenceItems.some(e => {
    if (!e.publication_date) return false;
    const age = Date.now() - new Date(e.publication_date).getTime();
    return age < 365 * 24 * 60 * 60 * 1000; // < 1 year
  });
  
  if (evidenceItems.length >= 2 && hasPrimarySource && isRecent) return 'high';
  if (evidenceItems.length >= 1 && (hasPrimarySource || isRecent)) return 'medium';
  return 'low';
}
```

## Scenario Stress Testing

Base maturity represents current organizational capability.
Scenario assessment evaluates behavior under each of the four futures.

```typescript
interface ScenarioAdjustment {
  scenario_key: ScenarioKey;
  dimension_key: DimensionKey;
  base_maturity: MaturityLevel;
  scenario_maturity: MaturityLevel; // May differ from base
  rationale: string;               // Required
  evidence_ids: string[];          // Required
  confidence: Confidence;          // Required
  user_approved: boolean;          // Gate
}
```

Scenario adjustments can increase or decrease maturity. For example:
- "Autonomous Advantage" may increase Innovation & R&D if the company has strong AI readiness
- "Exposed and Reactive" may decrease Liquidity & Runway if the company has thin margins

## Resilience Classification

After scenario stress testing, each dimension is classified:

| Classification | Criteria |
|---|---|
| **Strong** | Maturity remains ≥ 3 across all 4 scenarios |
| **Conditional** | Maturity ≥ 3 in some scenarios but drops below in others |
| **Exposed** | Maturity < 3 in base or drops significantly under stress |

## 15 Dimensions with SaaS/IT Subdivisions

Each dimension selected for deep assessment gets exactly 3 subdivisions.
Below are subdivisions derived from the charter's dimension descriptions.

| # | Dimension | Subdivision 1 | Subdivision 2 | Subdivision 3 |
|---|---|---|---|---|
| 1 | Revenue Durability | Retention & NRR | Pricing Power & Mix | Customer Concentration & Demand |
| 2 | OpEx Elasticity | Cloud & Hosting Flexibility | Payroll & Workforce Flexibility | Vendor & S&M Spend Control |
| 3 | CapEx Optionality | Software Capitalization | Infrastructure Investment | Deferrability & Reversibility |
| 4 | Liquidity & Runway | Cash Generation & Buffers | Financing Access | Burn Profile & Shock Absorption |
| 5 | Operational Continuity | SLA & Uptime Performance | Disaster Recovery & BCP | Redundancy & Recovery |
| 6 | ERP & Data Backbone | Data Quality & Integration | Reporting & Controls | Decision Visibility |
| 7 | Innovation & R&D Capacity | Product Relevance & Roadmap | Engineering Capacity & Cadence | AI Readiness & Innovation Pipeline |
| 8 | Market Development & Sales | Pipeline & Conversion | CAC/LTV Economics | Geographic & Channel Diversification |
| 9 | Business Development & M&A | Partnership Strategy | Acquisition & Integration | Build-Buy-Partner Optionality |
| 10 | Technology, AI & Cyber | Cyber Maturity & Data Security | AI Governance | Cloud Dependency & Concentration |
| 11 | Sustainability & Environmental | Energy & Emissions | Climate Exposure | Disclosure & Compliance Readiness |
| 12 | Trust, Regulation & Reputation | Compliance & Privacy | Security Assurance & Quality | Stakeholder Confidence & Reputation |
| 13 | Decision Agility | Signal-to-Decision Speed | Escalation & Trigger Discipline | Resource Reallocation Capability |
| 14 | Talent & Culture Resilience | Leadership Depth & Succession | Critical Skills & Retention | Adaptability & Knowledge Continuity |
| 15 | Ecosystem & Partner Strength | Cloud & Technology Partners | Channel & Strategic Partners | Switching Cost & Ecosystem Resilience |

## What the LLM Does vs. Does Not Do

| LLM Does | LLM Does NOT |
|---|---|
| Proposes maturity level with rationale | Set the final score |
| Cites evidence for the proposal | Invent evidence |
| Explains scenario adjustments | Apply weights |
| Identifies gaps and implications | Override user decisions |
| Recommends confidence level | Change the rubric or dimensions |
