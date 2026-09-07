import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai"
import { stepCountIs, streamText } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"

import {
  chargeStep,
  getGameOrgId,
  OUT_OF_CREDITS_MESSAGE,
} from "@/lib/credits/ledger"
import { getStepCost } from "@/lib/credits/pricing"
import { ensureOrgCredits } from "@/lib/credits/reconcile"
import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"
import { getGameModelSettings } from "@/lib/games/agent"
import { gameInstructions } from "@/lib/games/instructions"
import {
  getGameMessages,
  persistGameState,
  updateGameMessages,
} from "@/lib/games/persistence"
import { createGameTools } from "@/lib/games/tools"

export const gameChat = chat.agent({
  id: "game-chat",
  clientDataSchema: z.object({
    modelId: z.string().optional(),
    // Set by the server actions (trusted); the worker has no auth().
    orgId: z.string().optional(),
  }),
  // Gate before every turn (including the session's first). A thrown Error
  // becomes an in-chat error chunk, so the player sees a message instead of
  // a crash. A build already running finishes — charging may take the
  // balance below zero, but the next turn is blocked.
  onTurnStart: async ({ chatId, clientData }) => {
    const orgId = clientData?.orgId ?? (await getGameOrgId(chatId))

    if (!orgId || !(await ensureOrgCredits(orgId))) {
      throw new Error(OUT_OF_CREDITS_MESSAGE)
    }
  },
  tools: ({ chatId }) => createGameTools(chatId),
  hydrateMessages: async ({ chatId, trigger, incomingMessages }) => {
    const stored = await getGameMessages(chatId)

    if (upsertIncomingMessage(stored, { trigger, incomingMessages })) {
      await updateGameMessages(chatId, stored)
    }

    return stored
  },
  onTurnComplete: async ({
    chatId,
    uiMessages,
    chatAccessToken,
    lastEventId,
  }) => {
    await persistGameState(chatId, {
      messages: uiMessages,
      lastEventId,
      publicAccessToken: chatAccessToken,
    })
  },
  run: async ({ messages, tools, clientData, chatId, signal }) => {
    const { model, modelId } = getGameModelSettings(clientData?.modelId)

    return streamText({
      ...chat.toStreamTextOptions({ tools }),
      model,
      instructions: gameInstructions,
      messages,
      abortSignal: signal,
      stopWhen: stepCountIs(20),
      onStepFinish: async (step) => {
        const cost = getStepCost(modelId, step.usage)
        if (cost === 0) {
          return
        }

        const [game] = await db
          .select({ orgId: games.orgId })
          .from(games)
          .where(eq(games.id, chatId))
          .limit(1)

        if (!game) {
          return
        }

        await chargeStep(game.orgId, step.response.id, cost)
      },
    })
  },
})
