"use client"

import { BrainIcon, ChevronDownIcon } from "lucide-react"
import type * as React from "react"
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Markdown } from "@/components/ui/markdown"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

// Adapted from Vercel AI Elements' Reasoning component, rebuilt on this
// project's Base UI collapsible and Markdown primitives.

const AUTO_CLOSE_DELAY = 1000
const MS_IN_S = 1000

type ReasoningContextValue = {
  isStreaming: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  duration: number | undefined
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null)

function useReasoning() {
  const context = useContext(ReasoningContext)

  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning")
  }

  return context
}

function Reasoning({
  className,
  isStreaming = false,
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Collapsible>, "onOpenChange"> & {
  isStreaming?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  // An explicit `defaultOpen={false}` keeps the reasoning collapsed even
  // while it streams; otherwise it opens as soon as streaming starts.
  const isExplicitlyClosed = defaultOpen === false

  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? isStreaming)
  const isOpen = open ?? internalOpen

  const [duration, setDuration] = useState<number>()
  const [hasAutoClosed, setHasAutoClosed] = useState(false)
  const hasEverStreamedRef = useRef(isStreaming)
  const startTimeRef = useRef<number | null>(null)

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (open === undefined) {
        setInternalOpen(next)
      }

      onOpenChange?.(next)
    },
    [open, onOpenChange]
  )

  // Track when streaming starts and compute the duration once it ends.
  useEffect(() => {
    if (isStreaming) {
      hasEverStreamedRef.current = true
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now()
      }
    } else if (startTimeRef.current !== null) {
      setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S))
      startTimeRef.current = null
    }
  }, [isStreaming])

  // Auto-open when streaming starts, unless explicitly closed.
  useEffect(() => {
    if (isStreaming && !isOpen && !isExplicitlyClosed) {
      handleOpenChange(true)
    }
  }, [isStreaming, isOpen, isExplicitlyClosed, handleOpenChange])

  // Auto-close shortly after streaming ends — once only, so the player can
  // reopen it afterwards.
  useEffect(() => {
    if (
      hasEverStreamedRef.current &&
      !isStreaming &&
      isOpen &&
      !hasAutoClosed
    ) {
      const timer = setTimeout(() => {
        handleOpenChange(false)
        setHasAutoClosed(true)
      }, AUTO_CLOSE_DELAY)

      return () => clearTimeout(timer)
    }
  }, [isStreaming, isOpen, hasAutoClosed, handleOpenChange])

  const contextValue = useMemo(
    () => ({ duration, isOpen, isStreaming, setIsOpen: handleOpenChange }),
    [duration, isOpen, isStreaming, handleOpenChange]
  )

  return (
    <ReasoningContext.Provider value={contextValue}>
      <Collapsible
        className={cn("not-prose", className)}
        open={isOpen}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  )
}

function ReasoningTriggerBase({
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
  const { isStreaming, isOpen, duration } = useReasoning()

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center gap-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      {...props}
    >
      {isStreaming ? (
        <Spinner className="size-4" />
      ) : (
        <BrainIcon className="size-4" />
      )}
      <span>
        {isStreaming
          ? "Thinking…"
          : duration === undefined
            ? "Thought for a few seconds"
            : `Thought for ${duration} second${duration === 1 ? "" : "s"}`}
      </span>
      <ChevronDownIcon
        className={cn(
          "ml-auto size-4 shrink-0 transition-transform",
          isOpen ? "rotate-180" : "rotate-0"
        )}
      />
    </CollapsibleTrigger>
  )
}

function ReasoningContentBase({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent> & {
  children: string
}) {
  const { isStreaming } = useReasoning()

  return (
    <CollapsibleContent
      className={cn(
        "min-w-0 pl-6 text-muted-foreground data-open:animate-in data-open:slide-in-from-top-2 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-2",
        className
      )}
      {...props}
    >
      {/* Long reasoning blocks scroll inside the panel instead of pushing
          the rest of the thread out of view. */}
      <div className="max-h-72 overflow-y-auto pr-2">
        {isStreaming ? (
          // Raw text while streaming: parsing markdown on every delta of a
          // long reasoning block is O(n²) work and stalls the main thread.
          <p className="wrap-break-word text-sm leading-7 whitespace-pre-wrap">
            {children}
          </p>
        ) : (
          <Markdown>{children}</Markdown>
        )}
      </div>
    </CollapsibleContent>
  )
}

// Memoized: the content is a plain string, so once a part is done its panel
// stops re-rendering (and re-parsing markdown) on every later stream chunk.
const ReasoningTrigger = memo(ReasoningTriggerBase)
const ReasoningContent = memo(ReasoningContentBase)

export { Reasoning, ReasoningContent, ReasoningTrigger }
