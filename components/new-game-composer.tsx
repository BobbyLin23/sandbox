"use client"

import { useState } from "react"
import { ChatComposer } from "@/components/chat-composer"
import type { GameModelId } from "@/lib/games/model-catalog"
import { defaultGameModelId } from "@/lib/games/model-catalog"
import { createGame } from "@/lib/games/actions"

export function NewGameComposer() {
  const [modelId, setModelId] = useState<GameModelId>(defaultGameModelId)

  return (
    <ChatComposer
      onSubmit={(description) => createGame(description, modelId)}
      modelId={modelId}
      onModelChange={setModelId}
    />
  )
}
