"use client"

import type { UIMessage } from "ai"

import { ChatPreview } from "@/components/chat-preview"
import { ChatThread } from "@/components/chat-thread"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

export function GameChat({
  gameId,
  messages,
  lastEventId,
  publicAccessToken,
}: {
  gameId: string
  messages?: UIMessage[]
  lastEventId?: string
  publicAccessToken?: string
  sandboxId?: string
}) {
  return (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel defaultSize="70%">
        <ChatThread
          gameId={gameId}
          messages={messages}
          lastEventId={lastEventId}
          publicAccessToken={publicAccessToken}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="30%" minSize="20%">
        <ChatPreview gameId={gameId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
