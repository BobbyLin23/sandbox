"use server"

import { auth as clerkAuth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { type ChatStartSessionParams, chat } from "@trigger.dev/sdk/ai"
import { OUT_OF_CREDITS_MESSAGE } from "@/lib/credits/ledger"
import { ensureOrgCredits } from "@/lib/credits/reconcile"
import { getGame } from "@/lib/games/queries"
import type { gameChat } from "@/trigger/chat"

const startSession = chat.createStartSessionAction<typeof gameChat>("game-chat")

export type StartChatSessionResult =
  | Awaited<ReturnType<typeof startSession>>
  | { error: string }

export async function startChatSession(
  params: ChatStartSessionParams<typeof gameChat>
): Promise<StartChatSessionResult> {
  await clerkAuth.protect()

  const { orgId } = await clerkAuth()

  if (orgId) {
    // Block the session before it starts, and pass the org id to the worker
    // (which has no auth()) via clientData.
    if (!(await ensureOrgCredits(orgId))) {
      return { error: OUT_OF_CREDITS_MESSAGE }
    }
    params = {
      ...params,
      clientData: { ...params.clientData, orgId },
    }
  }

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
