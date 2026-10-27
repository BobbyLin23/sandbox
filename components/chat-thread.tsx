"use client"

import { useChat } from "@ai-sdk/react"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import type { DynamicToolUIPart, ToolUIPart, UIMessage } from "ai"
import { getToolName, lastAssistantMessageIsCompleteWithToolCalls } from "ai"
import { CheckIcon, XIcon } from "lucide-react"
import Image from "next/image"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { mintChatAccessToken, startChatSession } from "@/app/actions"
import { useChatActivity } from "@/components/chat-activity"
import { ChatComposer } from "@/components/chat-composer"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Markdown } from "@/components/ui/markdown"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ui/reasoning"
import { Spinner } from "@/components/ui/spinner"
import type { GameModelId, GameModelOption } from "@/lib/games/model-catalog"
import type { gameChat } from "@/trigger/chat"

function isToolPart(
  part: UIMessage["parts"][number]
): part is ToolUIPart | DynamicToolUIPart {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool"
}

/**
 * Where a tool part sits in its lifecycle. The transport can replay a turn's
 * chunks onto an assistant message that already holds them (e.g. resuming
 * after a dropped connection), which leaves two parts sharing a `toolCallId`.
 * When that happens, the most advanced copy is the one worth showing.
 */
const toolStateRank: Record<string, number> = {
  "input-streaming": 0,
  "input-available": 1,
  "approval-requested": 2,
  "approval-responded": 2,
  "output-denied": 3,
  "output-error": 3,
  "output-available": 3,
}

/** Collapse duplicate tool parts so each tool call renders exactly once. */
function getRenderableParts(parts: UIMessage["parts"]) {
  const keptPartByCallId = new Map<string, { index: number; rank: number }>()

  parts.forEach((part, index) => {
    if (!isToolPart(part) || !part.toolCallId) return

    const rank = toolStateRank[part.state] ?? 0
    const kept = keptPartByCallId.get(part.toolCallId)

    // Later copies win ties: on a replay they carry the newer state.
    if (!kept || rank >= kept.rank) {
      keptPartByCallId.set(part.toolCallId, { index, rank })
    }
  })

  return parts.filter((part, index) => {
    if (!isToolPart(part) || !part.toolCallId) return true

    return keptPartByCallId.get(part.toolCallId)?.index === index
  })
}

function getToolPath(part: ToolUIPart | DynamicToolUIPart) {
  const input = part.input

  if (typeof input !== "object" || input == null || !("path" in input)) {
    return undefined
  }

  const path = (input as { path: unknown }).path

  return typeof path === "string" && path ? path : undefined
}

type AskPlayerOption = {
  id: string
  label: string
  description: string
}

type AskPlayerInput = {
  dimension: string
  question: string
  options: AskPlayerOption[]
}

type AskPlayerOutput = {
  optionId: string
  optionLabel: string
}

const askPlayerDimensionLabels: Record<string, string> = {
  loop: "the gameplay loop",
  goal: "goals and objectives",
  world: "the setting and story",
  look: "the visual style",
  feel: "mood, tone and pacing",
  controls: "controls and interaction",
  sound: "sound and music",
  scope: "scope and complexity",
}

function isAskPlayerInput(value: unknown): value is AskPlayerInput {
  if (typeof value !== "object" || value == null) return false

  const { dimension, question, options } = value as AskPlayerInput

  return (
    typeof dimension === "string" &&
    typeof question === "string" &&
    Array.isArray(options) &&
    options.every(
      (option) =>
        typeof option.id === "string" &&
        typeof option.label === "string" &&
        typeof option.description === "string"
    )
  )
}

function isAskPlayerOutput(value: unknown): value is AskPlayerOutput {
  if (typeof value !== "object" || value == null) return false

  const { optionId, optionLabel } = value as AskPlayerOutput

  return typeof optionId === "string" && typeof optionLabel === "string"
}

function AskPlayerCard({
  dimension,
  question,
  options,
  disabled,
  onAnswer,
}: {
  dimension: string
  question: string
  options: AskPlayerOption[]
  disabled?: boolean
  onAnswer: (option: AskPlayerOption) => void
}) {
  const dimensionLabel = askPlayerDimensionLabels[dimension]

  return (
    <Questionnaire
      className="rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault()

        const optionId = new FormData(event.currentTarget)
          .get("option")
          ?.toString()
        const option = options.find((candidate) => candidate.id === optionId)

        if (option) {
          onAnswer(option)
        }
      }}
    >
      <QuestionnaireItem name="option" required disabled={disabled}>
        <QuestionnaireTitle>{question}</QuestionnaireTitle>
        {dimensionLabel && (
          <QuestionnaireDescription>
            About {dimensionLabel}.
          </QuestionnaireDescription>
        )}
        <QuestionnaireChoices>
          {options.map((option) => (
            <QuestionnaireChoice key={option.id} value={option.id}>
              {option.label}
              <QuestionnaireChoiceDescription>
                {option.description}
              </QuestionnaireChoiceDescription>
            </QuestionnaireChoice>
          ))}
        </QuestionnaireChoices>
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnaireSubmit disabled={disabled} />
      </QuestionnaireActions>
    </Questionnaire>
  )
}

