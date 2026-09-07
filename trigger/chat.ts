import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai"
import { stepCountIs, streamText } from "ai"
import { z } from "zod"

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
  }),
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
  run: async ({ messages, tools, clientData, signal }) => {
    const { model } = getGameModelSettings(clientData?.modelId)

    return streamText({
      ...chat.toStreamTextOptions({ tools }),
      model,
      instructions: gameInstructions,
      messages,
      abortSignal: signal,
      stopWhen: stepCountIs(20),
    })
  },
})
