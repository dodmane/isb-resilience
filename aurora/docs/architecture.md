# AURORA — Architecture

## System Overview

AURORA is a gated, human-in-the-loop business-resilience assessment application.
It combines deterministic framework logic with LLM-assisted research and reasoning,
enforcing a strict boundary between the two.

```
┌──────────────────────────────────────────────────────────┐
│                      Browser (Next.js)                   │
│  Workflow Stepper · Assessment UI · Evidence Drawer      │
│  Radar Chart · Dashboard · Audit Trail                   │
└────────────────────────┬─────────────────────────────────┘
                         │  REST / Server Actions
┌────────────────────────▼─────────────────────────────────┐
│                   Next.js API Layer                       │
│                                                          │
│  ┌─────────────────┐  ┌──────────────────────────────┐   │
│  │  Framework Core  │  │        LLM Service            │  │
│  │  (Deterministic) │  │  (Research / Classification)  │  │
│  │                  │  │                                │  │
│  │ • 15 dimensions  │  │ • Company research             │  │
│  │ • 3 subdivisions │  │ • Evidence extraction          │  │
│  │ • 4 scenarios    │  │ • Classification assistance    │  │
│  │ • 1-4 rubric     │  │ • Maturity recommendation      │  │
│  │ • Normalization   │  │ • Scenario reasoning           │  │
│  │ • Averaging       │  │ • Gap explanation              │  │
│  │ • Approval gates  │  │                                │  │
│  │ • Audit trail     │  │  (Never redefines methodology) │  │
│  └─────────────────┘  └──────────────────────────────┘   │
│                         │                                 │
│                    ┌────▼──────┐                          │
│                    │ PostgreSQL │                          │
│                    └───────────┘                          │
└──────────────────────────────────────────────────────────┘
```

## Boundary: Deterministic vs LLM

| Responsibility | Owner |
|---|---|
| Workflow state machine & gating | Application code |
| 15 dimensions + subdivision definitions | Application code (static config) |
| 4 scenario definitions | Application code (static config) |
| 1–4 maturity rubric definitions | Application code (static config) |
| Score normalization (1–4 → 0–100) | Application code |
| Dimension score = avg(subdivision scores) | Application code |
| Approval state management | Application code |
| Audit trail persistence | Application code |
| Company discovery & research | LLM |
| Evidence extraction from sources | LLM |
| Classification of evidence to dimensions | LLM |
| Maturity-level recommendation (proposal only) | LLM |
| Scenario stress-test reasoning | LLM |
| Resilience gap explanation | LLM |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| Backend | Next.js API routes / Server Actions |
| Database | PostgreSQL |
| LLM | OpenAI API (GPT-4o) via server-side calls |
| Deployment | Docker (docker-compose) |

## Docker Topology

```yaml
services:
  aurora-app:       # Next.js (build + serve)
    ports: ["3000:3000"]
    depends_on: [postgres]
  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
```

## Key Architectural Decisions

1. **Monorepo** — Single Next.js app with API routes; no separate backend service.
2. **Server Actions for mutations** — Approval gates, score edits, evidence CRUD.
3. **Static framework config** — Dimensions, subdivisions, scenarios, rubric stored as TypeScript constants (not DB). Changes require a code deploy.
4. **LLM isolation** — All LLM calls go through a single service layer (`lib/llm/`). The LLM receives structured prompts and returns structured JSON. The application validates and constrains LLM output before persisting.
5. **Gated workflow** — A state machine prevents progression until user approval. State stored in `assessments.current_stage` + `stage_approvals` table.
6. **Evidence-first** — No maturity score can be saved without linked evidence or an explicit "insufficient evidence" marker.
7. **Audit trail** — Every state change, score edit, override, and approval is logged with timestamp, actor, old value, new value, and reason.

## Directory Structure

```
aurora/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── docs/                    # Design documents
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Landing / assessment list
│   │   ├── assessment/
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── company-discovery/
│   │   │       ├── scenario-context/
│   │   │       ├── dimension-screening/
│   │   │       ├── evidence-plan/
│   │   │       ├── evidence-gathering/
│   │   │       ├── subdivision-scoring/
│   │   │       ├── dimension-scoring/
│   │   │       ├── scenario-stress-test/
│   │   │       ├── resilience-gaps/
│   │   │       ├── dashboard/
│   │   │       └── evidence-register/
│   │   └── api/
│   │       ├── assessments/
│   │       ├── evidence/
│   │       ├── llm/
│   │       └── audit/
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── assessment/      # Domain components
│   │   │   ├── EvidenceCard.tsx
│   │   │   ├── EvidenceDrawer.tsx
│   │   │   ├── SourceLink.tsx
│   │   │   ├── MaturityBadge.tsx
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   ├── ReviewCheckpoint.tsx
│   │   │   ├── DimensionCard.tsx
│   │   │   ├── SubdivisionAssessment.tsx
│   │   │   ├── ScenarioCard.tsx
│   │   │   ├── RadarChart.tsx
│   │   │   ├── LeadershipFocusMap.tsx
│   │   │   └── AuditTrail.tsx
│   │   └── workflow/
│   │       └── WorkflowStepper.tsx
│   ├── lib/
│   │   ├── framework/       # Deterministic core
│   │   │   ├── dimensions.ts
│   │   │   ├── subdivisions.ts
│   │   │   ├── scenarios.ts
│   │   │   ├── rubric.ts
│   │   │   ├── scoring.ts
│   │   │   └── normalization.ts
│   │   ├── llm/             # LLM service layer
│   │   │   ├── client.ts
│   │   │   ├── prompts/
│   │   │   ├── research.ts
│   │   │   ├── evidence.ts
│   │   │   ├── scoring-recommendation.ts
│   │   │   └── scenario-reasoning.ts
│   │   ├── db/              # Database access
│   │   │   ├── schema.ts
│   │   │   ├── migrations/
│   │   │   └── queries/
│   │   └── workflow/        # State machine
│   │       ├── stages.ts
│   │       └── transitions.ts
│   └── types/               # Shared TypeScript types
│       ├── assessment.ts
│       ├── evidence.ts
│       ├── scoring.ts
│       └── scenario.ts
└── scripts/
    ├── seed-framework.ts
    └── migrate.ts
```
