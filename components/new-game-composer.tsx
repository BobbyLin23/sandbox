"use client"

import { useRef, useState, useTransition } from "react"

import { ChatComposer, type ChatComposerHandle } from "@/components/chat-composer"
import { Button } from "@/components/ui/button"
import { createGame } from "@/lib/games/actions"
import type { GameModelId } from "@/lib/games/model-catalog"
import { defaultGameModelId } from "@/lib/games/model-catalog"
import { suggestions } from "@/lib/games/suggestions"

export function NewGameComposer() {
  const [modelId, setModelId] = useState<GameModelId>(defaultGameModelId)
  const [isPending, startTransition] = useTransition()
  const composerRef = useRef<ChatComposerHandle>(null)

  const handleSuggestion = (prompt: string) => {
    if (isPending) return

    composerRef.current?.fill(prompt)
    window.setTimeout(() => {
      composerRef.current?.submit(prompt)
    }, 300)
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      <ChatComposer
        ref={composerRef}
        onSubmit={(description) => createGame(description, modelId)}
        modelId={modelId}
        onModelChange={setModelId}
      />
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map(({ icon: Icon, label, prompt }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleSuggestion(prompt)}
            className="gap-1.5 rounded-full font-normal text-muted-foreground"
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
