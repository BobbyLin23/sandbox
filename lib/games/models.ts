// Server-only: imported by trigger/chat.ts and other server code. Never import
// from client components — the provider instances aren't client-safe and the
// "server-only" alias isn't available in the Trigger.dev esbuild build.
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"

import type { GameModel } from "@/lib/games/model-catalog"

// OpenCode Go serves each model over the protocol listed in its registry:
//   @ai-sdk/openai      → OpenAI Responses
//   @ai-sdk/anthropic   → Anthropic Messages
//   @ai-sdk/google      → Google Generative AI
//   anything else       → OpenAI Chat Completions
// Sending a model to the wrong protocol returns `ModelProtocolUnsupported`.
const apiKey = process.env.OPENCODE_API_KEY
const commonHeaders = { "User-Agent": "sandbox/0.1" }

const modelCache = new Map<string, LanguageModel>()

export function getGameModelProvider(model: GameModel): LanguageModel {
  const cacheKey = `${model.protocol}|${model.api}|${model.id}`
  const cachedModel = modelCache.get(cacheKey)

  if (cachedModel) {
    return cachedModel
  }

  const providerModel = createProviderModel(model)
  modelCache.set(cacheKey, providerModel)

  return providerModel
}

function createProviderModel(model: GameModel): LanguageModel {
  switch (model.protocol) {
    case "openai":
      return createOpenAI({
        name: "opencode-go-openai",
        apiKey,
        baseURL: model.api,
        headers: commonHeaders,
      }).responses(model.id)
    case "anthropic":
      return createAnthropic({
        name: "opencode-go-anthropic",
        apiKey,
        baseURL: model.api,
        headers: commonHeaders,
      })(model.id)
    case "google":
      return createGoogleGenerativeAI({
        name: "opencode-go-google",
        apiKey,
        baseURL: model.api,
        headers: commonHeaders,
      })(model.id)
    case "openai-compatible":
      return createOpenAICompatible({
        name: "opencode-go",
        apiKey,
        baseURL: model.api,
        // Required so streaming responses report token usage — without it
        // every step would cost 0.
        includeUsage: true,
        headers: commonHeaders,
      })(model.id)
  }
}
