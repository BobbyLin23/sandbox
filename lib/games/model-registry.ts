// Loads the model catalog from OpenCode at runtime. Two sources are joined:
//   1. /inference/go/v1/models — the models this API key can actually use.
//   2. models.opencode.ai/api.json — names, pricing and the protocol each
//      model is served over (OpenAI Responses, Anthropic, Google, or OpenAI
//      Chat Completions).
// Nothing is hardcoded; a model added to OpenCode shows up here automatically.
import type {
  GameModel,
  GameModelPricing,
  GameModelProtocol,
} from "@/lib/games/model-catalog"

const MODELS_URL = "https://opencode.ai/inference/go/v1/models"
const REGISTRY_URL = "https://models.opencode.ai/api.json"
const USER_AGENT = "sandbox/0.1"
const CACHE_TTL_MS = 60 * 60 * 1000

type AvailableModel = {
  id?: unknown
}

type RegistryModel = {
  name?: string
  description?: string
  tool_call?: boolean
  modalities?: { output?: string[] }
  limit?: { context?: number }
  cost?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
  }
  provider?: { npm?: string; api?: string }
}

type Registry = Record<string, { models?: Record<string, RegistryModel> }>

const DEFAULT_APIS: Record<GameModelProtocol, string> = {
  openai: "https://opencode.ai/inference/go/openai/v1",
  anthropic: "https://opencode.ai/inference/go/anthropic/v1",
  google: "https://opencode.ai/inference/go/google/v1beta",
  "openai-compatible": "https://opencode.ai/inference/go/openai/v1",
}

let cached: { expiresAt: number; models: GameModel[] } | null = null
let pending: Promise<GameModel[]> | null = null

export async function fetchGameModels(): Promise<GameModel[]> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.models
  }

  if (!pending) {
    pending = loadGameModels()
      .then((models) => {
        cached = { expiresAt: Date.now() + CACHE_TTL_MS, models }
        return models
      })
      .catch((error: unknown) => {
        // Serve the last good list rather than taking the whole app down when
        // OpenCode is briefly unreachable.
        if (cached) {
          return cached.models
        }
        throw error
      })
      .finally(() => {
        pending = null
      })
  }

  return pending
}

async function loadGameModels(): Promise<GameModel[]> {
  const apiKey = process.env.OPENCODE_API_KEY

  if (!apiKey) {
    throw new Error("OPENCODE_API_KEY is not set.")
  }

  const [available, registry] = await Promise.all([
    fetchJson<{ data?: AvailableModel[] }>(MODELS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": USER_AGENT,
      },
    }),
    fetchJson<Registry>(REGISTRY_URL, {
      headers: { "User-Agent": USER_AGENT },
    }),
  ])

  const metadata = registry["opencode-go"]?.models ?? {}
  const ids = new Set(
    (available.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  )

  const models = [...ids]
    .map((id) => toGameModel(id, metadata[id]))
    .filter((model): model is GameModel => model !== null)

  if (models.length === 0) {
    throw new Error("OpenCode Go returned no usable models.")
  }

  return models
}

function toGameModel(
  id: string,
  metadata: RegistryModel | undefined
): GameModel | null {
  // Without metadata we can't know the protocol (e.g. Responses vs Chat
  // Completions) or the price, so skip the model instead of misrouting it.
  if (!metadata) {
    return null
  }

  if (metadata.tool_call === false) {
    return null
  }

  const outputModalities = metadata.modalities?.output
  if (outputModalities && !outputModalities.includes("text")) {
    return null
  }

  const protocol = protocolFromNpm(metadata.provider?.npm)

  return {
    id,
    name: metadata.name?.trim() || humanizeModelId(id),
    tagline: taglineFromDescription(metadata.description),
    protocol,
    api: metadata.provider?.api ?? DEFAULT_APIS[protocol],
    pricing: pricingFromCost(metadata.cost),
    contextWindow: metadata.limit?.context,
  }
}

function protocolFromNpm(npm: string | undefined): GameModelProtocol {
  switch (npm) {
    case "@ai-sdk/openai":
      return "openai"
    case "@ai-sdk/anthropic":
      return "anthropic"
    case "@ai-sdk/google":
      return "google"
    default:
      return "openai-compatible"
  }
}

function pricingFromCost(cost: RegistryModel["cost"]): GameModelPricing {
  // Dollars per million tokens. Tiered pricing above a context threshold is
  // approximated at the base rate, matching the previous billing behavior.
  const input = cost?.input ?? 0

  return {
    freshInput: input,
    cachedInput: cost?.cache_read ?? input,
    cacheWrite: cost?.cache_write ?? input,
    output: cost?.output ?? 0,
  }
}

function taglineFromDescription(description: string | undefined): string {
  if (!description) {
    return ""
  }

  const firstSentence =
    description.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? description.trim()

  return firstSentence.length > 100
    ? `${firstSentence.slice(0, 97).trimEnd()}…`
    : firstSentence
}

function humanizeModelId(id: string): string {
  return id
    .split(/[-_.]/)
    .map((part) =>
      part.length <= 3
        ? part.toUpperCase()
        : part[0].toUpperCase() + part.slice(1)
    )
    .join(" ")
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status}).`)
  }

  return (await response.json()) as T
}