function AskPlayerPart({
  part,
  disabled,
  onAnswer,
}: {
  part: ToolUIPart | DynamicToolUIPart
  disabled?: boolean
  onAnswer: (option: AskPlayerOption) => void
}) {
  switch (part.state) {
    // The question is still being generated — fall back to the generic tool
    // marker until the full input has arrived.
    case "input-streaming":
    case "output-error":
      return <ToolMarker part={part} />
    case "input-available": {
      if (!isAskPlayerInput(part.input)) {
        return <ToolMarker part={part} />
      }

      return (
        <AskPlayerCard
          dimension={part.input.dimension}
          question={part.input.question}
          options={part.input.options}
          disabled={disabled}
          onAnswer={onAnswer}
        />
      )
    }
    case "output-available": {
      const answered = isAskPlayerOutput(part.output) ? part.output : undefined
      const question = isAskPlayerInput(part.input) ? part.input.question : ""

      return (
        <Marker variant="border">
          <MarkerIcon>
            <CheckIcon className="size-4" />
          </MarkerIcon>
          <MarkerContent className="min-w-0 flex-1">
            <span
              className="block truncate"
              title={
                question
                  ? `${question} — ${answered?.optionLabel ?? ""}`
                  : undefined
              }
            >
              Asked the player{question ? `: ${question}` : ""}
              {answered ? ` → ${answered.optionLabel}` : ""}
            </span>
          </MarkerContent>
        </Marker>
      )
    }
    default:
      return <ToolMarker part={part} />
  }
}

