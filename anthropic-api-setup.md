# Anthropic API Setup

This application uses the Anthropic Messages API for LLM-assisted research,
classification, scoring recommendations, scenario reasoning, and resilience-gap
explanations. LLM output is advisory; the application retains control of the
assessment workflow and scoring rules.

## 1. Create an Anthropic API key

1. Go to the [Claude Platform Console](https://platform.claude.com/) and sign
   in or create an account.
2. Select the intended organization and project. Configure billing for the
   project if prompted.
3. Open [API keys](https://platform.claude.com/settings/keys).
4. Create a key, give it a purpose-specific name such as `aurora-local`, and
   copy it when it is shown.

The key is a secret. Do not commit it, paste it in tickets or chat, or expose it
in client-side code. If a key is shared accidentally, revoke it in the Console
and create a replacement.

Official references:

- [Anthropic API quickstart](https://platform.claude.com/docs/en/docs/initial-setup)
- [Messages API overview](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [Models overview](https://platform.claude.com/docs/en/models/overview)

## 2. Replace the LLM Hub configuration

Configuration is read from `.env.local` in the repository root. This file is
ignored by Git. Replace the existing gateway values with the following, using
the key created in the Console:

```dotenv
# Direct Anthropic API configuration
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_API_KEY=your_anthropic_api_key
CLAUDE_MODEL=claude-sonnet-4-6
```

The variables are consumed only on the server by
`src/lib/llm/client.ts`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Authenticates each request to Anthropic. |
| `ANTHROPIC_BASE_URL` | No | Anthropic API endpoint. Set it explicitly to `https://api.anthropic.com` when replacing LLM Hub. If omitted, this is already the code default. |
| `CLAUDE_MODEL` | No | Model identifier. Defaults to `claude-sonnet-4-6`. Use only a model available to the selected Anthropic project. |

Do not use a `NEXT_PUBLIC_` prefix: that would expose the key to browsers. No
source-code changes are necessary for the switch because the client already
uses Anthropic-compatible Messages API requests.

## 3. Run locally

Prerequisites: Node.js 20 or later, npm, and a valid `.env.local` file.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Next.js loads `.env.local` for the development
server. Restart `npm run dev` after editing the file so the server reads the new
configuration.

To verify the repository without starting the app:

```bash
npm test
npm run lint
npm run build
```

## 4. Install Docker Desktop

Docker Hub is the image registry; to run this application on macOS, install
[Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/). On
the download page, choose the installer for the Mac's processor:

- **Apple chip** for Apple Silicon Macs (M1, M2, M3, M4, and later).
- **Intel chip** for Intel-based Macs.

Open the downloaded installer, move Docker to Applications when prompted, then
open Docker Desktop and complete its initial setup. Wait until Docker Desktop
reports that the engine is running. Signing in to Docker Hub is optional for
this application; it builds its image locally and uses the public Node base
image.

Verify the installation from a new terminal:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

The last command downloads and runs Docker's public test image. It should print
a confirmation message and exit successfully.

## 5. Run with Docker

Docker Compose passes `.env.local` into the `aurora-app` container. From the
repository root, run:

```bash
./run.sh
```

This builds the image and starts the application in the background at
`http://localhost:3000`.

After changing `.env.local`, recreate the container so it receives the updated
variables:

```bash
docker compose up --build -d --force-recreate
```

To view logs and stop the application:

```bash
docker compose logs -f aurora-app
docker compose down
```

## Troubleshooting

| Symptom | Likely cause and action |
| --- | --- |
| `LLM not configured — set ANTHROPIC_API_KEY` | Add a non-empty `ANTHROPIC_API_KEY` to `.env.local` and restart or recreate the server/container. |
| `LLM API error: 401` | The key is invalid, revoked, or belongs to an unavailable project. Create or select the correct key in the Anthropic Console. |
| `LLM API error: 403` | The Anthropic project may not have access to the chosen model or required billing permissions. Check the project and `CLAUDE_MODEL`. |
| `LLM API error: 404` | Ensure `ANTHROPIC_BASE_URL=https://api.anthropic.com`; an old LLM Hub endpoint may still be configured. |
| Model request fails after authentication | Set `CLAUDE_MODEL` to a model enabled for the Anthropic project, then restart or recreate the application. |

The application logs the HTTP status and Anthropic response body to the server
console, but it does not return the provider response body to the browser. Check
the terminal running `npm run dev` or `docker compose logs -f aurora-app` for
the detailed provider error.

## Deployment and rotation

For production, provide the same three variables through the deployment
platform's secret manager rather than committing or baking `.env.local` into an
image. Keep `ANTHROPIC_API_KEY` restricted to the server runtime.

When rotating a key, add the replacement secret, deploy or restart the service,
confirm a request succeeds, then revoke the previous key in the Anthropic
Console. Do not run two long-lived production keys unless there is an explicit
rotation plan requiring temporary overlap.