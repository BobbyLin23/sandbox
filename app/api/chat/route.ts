import { deepSeek } from "@ai-sdk/deepseek"
import { auth } from "@clerk/nextjs/server"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  await auth.protect()

  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: deepSeek("deepseek-v4-flash"),
    instructions: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
