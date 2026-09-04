"use client"

import { useChat } from "@ai-sdk/react"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import type { UIMessage } from "ai"
import Image from "next/image"
import { useEffect, useRef } from "react"
import { mintChatAccessToken, startChatSession } from "@/app/actions"
import { ChatComposer } from "@/components/chat-composer"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Markdown } from "@/components/ui/markdown"
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

function getMessageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
}

export function ChatThread({
  gameId,
  messages: initialMessages = [],
  lastEventId,
  publicAccessToken,
}: {
  gameId: string
  messages?: UIMessage[]
  lastEventId?: string
  publicAccessToken?: string
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

  const { messages, sendMessage, stop, status, error, resumeStream } = useChat({
    id: gameId,
    messages: initialMessages,
    transport,
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
                const text = getMessageText(message)

                if (isAssistant && !text) {
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
                          <Bubble
                            align={message.role === "user" ? "end" : "start"}
                            variant={
                              message.role === "user" ? "secondary" : "ghost"
                            }
                          >
                            <BubbleContent
                              className={isAssistant ? "py-2!" : undefined}
                            >
                              {isAssistant ? (
                                <span className="flex items-end gap-0.5">
                                  <Markdown>{text}</Markdown>
                                  {isStreamingMessage && (
                                    <span className="mb-1 inline-block h-4 w-0.5 animate-pulse rounded-full bg-foreground" />
                                  )}
                                </span>
                              ) : (
                                text
                              )}
                            </BubbleContent>
                          </Bubble>
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
