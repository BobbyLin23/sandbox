import type { LanguageModelUsage } from "ai"

import type { GameModelPricing } from "@/lib/games/model-catalog"

const DOLLAR = 1_000_000_000
const MILLION = 1_000_000

// Converts one step's token usage into a cost, in billionths of a dollar.
// Rates come from the OpenCode registry, so new or repriced models are charged
// correctly without a code change.
export function getStepCost(
  rate: GameModelPricing,
  usage: LanguageModelUsage
): number {
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
