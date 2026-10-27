// Shared between server and client. The model list itself is fetched at
// runtime from OpenCode Go — nothing here hardcodes a model.

export type GameModelId = string

export type GameModelProtocol =
  | "openai"
  | "anthropic"
  | "google"
  | "openai-compatible"

export type GameModelPricing = {
  // Dollars per million tokens.
  freshInput: number
  cachedInput: number
  cacheWrite: number
  output: number
}

// The serializable subset the model picker needs.
export type GameModelOption = {
  id: GameModelId
  name: string
  tagline: string
}

// Full model description, server-side only.
export type GameModel = GameModelOption & {
  protocol: GameModelProtocol
  api: string
  pricing: GameModelPricing
  contextWindow?: number
}

export function toGameModelOptions(models: GameModel[]): GameModelOption[] {
  return models.map(({ id, name, tagline }) => ({ id, name, tagline }))
}

// Falls back to the first available model when the stored id is unknown, so
// games created when a model was still available keep working.
export function findGameModel<T extends GameModelOption>(
  value: unknown,
  models: readonly T[]
): T | undefined {
  if (typeof value === "string") {
    const match = models.find((model) => model.id === value)
    if (match) {
      return match
    }
  }

  return models[0]
}

export function resolveGameModelId(
  value: unknown,
  models: readonly GameModelOption[]
): GameModelId {
  return findGameModel(value, models)?.id ?? ""
}
