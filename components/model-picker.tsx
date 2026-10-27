"use client"

import { ChevronDown, LayoutGrid } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { GameModelId, GameModelOption } from "@/lib/games/model-catalog"

interface ModelPickerProps {
  models: GameModelOption[]
  modelId: GameModelId
  onModelChange: (modelId: GameModelId) => void
}

export function ModelPicker({
  models,
  modelId,
  onModelChange,
}: ModelPickerProps) {
  const selected = models.find((model) => model.id === modelId) ?? models[0]

  if (!selected) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group/menu flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        <LayoutGrid className="size-4" />
        {selected.name}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-96 min-w-64 overflow-y-auto"
      >
        <DropdownMenuRadioGroup
          value={selected.id}
          onValueChange={(value) => onModelChange(value)}
        >
          {models.map((model) => (
            <DropdownMenuRadioItem
              key={model.id}
              value={model.id}
              closeOnClick
              className="flex-col items-start gap-0.5 py-1.5"
            >
              <span className="whitespace-nowrap text-sm font-medium">
                {model.name}
              </span>
              {model.tagline && (
                <span className="text-xs text-muted-foreground">
                  {model.tagline}
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
