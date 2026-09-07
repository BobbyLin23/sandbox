"use client"

import { useChat } from "@ai-sdk/react"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import type { DynamicToolUIPart, ToolUIPart, UIMessage } from "ai"
import { getToolName } from "ai"
import { CheckIcon, XIcon } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef } from "react"
import { mintChatAccessToken, startChatSession } from "@/app/actions"
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
} from "@/components/ui/message-scroller"
import { Spinner } from "@/components/ui/spinner"
import type { gameChat } from "@/trigger/chat"

function isToolPart(
  part: UIMessage["parts"][number]
): part is ToolUIPart | DynamicToolUIPart {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool"
}

function getToolPath(part: ToolUIPart | DynamicToolUIPart) {
  const input = part.input

  if (typeof input !== "object" || input == null || !("path" in input)) {
    return undefined
  }

  const path = (input as { path: unknown }).path

  return typeof path === "string" && path ? path : undefined
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

export function ChatThread({
  gameId,
  messages: initialMessages = [],
  lastEventId,
  publicAccessToken,
  onTurnComplete,
}: {
  gameId: string
  messages?: UIMessage[]
  lastEventId?: string
  publicAccessToken?: string
  onTurnComplete?: () => void
}) {
  const transport = useTriggerChatTransport<typeof gameChat>({
    task: "game-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
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

  const { messages, sendMessage, stop, status, error, resumeStream } = useChat({
    id: gameId,
    messages: initialMessages,
    transport,
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

  const isThinking =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      !lastAssistantText)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-2xl pb-2">
              {messages.map((message) => {
                const isAssistant = message.role === "assistant"

                const hasRenderableContent = message.parts.some(
                  (part) =>
                    (part.type === "text" && part.text) || isToolPart(part)
                )

                if (!hasRenderableContent) {
                  return null
                }

                const isStreamingMessage =
                  isAssistant &&
                  status === "streaming" &&
                  message.id === lastMessage?.id

                return (
                  <MessageScrollerItem key={message.id} scrollAnchor>
                    <MessageGroup>
                      <Message
                        align={message.role === "user" ? "end" : "start"}
                      >
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
                            {message.parts.map((part, index) => {
                              const key = isToolPart(part)
                                ? (part.toolCallId ?? `tool-${index}`)
                                : `text-${index}`

                              if (part.type === "text") {
                                if (!part.text) {
                                  return null
                                }

                                const isStreamingText =
                                  isStreamingMessage &&
                                  index === message.parts.length - 1

                                return (
                                  <Bubble
                                    key={key}
                                    align={
                                      message.role === "user" ? "end" : "start"
                                    }
                                    variant={
                                      message.role === "user"
                                        ? "secondary"
                                        : "ghost"
                                    }
                                  >
                                    <BubbleContent
                                      className={
                                        isAssistant ? "py-2!" : undefined
                                      }
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
              })}
              {isThinking && (
                <MessageScrollerItem scrollAnchor>
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
                <MessageScrollerItem scrollAnchor>
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
          isStreaming={status === "submitted" || status === "streaming"}
        />
      </div>
    </div>
  )
}
