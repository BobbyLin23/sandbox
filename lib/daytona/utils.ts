import { readdir } from "node:fs/promises"
import path from "node:path"
import type { Sandbox } from "@daytona/sdk"
import { SandboxState } from "@daytona/sdk"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"
import { daytona } from "./client"

export const GAME_INDEX_PATH = "/home/daytona/game"
const GAME_INDEX_FILE = `${GAME_INDEX_PATH}/index.html`
const GAME_PORT = 3000

// Seed files copied into every new sandbox (see additionalFiles in
// trigger.config.ts). Resolved relative to the cwd, which is the project root
// in dev and the build directory when deployed.
const RUNTIME_DIR = path.join(process.cwd(), "lib/games/runtime")

const HEALTH_CHECK_CMD = `python3 -c "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://localhost:${GAME_PORT}/',timeout=5).status==200 else 1)"`

const START_SERVER_CMD = `nohup python3 -m http.server ${GAME_PORT} --bind 0.0.0.0 --directory ${GAME_INDEX_PATH} > /tmp/game-server.log 2>&1 &`

// Dedupe concurrent create calls within this process so a sandbox is never
// provisioned twice for the same game.
const sandboxCreation = new Map<string, Promise<Sandbox>>()

// Sandboxes are named after the game so a sandbox that was created but whose
// creation call timed out can be recovered by name instead of orphaned.
function sandboxName(gameId: string): string {
  return `game-${gameId}`
}

const SANDBOX_CREATE_TIMEOUT_SECONDS = 300

export async function createGameSandbox(gameId: string): Promise<string> {
  return (await getGameSandboxCreation(gameId)).id
}

/**
 * Guaranteed running Sandbox instance for a game: reuses the persisted
 * sandbox, adopts an orphaned one by name, or provisions a new one, then
 * starts it if it isn't running.
 */
export async function getGameSandbox(gameId: string): Promise<Sandbox> {
  const sandbox = await getGameSandboxCreation(gameId)

  if (sandbox.state !== SandboxState.STARTED) {
    await sandbox.start()
  }

  return sandbox
}

function getGameSandboxCreation(gameId: string): Promise<Sandbox> {
  const inFlight = sandboxCreation.get(gameId)
  if (inFlight) {
    return inFlight
  }

  const creation = ensureGameSandbox(gameId).finally(() => {
    sandboxCreation.delete(gameId)
  })

  sandboxCreation.set(gameId, creation)
  return creation
}

async function ensureGameSandbox(gameId: string): Promise<Sandbox> {
  const [game] = await db
    .select({ sandboxId: games.sandboxId })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1)

  if (game?.sandboxId) {
    const existing = await getSandboxIfExists(game.sandboxId)
    if (existing) {
      return existing
    }
  }

  // Adopt a sandbox that was created earlier but never persisted (e.g. a
  // previous create() call timed out) so we don't provision a duplicate.
  let sandbox = await getSandboxByName(sandboxName(gameId))

  if (!sandbox) {
    try {
      sandbox = await daytona.create(
        {
          name: sandboxName(gameId),
          labels: {
            gameId,
          },
        },
        { timeout: SANDBOX_CREATE_TIMEOUT_SECONDS }
      )
    } catch (error) {
      // create() can throw (e.g. a start timeout) AFTER the sandbox was already
      // created on Daytona. Recover it by name and continue, so it isn't
      // orphaned and a retry doesn't provision a duplicate.
      sandbox = await getSandboxByName(sandboxName(gameId))
      if (!sandbox) {
        throw error
      }
    }
  }

  // Persist the id before any slower operations so a later failure can't
  // leave the sandbox created but the DB row pointing at nothing.
  await db
    .update(games)
    .set({ sandboxId: sandbox.id, updatedAt: new Date() })
    .where(eq(games.id, gameId))

  try {
    await seedRuntimeFiles(sandbox)
  } catch (error) {
    // The id is already persisted; startGameServer retries the seed.
    console.error(
      `Failed to seed runtime files to sandbox ${sandbox.id}`,
      error
    )
  }

  return sandbox
}

export async function startGameServer(gameId: string) {
  const [game] = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1)

  if (!game) {
    throw new Error(`Game not found: ${gameId}`)
  }

  const sandbox = await getGameSandbox(gameId)

  if (!(await isGameServerHealthy(sandbox))) {
    await seedRuntimeFiles(sandbox)
    await startGameHttpServer(sandbox)
  }

  const { url, token } = await sandbox.getPreviewLink(GAME_PORT)

  return { sandboxId: sandbox.id, url, token }
}

async function getSandboxIfExists(sandboxId: string): Promise<Sandbox | null> {
  try {
    return await daytona.get(sandboxId)
  } catch {
    return null
  }
}

async function getSandboxByName(name: string): Promise<Sandbox | null> {
  try {
    return await daytona.get(name)
  } catch {
    return null
  }
}

// Seed the runtime files only when there is no index.html yet — never overwrite
// game files the chat agent has written.
async function seedRuntimeFiles(sandbox: Sandbox): Promise<void> {
  await ensureGameFolder(sandbox)

  if (await gameIndexExists(sandbox)) {
    return
  }

  for (const dir of await collectRuntimeDirs(RUNTIME_DIR)) {
    const remoteDir = `${GAME_INDEX_PATH}/${path.relative(RUNTIME_DIR, dir).split(path.sep).join("/")}`
    await ensureSandboxFolder(sandbox, remoteDir)
  }

  for (const file of await collectRuntimeFiles(RUNTIME_DIR)) {
    const remotePath = `${GAME_INDEX_PATH}/${path.relative(RUNTIME_DIR, file).split(path.sep).join("/")}`
    await sandbox.fs.uploadFile(file, remotePath)
  }
}

async function collectRuntimeFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })

  const files: string[] = []
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectRuntimeFiles(entryPath)))
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }

  return files
}

async function collectRuntimeDirs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })

  const dirs: string[] = []
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      dirs.push(entryPath, ...(await collectRuntimeDirs(entryPath)))
    }
  }

  return dirs
}

async function ensureGameFolder(sandbox: Sandbox): Promise<void> {
  await ensureSandboxFolder(sandbox, GAME_INDEX_PATH)
}

async function ensureSandboxFolder(
  sandbox: Sandbox,
  remotePath: string
): Promise<void> {
  try {
    await sandbox.fs.createFolder(remotePath, "755")
  } catch {
    // The folder already exists.
  }
}

async function gameIndexExists(sandbox: Sandbox): Promise<boolean> {
  try {
    await sandbox.fs.getFileDetails(GAME_INDEX_FILE)
    return true
  } catch {
    return false
  }
}

async function isGameServerHealthy(sandbox: Sandbox): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await sandbox.process.executeCommand(
      HEALTH_CHECK_CMD,
      undefined,
      undefined,
      15
    )

    if (response.exitCode === 0) {
      return true
    }

    if (attempt < 2) {
      await delay(1000)
    }
  }

  return false
}

async function startGameHttpServer(sandbox: Sandbox): Promise<void> {
  await sandbox.process.executeCommand(START_SERVER_CMD)

  for (let attempt = 0; attempt < 3; attempt++) {
    await delay(1000)

    const response = await sandbox.process.executeCommand(
      HEALTH_CHECK_CMD,
      undefined,
      undefined,
      15
    )

    if (response.exitCode === 0) {
      return
    }
  }

  throw new Error("Failed to start the game HTTP server in the sandbox")
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
