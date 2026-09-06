# AURORA — Data Model

## Entity Relationship

```
Assessment ──1:N── StageApproval
Assessment ──1:N── DimensionScore
Assessment ──1:N── SubdivisionScore
Assessment ──1:N── ScenarioAssessment
Assessment ──1:N── Evidence
Assessment ──1:N── AuditEntry
Assessment ──1:N── ResilienceGap

DimensionScore ──1:N── SubdivisionScore
Evidence ──N:1── Dimension (via dimension_key)
Evidence ──N:1── Subdivision (via subdivision_key)
ScenarioAssessment ──N:1── DimensionScore
SubdivisionScore ──N:M── Evidence (via subdivision_evidence join)
```

## Tables

### assessments

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_name | text | |
| company_description | text | |
| industry | text | |
| company_size | enum('small','medium','large') | Affects segmentation lens |
| data_source_mode | enum('public','uploaded','both') | |
| current_stage | int | 1–10 per checkpoint list |
| assessment_lens | text | Default: 'SaaS/IT' |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### stage_approvals

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assessment_id | uuid FK | |
| stage | int | 1–10 |
| status | enum('pending','approved','rejected') | |
| approved_at | timestamptz | Null until approved |
| notes | text | Optional reviewer notes |

### evidence

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assessment_id | uuid FK | |
| claim | text | What is being claimed |
| extracted_value | text | Specific data point extracted |
| supporting_excerpt | text | Verbatim excerpt from source |
| source_title | text | |
| publisher | text | |
| source_url | text | Nullable — never fabricated |
| source_type | enum('annual_report','regulatory_filing','investor_relations','sustainability_report','risk_disclosure','regulatory_publication','research','uploaded_document','other') | |
| publication_date | date | Nullable |
| retrieval_timestamp | timestamptz | When evidence was gathered |
| page_number | text | Nullable |
| dimension_key | text | e.g. 'revenue_durability' |
| subdivision_key | text | Nullable — e.g. 'retention_metrics' |
| url_resolved | boolean | Default true; false = unresolved |
| status | enum('proposed','accepted','rejected') | User gating |
| rejection_reason | text | Required when rejected |
| source_origin | enum('llm_research','user_provided','user_uploaded') | |
| created_at | timestamptz | |

### uploaded_documents

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assessment_id | uuid FK | |
| filename | text | |
| mime_type | text | |
| storage_path | text | Local file path in container |
| uploaded_at | timestamptz | |

### dimension_scores

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assessment_id | uuid FK | |
| dimension_key | text | One of 15 dimensions |
| maturity_level | int | 1–4 or null (not scored) |
| normalized_score | numeric | 0–100 or null |
| is_selected_for_deep | boolean | Whether selected for SaaS/IT deep assessment |
| confidence | enum('high','medium','low') | |
| status | enum('not_started','insufficient_evidence','scored','overridden') | |
| override_reason | text | Required when overridden |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### subdivision_scores

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assessment_id | uuid FK | |
| dimension_score_id | uuid FK | |
| dimension_key | text | |
| subdivision_key | text | One of 3 per dimension |
| maturity_level | int | 1–4 or null |
| normalized_score | numeric | 0–100 or null |
| confidence | enum('high','medium','low') | |
| status | enum('not_started','insufficient_evidence','scored','overridden') | |
| override_reason | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### subdivision_evidence (join table)

| Column | Type | Notes |
|---|---|---|
| subdivision_score_id | uuid FK | |
| evidence_id | uuid FK | |
| PK | (subdivision_score_id, evidence_id) | |

### scenario_assessments

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assessment_id | uuid FK | |
| scenario_key | enum('autonomous_advantage','storm_and_signal','managed_modernization','exposed_and_reactive') | |
| dimension_key | text | |
| base_maturity | int | Current score from dimension_scores |
| scenario_maturity | int | Adjusted score under this scenario |
| scenario_normalized | numeric | |
| adjustment_rationale | text | Required |
| relevant_evidence_ids | uuid[] | |
| confidence | enum('high','medium','low') | |
| user_approved | boolean | Default false |
| override_reason | text | |
| created_at | timestamptz | |

### resilience_gaps

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assessment_id | uuid FK | |
| dimension_key | text | |
| subdivision_key | text | Nullable |
| maturity_level | int | |
| scenario_key | text | |
| gap_description | text | Evidence-backed gap |
| business_implication | text | |
| supporting_evidence_ids | uuid[] | |
| classification | enum('strong','conditional','exposed') | |
| created_at | timestamptz | |

### audit_trail

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assessment_id | uuid FK | |
| action | text | e.g. 'score_override', 'evidence_rejected', 'stage_approved' |
| entity_type | text | e.g. 'dimension_score', 'evidence', 'stage' |
| entity_id | uuid | |
| old_value | jsonb | |
| new_value | jsonb | |
| reason | text | |
| actor | text | 'user' or 'system' |
| timestamp | timestamptz | |

## Static Configuration (TypeScript Constants, Not DB)

### Dimensions (15)

```typescript
type DimensionKey =
  | 'revenue_durability'
  | 'opex_elasticity'
  | 'capex_optionality'
  | 'liquidity_runway'
  | 'operational_continuity'
  | 'erp_data_backbone'
  | 'innovation_rd_capacity'
  | 'market_development_sales'
  | 'business_development_ma'
  | 'technology_ai_cyber'
  | 'sustainability_environmental'
  | 'trust_regulation_reputation'
  | 'decision_agility'
  | 'talent_culture_resilience'
  | 'ecosystem_partner_strength';
```

### Scenarios (4)

```typescript
type ScenarioKey =
  | 'autonomous_advantage'     // High AI / Stable Macro
  | 'storm_and_signal'         // High AI / High Macro
  | 'managed_modernization'    // Low AI / Stable Macro
  | 'exposed_and_reactive';    // Low AI / High Macro
```

### Maturity Rubric

```typescript
type MaturityLevel = 1 | 2 | 3 | 4;
// Level 1: Basic / Not Met
// Level 2: Developing / Partially Met
// Level 3: Established / Mostly Met
// Level 4: Advanced / Fully Met
```

### Normalization Anchors

```typescript
const NORMALIZATION_RANGES: Record<MaturityLevel, [number, number]> = {
  1: [25, 40],
  2: [50, 65],
  3: [70, 85],
  4: [90, 100],
};
```

### Subdivisions (3 per dimension, 45 total)

Each dimension selected for deeper SaaS/IT assessment gets exactly 3 subdivisions.
Subdivision definitions are static constants derived from the charter's dimension descriptions.
See `scoring-engine.md` for the full subdivision mapping.
