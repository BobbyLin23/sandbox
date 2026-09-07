import type { SystemModelMessage } from "ai"

export const runtimeInstructions: SystemModelMessage[] = [
  {
    role: "system",
    content: `# Game runtime environment

Every game runs inside its own dedicated Daytona sandbox — an isolated Linux
machine created for that game and named after it.

## The game directory

- All game files live in the game directory: \`/home/daytona/game\`.
- The entry point is \`/home/daytona/game/index.html\`. The app's preview
  proxy fetches ONLY this document, so the game must be a self-contained
  single file: inline all CSS and JavaScript, and generate or inline any
  assets. Relative imports of other files will 404 in the preview.
- A static file server runs in the game directory:
  \`python3 -m http.server 3000 --bind 0.0.0.0 --directory /home/daytona/game\`.
  The game is reachable in-sandbox at \`http://localhost:3000/\`.
- Alongside index.html the directory is pre-seeded with three.js runtime
  primitives (\`engine/\`, \`controls/\`, \`animations/\`, \`models/\`,
  \`sound/\`, \`hub/\`) — see the runtime primitives guide. They are a source
  library: read them with \`read_file\` and copy the code you need into
  index.html. Never import them with relative paths.

## Previewing the game

- The sandbox's port 3000 is exposed through a token-authenticated Daytona
  preview URL.
- The app proxies that preview at \`/api/games/[id]/preview\`, so the user only
  ever sees the game through the app — no direct sandbox access is needed.

## Sandbox lifecycle

- Sandboxes are named \`game-<gameId>\` and labeled with the game id, so they
  can be recovered by name if a lookup by id fails.
- A sandbox may be stopped between sessions. Starting it again preserves the
  files on disk, but the HTTP server does not auto-restart — the app checks a
  health check on \`http://localhost:3000/\` and rewrites the game index and
  restarts the server when needed.
- The default placeholder build is a three.js welcome page: a rotating cube in
  brand colors reading "New game". Until the game is built out, the preview
  shows that placeholder.

## Constraints to respect

- Code must run in a modern browser with no build step: plain HTML, CSS, and
  JavaScript (ES modules from CDNs and from the game directory are fine;
  frameworks that require a bundler are not).
- Keep the page fast to load and responsive: the preview reloads on every
  iteration, so avoid multi-megabyte assets and long blocking scripts.
- Design for both keyboard and pointer input, and make the game work at
  typical browser viewport sizes inside the preview pane.`,
  },
]
