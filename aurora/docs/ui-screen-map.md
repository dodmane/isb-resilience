# AURORA — UI Screen Map

## Layout

Every screen shares:
- **Top bar:** AURORA logo + assessment name + current stage indicator
- **Workflow Stepper:** Horizontal progress bar showing all 10 stages; current stage highlighted; future stages grayed/locked
- **Bottom of each stage page:** `ReviewCheckpoint` component with Review / Edit / Approve & Continue buttons

## Screens

### 0. Landing Page (`/`)

| Element | Description |
|---|---|
| New Assessment button | Starts a new assessment |
| Assessment list | Cards showing existing assessments with company name, stage, date |

---

### 1. Company Discovery (`/assessment/[id]/company-discovery`)

| Element | Component |
|---|---|
| Company name input | Text input |
| Data source mode selector | Radio: Public / Uploaded / Both |
| Document upload area | Drag-and-drop zone (when uploaded/both selected) |
| Research trigger | Button: "Discover Company" |
| Company profile card | Editable card showing discovered profile |
| Industry + size classification | Dropdown/badges |
| ReviewCheckpoint | Review · Edit · Approve & Continue |

---

### 2. Scenario Context (`/assessment/[id]/scenario-context`)

| Element | Component |
|---|---|
| 2×2 scenario matrix | Visual grid: AI depth (x) vs Macro intensity (y) |
| 4 × ScenarioCard | Each showing: name, narrative, assumptions, triggers, early-warning indicators |
| Scenario narratives | Editable text areas within each ScenarioCard |
| ReviewCheckpoint | Review · Edit · Approve & Continue |

---

### 3. Dimension Screening (`/assessment/[id]/dimension-screening`)

| Element | Component |
|---|---|
| 15 × DimensionCard | Each showing: name, description, LLM recommendation |
| Deep assessment toggle | Per dimension: toggle for deep (3-subdivision) assessment |
| Screening rationale | Editable text per dimension |
| Selection summary | Count of deep vs. surface dimensions |
| ReviewCheckpoint | Review · Edit · Approve & Continue |

---

### 4. Evidence Plan (`/assessment/[id]/evidence-plan`)

| Element | Component |
|---|---|
| Dimension/subdivision tree | Expandable tree showing selected dimensions and their subdivisions |
| Evidence targets | Per subdivision: what to search for, which sources |
| Add source URL | Input for user-provided URLs |
| Add search target | Input for additional search targets |
| ReviewCheckpoint | Review · Edit · Approve & Continue |

---

### 5. Evidence Gathering (`/assessment/[id]/evidence-gathering`)

| Element | Component |
|---|---|
| Evidence list per dimension | Grouped by dimension → subdivision |
| EvidenceCard (per item) | Shows: claim, excerpt, source, SourceLink, status badge |
| SourceLink | "Open Original Source" — opens URL in new tab |
| Accept / Reject buttons | Per evidence item; reject requires reason |
| Add Evidence button | Manual entry form |
| Upload Evidence button | File upload |
| Find More Evidence button | Re-triggers LLM research for a subdivision |
| Record Assumption button | Records an assumption (not evidence) |
| Insufficient Evidence marker | Marks subdivision as not scorable |
| Evidence summary | Counts: accepted / rejected / pending per dimension |
| ReviewCheckpoint | Review · Edit · Approve & Continue |

---

### 6. Subdivision Scoring (`/assessment/[id]/subdivision-scoring`)

| Element | Component |
|---|---|
| Dimension accordion | Expandable per dimension |
| SubdivisionAssessment (×3) | Per subdivision: evidence summary, proposed maturity, rationale |
| MaturityBadge | Visual badge showing 1–4 level |
| ConfidenceBadge | HIGH / MEDIUM / LOW badge |
| Score override | Dropdown (1–4) + reason text field |
| Linked evidence | Expandable list of evidence items; opens EvidenceDrawer |
| NOT SCORED option | Button for insufficient evidence |
| ReviewCheckpoint | Review · Edit · Approve & Continue |

