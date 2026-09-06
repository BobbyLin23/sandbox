import { Daytona } from "@daytona/sdk"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

const GAME_INDEX_PATH = "/home/daytona/game"

export async function createGameSandbox(gameId: string): Promise<string> {
  const daytona = new Daytona()

  const sandbox = await daytona.create({
    name: `game-${gameId}`,
  })

  await sandbox.fs.createFolder(GAME_INDEX_PATH, "755")
  await sandbox.fs.uploadFile(
    Buffer.from("New game"),
    `${GAME_INDEX_PATH}/index.html`
  )

  await db
    .update(games)
    .set({ sandboxId: sandbox.id, updatedAt: new Date() })
    .where(eq(games.id, gameId))

  return sandbox.id
}
