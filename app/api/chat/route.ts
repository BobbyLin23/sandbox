import { deepSeek } from "@ai-sdk/deepseek"
import { auth } from "@clerk/nextjs/server"
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

import { getGame, saveGameMessages } from "@/lib/games/queries"

export const maxDuration = 30

export async function POST(req: Request) {
  await auth.protect()

  const { id, message }: { id: string; message: UIMessage } = await req.json()

  const game = await getGame(id)

  if (!game) {
    return new Response("Game not found", { status: 404 })
  }

  const previousMessages = game.messages ?? []

  const messages = [...previousMessages, message]

  const result = streamText({
    model: deepSeek("deepseek-v4-flash"),
    instructions: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  })

  result.consumeStream()

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createIdGenerator({
        prefix: "msg",
        size: 16,
      }),
      onEnd: ({ messages }) => {
        saveGameMessages(id, messages)
      },
    }),
  })
}
