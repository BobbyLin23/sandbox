<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Database

This project is in early development — no backwards compatibility is required.

- NEVER run `db:migrate` (`drizzle-kit migrate`). It is forbidden.
- Prefer `pnpm db:push` (`drizzle-kit push`) to sync the schema to Neon.
- Do not use `db:generate` or commit migration SQL files. The schema is pushed directly; keep the `drizzle/` directory removed.
