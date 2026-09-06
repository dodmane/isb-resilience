# AURORA

AURORA is a resilience assessment application. The easiest way to run it is
with Docker Desktop. You do not need to install Node.js for the Docker method.

## Quick Start With Docker

### 1. Install Docker Desktop

Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
for your computer. Open Docker Desktop and wait until it says that Docker is
running.

### 2. Download AURORA

On the GitHub page, select **Code**, then **Download ZIP**. Unzip the download
somewhere easy to find, such as your Desktop.

Open the unzipped project folder. The application is inside the `aurora`
folder. Open a terminal in that folder, or use:

```bash
cd path/to/isb-resilience/aurora
```

On Windows PowerShell, the path may look like this:

```powershell
cd C:\Users\YourName\Downloads\isb-resilience\aurora
```

### 3. Create the configuration file

Copy `.env.example` to a new file named `.env.local` in the `aurora` folder.

Then open `.env.local` in a text editor and add your Anthropic API key:

```dotenv
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_API_KEY=your_anthropic_api_key
CLAUDE_MODEL=claude-sonnet-4-6
```

Replace `your_anthropic_api_key` with the key from the
[Anthropic Console](https://platform.claude.com/settings/keys). Keep this file
private. Never post the key in GitHub, email, screenshots, or chat.

The application can start without an API key, but its AI-assisted research and
recommendation features will not work.

### 4. Start AURORA

With Docker Desktop running and the terminal opened in the `aurora` folder,
run:

```bash
./run.sh
```

On Windows, run this instead:

```powershell
docker compose up --build -d
```

The first start may take several minutes while Docker downloads and builds the
application. When it finishes, open **http://localhost:3000**.

### 5. Stop AURORA

When you are finished, run this in the same `aurora` folder:

```bash
docker compose down
```

Your assessment data is stored in a Docker volume and is kept when the
container is stopped.

## Updating AURORA

Download the newest project ZIP from GitHub, replace the old `aurora` folder,
copy your `.env.local` into the new folder, and start it again with:

```bash
docker compose up --build -d --force-recreate
```

## Troubleshooting

### The page does not open

Make sure Docker Desktop is running, then check the application logs:

```bash
docker compose logs -f aurora-app
```

### The port is already in use

Close the other application using port 3000, or change the first number in
`docker-compose.yml`, for example from `3000:3000` to `3001:3000`. Then open
http://localhost:3001.

### AI features say that the application is not configured

Check that `.env.local` exists directly inside the `aurora` folder, that
`ANTHROPIC_API_KEY` is not empty, and recreate the container:

```bash
docker compose up --build -d --force-recreate
```

### Stop and remove the application

To stop the application without deleting saved data:

```bash
docker compose down
```

To also delete the saved Docker data, use:

```bash
docker compose down -v
```

The `-v` option permanently deletes assessment data.

## Developer Setup Without Docker

This option is for developers. Install [Node.js 20 or later](https://nodejs.org/),
open a terminal in the `aurora` folder, and run:

```bash
npm ci
npm run dev
```

Open http://localhost:3000. To check the project before sharing changes:

```bash
npm test
npm run lint
npm run build
```

For the full Anthropic configuration details, see
[`anthropic-api-setup.md`](anthropic-api-setup.md).
