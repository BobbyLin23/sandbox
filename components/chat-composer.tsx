"use client"

import { ArrowUp, Square } from "lucide-react"
import { useState, useTransition } from "react"
import { ModelPicker } from "@/components/model-picker"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import type { GameModelId } from "@/lib/games/model-catalog"

interface ChatComposerProps {
  onSubmit: (value: string) => unknown
  onStop?: () => void
  isStreaming?: boolean
  modelId: GameModelId
  onModelChange: (modelId: GameModelId) => void
}

export function ChatComposer({
  onSubmit,
  onStop,
  isStreaming = false,
  modelId,
  onModelChange,
}: ChatComposerProps) {
  const [title, setTitle] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (value: string) => {
    if (!value.trim() || isPending) return
    const trimmed = value.trim()
    setTitle("")
    startTransition(async () => {
      await onSubmit(trimmed)
    })
  }

  const isCancellable = isStreaming
  const canSubmit = !isPending && !isCancellable

  return (
    <div className="flex w-full flex-col gap-4">
      <InputGroup className="bg-popover">
        <InputGroupTextarea
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Describe the game you want to build..."
          className="min-h-10 max-h-48 field-sizing-content"
        />
        <InputGroupAddon align="block-end">
          <div className="flex w-full items-center justify-between gap-2">
            <ModelPicker modelId={modelId} onModelChange={onModelChange} />

            <Button
              size="icon-lg"
              onClick={() => {
                if (isCancellable) {
                  onStop?.()
                  return
                }
                handleSubmit(title)
              }}
              disabled={!isCancellable && !canSubmit}
              className="rounded-full bg-orange-500 text-white hover:bg-orange-600 focus-visible:border-orange-600 focus-visible:ring-orange-500/40"
            >
              {isCancellable ? (
                <Square className="size-4 fill-current" />
              ) : (
                <ArrowUp className="size-5" />
              )}
              <span className="sr-only">
                {isCancellable ? "Stop" : "Send"}
              </span>
            </Button>
          </div>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
