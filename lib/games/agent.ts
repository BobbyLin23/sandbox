import type { GameModelId } from "@/lib/games/model-catalog"
import {
  gameModels,
  resolveGameModelId,
} from "@/lib/games/model-catalog"
import { gameModelProviders } from "@/lib/games/models"

export type GameModelSettings = {
  modelId: GameModelId
  model: (typeof gameModelProviders)[GameModelId]
  name: string
  tagline: string
}

export function getGameModelSettings(modelId: unknown): GameModelSettings {
  const id = resolveGameModelId(modelId)
  const catalog = gameModels[id]

  return {
    modelId: id,
    model: gameModelProviders[id],
    name: catalog.name,
    tagline: catalog.tagline,
  }
}
