<p align="center">
  <img src="public/logo.svg" width="72" alt="Sandbox logo" />
</p>

<h1 align="center">Sandbox</h1>

<p align="center">
  Describe a game in your own words. An AI agent builds it, runs it in an isolated
  sandbox, and iterates with you in a live chat.
</p>

---

Sandbox is a browser-based game studio. Start with a prompt like *"a voxel
survival game where zombies get stronger every night"* and the agent writes a
complete, self-contained HTML game into its own Daytona sandbox. A preview pane
next to the chat serves the game; feedback in the chat turns into file edits, so
you play and refine the same game in a loop.

Each game gets its own sandbox, chat transcript, model choice, and live preview.
Builds are durable: the chat runs on Trigger.dev, so a dropped connection or a
page reload reconnects to the run already in progress.

## Features

- **Chat-driven game building** — no editor, no boilerplate. The agent writes
  `index.html` plus any assets with file tools and keeps the whole game
  runnable at every turn.
- **Live preview** — each game's sandbox runs a tiny HTTP server; the app
  proxies a token-authenticated Daytona preview URL next to the chat.
- **Durable agent runs** — [Trigger.dev](https://trigger.dev) `chat.agent`
  runs the conversation with server-owned transcript storage, so turns survive
  reloads, retries, and worker restarts.
- **Guided decisions** — the agent can ask the player structured questions
  (`ask_player`) about the loop, world, look, controls, and scope instead of
  guessing.
- **Runtime model catalog** — models come from OpenCode Go at request time
  (names, pricing, protocol), so new models show up without a deploy. Pricing
  is pulled from the same registry.
- **Credits and billing** — Clerk Organizations + Billing. Every org starts
  with $1 of credits; a paid month adds $10, and unused credits roll over.
  Each model step is charged from its token usage with idempotent ledger rows.
- **Observability** — Sentry for the Next.js app and the Trigger worker,
  including task-failure capture and source maps.

## How it works

```text
             ┌─────────────────────────────┐
             │  Next.js app (Railway)      │
 Browser ───▶│  chat UI, preview proxy,    │
  Clerk      │  server actions             │
             └──────┬───────────┬──────────┘
                    │           │
              Neon Postgres     │ trigger / public token
             (games, credits)   ▼
                          ┌──────────────────────┐
                          │  Trigger.dev worker  │
                          │  game-chat agent     │
                          └──────────┬───────────┘
                                     │ file tools
                                     ▼
                          ┌──────────────────────┐
                          │  Daytona sandbox     │
                          │  /home/daytona/game  │
                          │  python -m http.srv  │
                          └──────────────────────┘
```

1. A prompt creates a `games` row, mints a scoped Trigger public token, and
   starts a `chat.agent` session with the user's first message.
2. The worker resolves the selected model from OpenCode Go and streams the
   response. Tool calls read and write files in the game's Daytona sandbox
   (paths are locked to `/home/daytona/game`).
3. The preview route asks the sandbox to serve the game directory and returns
   a preview link plus token for the iframe.
4. After each model step, token usage is converted to credits and written to
   the ledger; a step can never be charged twice.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui-style components |
| Auth & billing | Clerk (Organizations, Billing) |
| Database | Neon Postgres, Drizzle ORM |
| Background agents | Trigger.dev `chat.agent` |
| Sandboxes | Daytona |
| Models | AI SDK with OpenCode Go |
| Errors & tracing | Sentry |
| Tooling | pnpm, Biome |

## Getting started

### Prerequisites

- Node.js 22+ (the Trigger worker runs Node 24)
- [pnpm](https://pnpm.io)
- Accounts/keys for Clerk, Neon, Trigger.dev, Daytona, and OpenCode Go

### Setup

```bash
git clone https://github.com/BobbyLin23/sandbox.git
cd sandbox
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`, then push the schema to your Neon branch:

```bash
pnpm db:push
```

Start the app and the Trigger dev worker in two terminals:

```bash
pnpm dev          # Next.js on http://localhost:3019
pnpm trigger:dev  # registers and runs tasks in the Trigger development env
```

The Trigger dev worker must use a **development** `TRIGGER_SECRET_KEY`
(`tr_dev_…`), not the production key.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Neon connection used by the app and worker |
| `DATABASE_URL_UNPOOLED` | Optional | Direct connection for database tooling |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Yes | Usually `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Yes | Usually `/` |
| `TRIGGER_SECRET_KEY` | Yes | `tr_dev_…` locally, `tr_prod_…` in production |
| `DAYTONA_API_KEY` | Yes | Needed by the app server (preview) and the worker |
| `OPENCODE_API_KEY` | Yes | OpenCode Go key; also loads the model catalog |
| `NEON_BRANCH` | Optional | Neon branch name |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error reporting |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Optional | Source-map uploads during builds |

Clerk Organizations **and** Billing should be enabled for the credits and
upgrade flow to work.

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | Next.js dev server on port 3019 |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm trigger:dev` | Run Trigger tasks locally |
| `pnpm trigger:deploy` | Deploy tasks to Trigger (prod by default) |
| `pnpm db:push` | Push the Drizzle schema to Neon |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm lint` / `pnpm format` / `pnpm check` | Biome |
| `pnpm typecheck` | TypeScript, no emit |

## Project structure

```text
app/                 Routes, server actions, preview proxy, Clerk pages
components/          Chat UI, preview pane, model picker, sidebar, UI primitives
lib/
  credits/           Ledger, pricing, subscription reconciliation
  daytona/           Client and sandbox lifecycle
  db/                Drizzle schema and Neon client
  games/             Agent config, prompts, file tools, model catalog, runtime
trigger/             Trigger.dev tasks (game-chat agent)
trigger.config.ts    Trigger project, build extensions, retries
public/              Static assets
```

The seed game runtime lives in `lib/games/runtime/` and is copied into every
new sandbox via the `additionalFiles` build extension.

## Deployment

The app and the agent worker deploy separately:

- **Next.js app → Railway.** Railway builds and serves the repository; it does
  not deploy Trigger tasks.
- **Agent worker → Trigger.dev.** Run `pnpm trigger:deploy` after any change to
  `trigger/` (or to code it imports) to publish tasks to the production
  environment.

Production services need two independent sets of environment variables:

- **Railway** needs the app-facing variables, including the `tr_prod_…`
  Trigger secret key and `DAYTONA_API_KEY`.
- **Trigger's production environment** needs the worker-facing variables
  (`DATABASE_URL`, `OPENCODE_API_KEY`, `DAYTONA_API_KEY`, Clerk, Sentry).
  Workers do not inherit Railway's variables.

The Sentry esbuild plugin in `trigger.config.ts` reads `SENTRY_*` from the
shell running the deploy, and the CLI only loads `.env` by default. If your
values live in `.env.local`, use:

```bash
pnpm trigger:deploy --env-file .env.local
```

## Notes

- This project is in early development; the database schema is pushed directly
  with `drizzle-kit push`. There are no migration files.
- Games are single-page browser experiences. Native builds, multiplayer
  servers, and paid external APIs are out of scope for the sandbox.
- Preview URLs are token-authenticated; the app proxies them rather than
  exposing sandbox ports publicly.
- Dev and production currently share one Daytona organization, so they share
  sandbox quota. Use a separate key/org if you need isolation.