---

### 7. Dimension Scoring (`/assessment/[id]/dimension-scoring`)

| Element | Component |
|---|---|
| 15-dimension summary table | Dimension name, maturity, normalized, confidence, status |
| MaturityBadge per dimension | Calculated from subdivision average |
| Calculation breakdown | Shows: subdivision scores → average → maturity → normalized |
| Override control | Per dimension: dropdown + reason |
| Mini radar preview | RadarChart showing current maturity profile |
| ReviewCheckpoint | Review · Edit · Approve & Continue |

---

### 8. Scenario Stress Test (`/assessment/[id]/scenario-stress-test`)

| Element | Component |
|---|---|
| Scenario selector tabs | 4 tabs: one per scenario |
| Dimension × Scenario grid | Table: dimension rows × scenario columns showing base vs. adjusted maturity |
| Adjustment cards | Per cell: rationale, evidence links, confidence |
| ScenarioCard header | Scenario name + narrative summary |
| Override controls | Dropdown + reason per adjustment |
| Comparison radar | RadarChart overlaying base + scenario-adjusted profiles |
| ReviewCheckpoint | Review · Edit · Approve & Continue |

---

### 9. Resilience Gaps (`/assessment/[id]/resilience-gaps`)

| Element | Component |
|---|---|
| Gap list | Grouped by: Strong / Conditional / Exposed |
| Gap card | Dimension, subdivision, maturity, scenario, gap description, implication |
| Evidence links | Per gap: linked evidence items |
| Edit controls | Edit classification, description, implication |
| Leadership recommendations | Framework-level guidance (not implementation plans) |
| ReviewCheckpoint | Review · Edit · Approve & Continue |

---

### 10. Final Dashboard (`/assessment/[id]/dashboard`)

| Element | Component |
|---|---|
| Company profile header | Name, industry, size, lens, date |
| RadarChart | 15-dimension resilience radar (Recharts) |
| Maturity table | All 15 dimensions: level + normalized + confidence |
| Scenario resilience matrix | Heatmap: dimensions × scenarios |
| Capability classification | Strong / Conditional / Exposed lists |
| LeadershipFocusMap | Priority visualization |
| Early Warning Indicators | Scenario-triggered monitoring items |
| Evidence Register link | Full evidence list with drill-through |
| AuditTrail | Complete log of all actions, overrides, approvals |

---

### Evidence Register (`/assessment/[id]/evidence-register`)

| Element | Component |
|---|---|
| Full evidence table | Filterable / sortable list of all evidence items |
| Drill-through | Dimension → Subdivision → Evidence → SourceLink |
| Filter controls | By dimension, subdivision, source type, status, confidence |
| EvidenceDrawer | Slide-out panel showing full evidence detail |

---

## Reusable Components

| Component | Purpose |
|---|---|
| `EvidenceCard` | Displays a single evidence item with metadata |
| `EvidenceDrawer` | Slide-out panel for detailed evidence view + source link |
| `SourceLink` | "Open Original Source" link; handles unresolved URLs gracefully |
| `MaturityBadge` | Visual badge: Level 1–4 with color coding |
| `ConfidenceBadge` | HIGH (green) / MEDIUM (yellow) / LOW (red) badge |
| `ReviewCheckpoint` | Gate UI: Review / Edit / Approve & Continue buttons |
| `DimensionCard` | Dimension overview with screening toggle |
| `SubdivisionAssessment` | Score entry for one subdivision |
| `ScenarioCard` | Scenario narrative and assumptions |
| `RadarChart` | 15-axis radar chart (Recharts) |
| `LeadershipFocusMap` | Priority area visualization |
| `AuditTrail` | Scrollable audit log table |
| `WorkflowStepper` | Top-level progress indicator |
