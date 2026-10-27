import type { LanguageModel } from "ai"

import type { GameModelId, GameModelPricing } from "@/lib/games/model-catalog"
import { findGameModel } from "@/lib/games/model-catalog"
import { fetchGameModels } from "@/lib/games/model-registry"
import { getGameModelProvider } from "@/lib/games/models"

export type GameModelSettings = {
  modelId: GameModelId
  model: LanguageModel
  name: string
  tagline: string
  pricing: GameModelPricing
}

export async function getGameModelSettings(
  modelId: unknown
): Promise<GameModelSettings> {
  const models = await fetchGameModels()
  const model = findGameModel(modelId, models)

  if (!model) {
    throw new Error("No models are available from OpenCode Go.")
  }

  return {
    modelId: model.id,
    model: getGameModelProvider(model),
    name: model.name,
    tagline: model.tagline,
    pricing: model.pricing,
  }
}
