"use client"

import { ArrowUp, Check, ChevronDown, LayoutGrid } from "lucide-react"
import { useState, useTransition } from "react"
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

const models = ["Kimi K3", "Kimi K2", "GPT-5"]

interface ChatComposerProps {
  onSubmit: (value: string) => unknown
}

export function ChatComposer({ onSubmit }: ChatComposerProps) {
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
              onClick={() => handleSubmit(title)}
              disabled={isPending}
              className="rounded-full bg-orange-500 text-white hover:bg-orange-600 focus-visible:border-orange-600 focus-visible:ring-orange-500/40"
            >
              <ArrowUp className="size-5" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
