"use client"

import { ChevronDown, LayoutGrid } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { GameModelId } from "@/lib/games/model-catalog"
import { gameModels } from "@/lib/games/model-catalog"

interface ModelPickerProps {
  modelId: GameModelId
  onModelChange: (modelId: GameModelId) => void
}

export function ModelPicker({ modelId, onModelChange }: ModelPickerProps) {
  const selected = gameModels[modelId]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group/menu flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        <LayoutGrid className="size-4" />
        {selected.name}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuRadioGroup
          value={modelId}
          onValueChange={(value) => onModelChange(value as GameModelId)}
        >
          {Object.values(gameModels).map((model) => (
            <DropdownMenuRadioItem
              key={model.id}
              value={model.id}
              closeOnClick
              className="flex-col items-start gap-0.5 py-1.5"
            >
              <span className="whitespace-nowrap text-sm font-medium">
                {model.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {model.tagline}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
