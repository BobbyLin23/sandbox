"use client"

import {
  ArrowUp,
  Box,
  Car,
  Check,
  ChevronDown,
  Cloud,
  Crosshair,
  LayoutGrid,
  Swords,
  Target,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"

const suggestions = [
  { icon: Box, label: "Voxel survival" },
  { icon: Swords, label: "Ink samurai duel" },
  { icon: Zap, label: "Comic-book firefight" },
  { icon: Crosshair, label: "Realistic battlefield" },
  { icon: Target, label: "Fight-first shooter" },
  { icon: Car, label: "Jungle expedition drive" },
  { icon: Cloud, label: "Sunny kingdom platformer" },
]

const models = ["Kimi K3", "Kimi K2", "GPT-5"]

export function ChatComposer() {
  return (
    <div className="flex w-full flex-col gap-4">
      <InputGroup className="bg-popover">
        <InputGroupTextarea
          rows={1}
          placeholder="Describe the game you want to build..."
          className="min-h-10 max-h-48 field-sizing-content"
        />
        <InputGroupAddon align="block-end">
          <div className="flex w-full items-center justify-between gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="group/menu flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                <LayoutGrid className="size-4" />
                Kimi K3
                <ChevronDown className="size-3.5 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {models.map((model) => (
                  <DropdownMenuItem
                    key={model}
                    className="justify-between text-muted-foreground"
                    data-selected={model === "Kimi K3"}
                  >
                    {model}
                    {model === "Kimi K3" && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="icon-lg"
              className="rounded-full bg-orange-500 text-white hover:bg-orange-600 focus-visible:border-orange-600 focus-visible:ring-orange-500/40"
            >
              <ArrowUp className="size-5" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map(({ icon: Icon, label }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            className="gap-1.5 font-normal text-muted-foreground rounded-full"
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
