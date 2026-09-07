export const gameModels = {
  "deepseek-v4-flash": {
    id: "deepseek-v4-flash",
    name: "DeepSeek Flash",
    tagline: "Fast and cheap. Great for iterating.",
  },
  "deepseek-v4-pro": {
    id: "deepseek-v4-pro",
    name: "DeepSeek Pro",
    tagline: "The strongest reasoner. Slower, pricier.",
  },
  "deepseek-v4-flash-vision-exp": {
    id: "deepseek-v4-flash-vision-exp",
    name: "DeepSeek Flash Vision",
    tagline: "Flash, plus image understanding.",
  },
} as const

export type GameModelId = keyof typeof gameModels

export const gameModelIds = Object.keys(gameModels) as GameModelId[]

export const defaultGameModelId: GameModelId = "deepseek-v4-flash"

export function isGameModelId(value: unknown): value is GameModelId {
  return typeof value === "string" && Object.hasOwn(gameModels, value)
}

export function resolveGameModelId(value: unknown): GameModelId {
  return isGameModelId(value) ? value : defaultGameModelId
}
