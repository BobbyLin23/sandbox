"use server"

import { deepSeek } from "@ai-sdk/deepseek"
import { auth } from "@clerk/nextjs/server"
import { createIdGenerator, generateText, type UIMessage } from "ai"
import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

const newMessageId = createIdGenerator({ prefix: "msg", size: 16 })

export async function createGame(description: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("You must be in an organization to create a game.")
  }

  const [{ text: title }, { text: response }] = await Promise.all([
    generateText({
      model: deepSeek("deepseek-v4-flash"),
      reasoning: "none",
      instructions:
        "Generate a short, catchy title for a game. Return only the title, nothing else.",
      prompt: description,
      maxOutputTokens: 60,
    }),
    generateText({
      model: deepSeek("deepseek-v4-flash"),
      instructions: "You are a helpful assistant.",
      prompt: description,
    }),
  ])

  const userMessage: UIMessage = {
    id: newMessageId(),
    role: "user",
    parts: [{ type: "text", text: description }],
  }
  const assistantMessage: UIMessage = {
    id: newMessageId(),
    role: "assistant",
    parts: [{ type: "text", text: response }],
  }

  const [game] = await db
    .insert(games)
    .values({
      orgId,
      title,
      messages: [userMessage, assistantMessage],
    })
    .returning()

  redirect(`/games/${game.id}`)
}
