import { deepSeek } from "@ai-sdk/deepseek"
import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai"
import { streamText } from "ai"

import { gameInstructions } from "@/lib/games/instructions"
import {
  getGameMessages,
  persistGameState,
  updateGameMessages,
} from "@/lib/games/persistence"

export const gameChat = chat.agent({
  id: "game-chat",
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
  run: async ({ messages, signal }) =>
    streamText({
      ...chat.toStreamTextOptions(),
      model: deepSeek("deepseek-v4-flash"),
      instructions: gameInstructions,
      messages,
      abortSignal: signal,
    }),
})
