import type { LanguageModelUsage } from "ai"

import type { GameModelId } from "@/lib/games/model-catalog"

// Dollars per million tokens, per model. Fresh input, cached input
// (cache reads), cache writes and output are priced separately.
const modelPricing = {
  "deepseek-v4-flash": {
    freshInput: 0.25,
    cachedInput: 0.025,
    cacheWrite: 0.5,
    output: 1.1,
  },
  "deepseek-v4-pro": {
    freshInput: 0.6,
    cachedInput: 0.06,
    cacheWrite: 1.2,
    output: 2.2,
  },
  "deepseek-v4-flash-vision-exp": {
    freshInput: 0.35,
    cachedInput: 0.035,
    cacheWrite: 0.7,
    output: 1.4,
  },
} satisfies Record<
  GameModelId,
  {
    freshInput: number
    cachedInput: number
    cacheWrite: number
    output: number
  }
>

const DOLLAR = 1_000_000_000
const MILLION = 1_000_000

// Converts one step's token usage into a cost, in billionths of a dollar.
export function getStepCost(
  modelId: GameModelId,
  usage: LanguageModelUsage
): number {
  const rate = modelPricing[modelId]
  const cached = usage.inputTokenDetails?.cacheReadTokens ?? 0
  const cacheWrite = usage.inputTokenDetails?.cacheWriteTokens ?? 0
  const fresh =
    usage.inputTokenDetails?.noCacheTokens ??
    Math.max(0, (usage.inputTokens ?? 0) - cached - cacheWrite)
  const output = usage.outputTokens ?? 0

  const dollars =
    (fresh * rate.freshInput +
      cached * rate.cachedInput +
      cacheWrite * rate.cacheWrite +
      output * rate.output) /
    MILLION

  return Math.round(dollars * DOLLAR)
}
