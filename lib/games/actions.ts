"use server"

import { deepSeek } from "@ai-sdk/deepseek"
import { auth as clerkAuth } from "@clerk/nextjs/server"
import * as Sentry from "@sentry/nextjs"
import { sessions } from "@trigger.dev/sdk"
import { createIdGenerator, generateText, type UIMessage } from "ai"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { OUT_OF_CREDITS_MESSAGE } from "@/lib/credits/ledger"
import { ensureOrgCredits } from "@/lib/credits/reconcile"
import { deleteGameSandbox } from "@/lib/daytona/utils"
import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"
import { resolveGameModelId } from "@/lib/games/model-catalog"
import { listGames } from "@/lib/games/queries"

const newMessageId = createIdGenerator({ prefix: "msg", size: 16 })

export async function listGamesAction() {
  return listGames()
}

export async function createGame(
  description: string,
  modelId?: string
): Promise<{ ok: false; error: string } | undefined> {
  const { orgId } = await clerkAuth()

  if (!orgId) {
    throw new Error("You must be in an organization to create a game.")
  }

  // Block the build before the session starts. Returned (not thrown) so the
  // composer can show the message — server action errors are masked in prod.
  if (!(await ensureOrgCredits(orgId))) {
    return { ok: false, error: OUT_OF_CREDITS_MESSAGE }
  }

  const { text: title } = await generateText({
    model: deepSeek("deepseek-v4-flash"),
    reasoning: "none",
    instructions:
      "Generate a short, catchy title for a game. Return only the title, nothing else.",
    prompt: description,
    maxOutputTokens: 60,
  })

  const userMessage: UIMessage = {
    id: newMessageId(),
    role: "user",
    parts: [{ type: "text", text: description }],
  }

  const [game] = await db
    .insert(games)
    .values({
      orgId,
      title,
      modelId: resolveGameModelId(modelId),
      messages: [userMessage],
    })
    .returning()

  Sentry.logger.info("Game created", {
    "game.id": game.id,
    "org.id": orgId,
  })

  // Start the chat session with the user's message so the game-chat agent
  // streams the first assistant response in the background. The redirect
  // below is never blocked on the LLM response itself.
  try {
    const { publicAccessToken } = await sessions.start({
      type: "chat.agent",
      externalId: game.id,
      taskIdentifier: "game-chat",
      triggerConfig: {
        basePayload: {
          chatId: game.id,
          trigger: "submit-message",
          message: userMessage,
          metadata: { modelId: resolveGameModelId(modelId), orgId },
        },
      },
    })

    await db
      .update(games)
      .set({ publicAccessToken })
      .where(eq(games.id, game.id))
  } catch (error) {
    Sentry.logger.error("Failed to start game chat session", {
      "game.id": game.id,
      "error.message": error instanceof Error ? error.message : String(error),
    })
  }

  redirect(`/games/${game.id}`)
}

export async function renameGame(
  gameId: string,
  title: string
): Promise<{ ok: false; error: string } | { ok: true }> {
  const { orgId } = await clerkAuth()

  if (!orgId) {
    throw new Error("You must be in an organization to rename a game.")
  }

  const trimmed = title.trim()

  if (!trimmed) {
    return { ok: false, error: "The title can't be empty." }
  }

  const updated = await db
    .update(games)
    .set({ title: trimmed, updatedAt: new Date() })
    .where(and(eq(games.id, gameId), eq(games.orgId, orgId)))
    .returning({ id: games.id })

  if (updated.length === 0) {
    return { ok: false, error: "Game not found." }
  }

  revalidatePath("/", "layout")

  return { ok: true }
}

export async function deleteGame(
  gameId: string
): Promise<{ ok: false; error: string } | { ok: true }> {
  const { orgId } = await clerkAuth()

  if (!orgId) {
    throw new Error("You must be in an organization to delete a game.")
  }

  const [game] = await db
    .select({ id: games.id, sandboxId: games.sandboxId })
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.orgId, orgId)))
    .limit(1)

  if (!game) {
    return { ok: false, error: "Game not found." }
  }

  // Delete the sandbox first: if that fails the game row survives and the
  // user can retry; deleting the row first would orphan a live sandbox.
  try {
    await deleteGameSandbox(gameId, game.sandboxId)
  } catch {
    return {
      ok: false,
      error: "Failed to delete the game's sandbox. Please try again.",
    }
  }

  await db.delete(games).where(eq(games.id, game.id))

  Sentry.logger.info("Game deleted", {
    "game.id": gameId,
    "org.id": orgId,
  })

  revalidatePath("/", "layout")

  return { ok: true }
}
