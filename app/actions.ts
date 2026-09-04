"use server"

import { auth as clerkAuth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { type ChatStartSessionParams, chat } from "@trigger.dev/sdk/ai"
import { getGame } from "@/lib/games/queries"
import type { gameChat } from "@/trigger/chat"

const startSession = chat.createStartSessionAction<typeof gameChat>("game-chat")

export async function startChatSession(
  params: ChatStartSessionParams<typeof gameChat>
) {
  await clerkAuth.protect()

  const game = await getGame(params.chatId)
  if (!game) {
    throw new Error("Game not found")
  }

  return startSession(params)
}

export async function mintChatAccessToken(chatId: string) {
  await clerkAuth.protect()

  return triggerAuth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  })
}
