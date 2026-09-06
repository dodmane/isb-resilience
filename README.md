# AURORA

Adaptive, Uncertainty, Resilience, Opportunity & Risk Assessment is a
human-in-the-loop business-resilience assessment application for SaaS and IT
organizations. It combines fixed scoring methodology with Anthropic-assisted
research, evidence classification, and recommendations.

## Prerequisites

- Node.js 20 or later and npm for local development.
- An Anthropic API key for LLM-assisted workflows.
- Docker Desktop for Mac when running the containerized application.

## Quick Start

1. Create `.env.local` in the repository root:

	```dotenv
	ANTHROPIC_BASE_URL=https://api.anthropic.com
	ANTHROPIC_API_KEY=your_anthropic_api_key
	CLAUDE_MODEL=claude-sonnet-4-6
	```

2. Install dependencies and start the development server:

	```bash
	npm ci
	npm run dev
	```

3. Open `http://localhost:3000`.

`.env.local` is ignored by Git. Keep the API key server-side and never use a
`NEXT_PUBLIC_` prefix for it.

## Run with Docker

After installing and starting Docker Desktop, create `.env.local` as shown
above and run:

```bash
./run.sh
```

The application builds and starts in the background at
`http://localhost:3000`. To inspect it or stop it:

```bash
docker compose logs -f aurora-app
docker compose down
```

Recreate the container after changing `.env.local`:

```bash
docker compose up --build -d --force-recreate
```

## Development Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Produce a production build. |
| `npm run start` | Serve a completed production build. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the Jest test suite. |

## Documentation

- [Anthropic API and Docker setup](docs/anthropic-api-setup.md)
- [Architecture](docs/architecture.md)
- [Assessment workflow](docs/workflow.md)
- [Scoring engine](docs/scoring-engine.md)
- [Data model](docs/data-model.md)
- [UI screen map](docs/ui-screen-map.md)
