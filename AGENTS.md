<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Database

This project is in early development — no backwards compatibility is required.

- NEVER run `db:migrate` (`drizzle-kit migrate`). It is forbidden.
- Prefer `pnpm db:push` (`drizzle-kit push`) to sync the schema to Neon.
- Do not use `db:generate` or commit migration SQL files. The schema is pushed directly; keep the `drizzle/` directory removed.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-cost-savings`, `trigger-chat-agent-advanced`, `trigger-authoring-tasks`, `trigger-getting-started`, `trigger-realtime-and-frontend`.
<!-- TRIGGER.DEV SKILLS END -->
