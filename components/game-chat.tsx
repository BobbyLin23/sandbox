"use client"

import type { UIMessage } from "ai"
import { useState } from "react"

import { ChatPreview } from "@/components/chat-preview"
import { ChatThread } from "@/components/chat-thread"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import type { GameModelId, GameModelOption } from "@/lib/games/model-catalog"

export function GameChat({
  gameId,
  messages,
  lastEventId,
  publicAccessToken,
  modelId,
  models,
}: {
  gameId: string
  messages?: UIMessage[]
  lastEventId?: string
  publicAccessToken?: string
  sandboxId?: string
  modelId?: GameModelId
  models: GameModelOption[]
}) {
  const [previewRevision, setPreviewRevision] = useState(0)

  return (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel defaultSize="70%">
        <ChatThread
          gameId={gameId}
          messages={messages}
          lastEventId={lastEventId}
          publicAccessToken={publicAccessToken}
          initialModelId={modelId}
          models={models}
          onTurnComplete={() => setPreviewRevision((revision) => revision + 1)}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="30%" minSize="20%">
        <ChatPreview gameId={gameId} revision={previewRevision} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