function ToolMarker({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  const toolName = getToolName(part)
  const path = getToolPath(part)

  const isActive =
    part.state === "input-streaming" || part.state === "input-available"
  const isFailed = part.state === "output-error"

  return (
    <Marker variant="border">
      <MarkerIcon>
        {isActive ? (
          <Spinner className="size-4" />
        ) : isFailed ? (
          <XIcon className="size-4 text-destructive" />
        ) : (
          <CheckIcon className="size-4" />
        )}
      </MarkerIcon>
      <MarkerContent className="min-w-0 flex-1">
        {isFailed ? (
          <span className="block truncate" title={part.errorText}>
            {toolName} failed: {part.errorText}
          </span>
        ) : path ? (
          <span className="block truncate">
            {isActive ? "Running" : "Ran"} {toolName}: {path}
          </span>
        ) : (
          <span>{isActive ? `Running ${toolName}…` : `Ran ${toolName}`}</span>
        )}
      </MarkerContent>
    </Marker>
  )
}

/**
 * One message in the thread. Memoized so a streaming delta re-renders only
 * the message it belongs to — historical messages (and their markdown) are
 * skipped entirely via the UIMessage identity check.
 */
const ThreadMessage = memo(function ThreadMessage({
  message,
  isStreamingMessage,
  isBusy,
  onAskPlayerAnswer,
}: {
  message: UIMessage
  isStreamingMessage: boolean
  isBusy: boolean
  onAskPlayerAnswer: (
    toolCallId: string,
    output: { optionId: string; optionLabel: string }
  ) => void
}) {
  const isAssistant = message.role === "assistant"
  const parts = getRenderableParts(message.parts)

  return (
    <MessageScrollerItem messageId={message.id}>
      <MessageGroup>
        <Message align={message.role === "user" ? "end" : "start"}>
          {isAssistant && (
            <MessageAvatar>
              <Image
                src="/logo.svg"
                alt="Assistant"
                width={32}
                height={32}
                className="size-8 object-contain"
              />
            </MessageAvatar>
          )}
          <MessageContent>
            <div className="flex w-full min-w-0 flex-col gap-2">
              {parts.map((part, index) => {
                // Position is part of the key: a replayed turn can repeat a
                // toolCallId or reasoning id within the same message, and keys
                // only need to be unique among siblings.
                const key = isToolPart(part)
                  ? `${part.toolCallId ?? "tool"}-${index}`
                  : part.type === "reasoning"
                    ? `${part.id ?? "reasoning"}-${index}`
                    : `text-${index}`

                if (isAssistant && part.type === "reasoning") {
                  if (!part.text) {
                    return null
                  }

                  const isStreamingReasoning =
                    isStreamingMessage && part.state === "streaming"

                  return (
                    <Reasoning
                      key={key}
                      isStreaming={isStreamingReasoning}
                      className="w-full"
                    >
                      <ReasoningTrigger />
                      <ReasoningContent>{part.text}</ReasoningContent>
                    </Reasoning>
                  )
                }

                if (part.type === "text") {
                  if (!part.text) {
                    return null
                  }

                  const isStreamingText =
                    isStreamingMessage && index === parts.length - 1

                  return (
                    <Bubble
                      key={key}
                      align={message.role === "user" ? "end" : "start"}
                      variant={message.role === "user" ? "secondary" : "ghost"}
                    >
                      <BubbleContent
                        className={isAssistant ? "py-2!" : undefined}
                      >
                        {isAssistant ? (
                          <span className="flex items-end gap-0.5">
                            <Markdown>{part.text}</Markdown>
                            {isStreamingText && (
                              <span className="mb-1 inline-block h-4 w-0.5 animate-pulse rounded-full bg-foreground" />
                            )}
                          </span>
                        ) : (
                          part.text
                        )}
                      </BubbleContent>
                    </Bubble>
                  )
                }

                if (isAssistant && isToolPart(part)) {
                  if (part.type === "tool-ask_player") {
                    return (
                      <AskPlayerPart
                        key={key}
                        part={part}
                        disabled={isBusy}
                        onAnswer={(option) =>
                          onAskPlayerAnswer(part.toolCallId, {
                            optionId: option.id,
                            optionLabel: option.label,
                          })
                        }
                      />
                    )
                  }

                  return <ToolMarker key={key} part={part} />
                }

                return null
              })}
            </div>
          </MessageContent>
        </Message>
      </MessageGroup>
    </MessageScrollerItem>
  )
})

/**
 * Return to the live edge whenever the player sends a turn. `autoScroll`
 * follows new text on its own, but only while the view is already at the
 * bottom — a player who scrolled up to re-read has released it, and would
 * otherwise not see the message they just sent.
 */
function FollowOnSubmit({ isSubmitting }: { isSubmitting: boolean }) {
  const { scrollToEnd } = useMessageScroller()
  const wasSubmitting = useRef(false)

  useEffect(() => {
    if (isSubmitting && !wasSubmitting.current) {
      scrollToEnd({ behavior: "smooth" })
    }

    wasSubmitting.current = isSubmitting
  }, [isSubmitting, scrollToEnd])

  return null
}

export function ChatThread({
  gameId,
  messages: initialMessages = [],
  lastEventId,
  publicAccessToken,
  initialModelId,
  models,
  onTurnComplete,
}: {
  gameId: string
  messages?: UIMessage[]
  lastEventId?: string
  publicAccessToken?: string
  initialModelId?: GameModelId
  models: GameModelOption[]
  onTurnComplete?: () => void
}) {
  const [modelId, setModelId] = useState<GameModelId>(() => {
    const initial = models.find((model) => model.id === initialModelId)

    return initial?.id ?? models[0]?.id ?? ""
  })

  const transport = useTriggerChatTransport<typeof gameChat>({
    task: "game-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: async ({ chatId, clientData }) => {
      const result = await startChatSession({ chatId, clientData })

      // Throwing here (client-side) surfaces our message via useChat's
      // error — server action errors are masked in production.
      if ("error" in result) {
        throw new Error(result.error)
      }

      return result
    },
    clientData: { modelId },
    sessions: publicAccessToken
      ? {
          [gameId]: {
            publicAccessToken,
            ...(lastEventId ? { lastEventId } : {}),
          },
        }
      : undefined,
  })

  const onTurnCompleteRef = useRef(onTurnComplete)
  onTurnCompleteRef.current = onTurnComplete

  const {
    messages,
    sendMessage,
    stop,
    status,
    error,
    resumeStream,
    addToolOutput,
  } = useChat({
    id: gameId,
    messages: initialMessages,
    transport,
    // Reasoning-heavy models emit many small deltas per second. Without a
    // throttle each one re-renders the whole thread (and re-parses markdown),
    // which saturates the main thread until the stream appears frozen.
    throttle: 50,
    // Resume the turn automatically once every pending tool call (e.g. an
    // answered ask_player) has an output.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: ({ message, isAbort, isError }) => {
      if (isAbort || isError) return

      // Only reload the preview when the turn actually used tools, since
      // that's the only way game files change.
      if (!message.parts.some(isToolPart)) return

      onTurnCompleteRef.current?.()
    },
  })

  // Resume manually instead of via useChat's `resume` option: that option's
  // mount effect runs twice under React StrictMode, and each new resume
  // request aborts the previous one (AI SDK activeResumeRequest), leaving the
  // stream dead before it delivers anything.
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => {
    if (publicAccessToken == null) return

    let cancelled = false
    let attempt = 0

    const run = async () => {
      await resumeStream()

      if (cancelled) return

      // The resume finished without producing an assistant reply (e.g. an
      // older subscription still owned the stream, or the cursor skipped
      // everything). Reset the resume cursor and replay from the start.
      const lastMessage = messagesRef.current.at(-1)
      if (lastMessage?.role === "assistant" || attempt >= 3) return

      attempt += 1
      transport.setSession(gameId, { publicAccessToken })
      setTimeout(run, 2000 * attempt)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [gameId, publicAccessToken, resumeStream, transport])

  const lastMessage = messages.at(-1)
  const lastAssistantText = lastMessage?.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
  const lastAssistantReasoning = lastMessage?.parts
    .map((part) => (part.type === "reasoning" ? part.text : ""))
    .join("")

  const isThinking =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      !lastAssistantText &&
      !lastAssistantReasoning)

  const isBusy = status === "submitted" || status === "streaming"

  // Stable callback so ThreadMessage's memo isn't busted by a new function
  // identity on every render.
  const handleAskPlayerAnswer = useCallback(
    (toolCallId: string, output: { optionId: string; optionLabel: string }) => {
      addToolOutput({ tool: "ask_player", toolCallId, output })
    },
    [addToolOutput]
  )

  const { setActive: setChatActive } = useChatActivity()

  // Tell the app (e.g. the sidebar's credit polling) whether a chat run is
  // streaming; reset on unmount so navigating away stops the polling.
  useEffect(() => {
    setChatActive(status === "submitted" || status === "streaming")

    return () => {
      setChatActive(false)
    }
  }, [status, setChatActive])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Follow the live edge while the reply streams: `autoScroll` pins the
          viewport to the newest text and releases it as soon as the player
          scrolls up. Rows are deliberately not `scrollAnchor`s — anchoring a
          new turn to the top makes the scroller reserve the leftover height as
          a spacer, which shows up as a large empty gap above the composer for
          short replies. `mt-auto` bottom-aligns a transcript shorter than the
          viewport so the last message always sits next to the composer. */}
      <MessageScrollerProvider autoScroll>
        <FollowOnSubmit isSubmitting={status === "submitted"} />
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-2xl py-4 [&>*:first-child]:mt-auto">
              {messages.map((message) => {
                const isAssistant = message.role === "assistant"

                const hasRenderableContent = message.parts.some(
                  (part) =>
                    (part.type === "text" && part.text) ||
                    (part.type === "reasoning" && part.text) ||
                    isToolPart(part)
                )

                if (!hasRenderableContent) {
                  return null
                }

                const isStreamingMessage =
                  isAssistant &&
                  status === "streaming" &&
                  message.id === lastMessage?.id

                return (
                  <ThreadMessage
                    key={message.id}
                    message={message}
                    isStreamingMessage={isStreamingMessage}
                    isBusy={isBusy}
                    onAskPlayerAnswer={handleAskPlayerAnswer}
                  />
                )
              })}
              {isThinking && (
                <MessageScrollerItem>
                  <MessageGroup>
                    <Message>
                      <MessageAvatar>
                        <Image
                          src="/logo.svg"
                          alt="Assistant"
                          width={32}
                          height={32}
                          className="size-8 object-contain"
                        />
                      </MessageAvatar>
                      <MessageContent>
                        <Bubble variant="ghost">
                          <BubbleContent className="py-2!">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Spinner className="size-4" />
                              Thinking
                            </span>
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageGroup>
                </MessageScrollerItem>
              )}
              {status === "error" && error && (
                <MessageScrollerItem>
                  <MessageGroup>
                    <Message>
                      <MessageAvatar>
                        <Image
                          src="/logo.svg"
                          alt="Assistant"
                          width={32}
                          height={32}
                          className="size-8 object-contain"
                        />
                      </MessageAvatar>
                      <MessageContent>
                        <Bubble variant="destructive">
                          <BubbleContent>
                            Something went wrong: {error.message}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageGroup>
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      <div className="mx-auto w-full max-w-2xl">
        <ChatComposer
          onSubmit={(value) => sendMessage({ text: value })}
          onStop={stop}
          isStreaming={isBusy}
          models={models}
          modelId={modelId}
          onModelChange={setModelId}
        />
      </div>
    </div>
  )
}
