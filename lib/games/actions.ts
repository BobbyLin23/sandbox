"use server"

import { deepSeek } from "@ai-sdk/deepseek"
import { auth as clerkAuth } from "@clerk/nextjs/server"
import * as Sentry from "@sentry/nextjs"
import { sessions } from "@trigger.dev/sdk"
import { createIdGenerator, generateText, type UIMessage } from "ai"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"
import { listGames } from "@/lib/games/queries"

const newMessageId = createIdGenerator({ prefix: "msg", size: 16 })

export async function listGamesAction() {
  return listGames()
}

export async function createGame(description: string) {
  const { orgId } = await clerkAuth()

  if (!orgId) {
    throw new Error("You must be in an organization to create a game.")
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
