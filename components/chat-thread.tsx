"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import Image from "next/image"

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

export function ChatThread({
  gameId,
  messages: initialMessages = [],
}: {
  gameId: string
  messages?: UIMessage[]
}) {
  const { messages, sendMessage } = useChat({
    id: gameId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages, id }) {
        return { body: { message: messages[messages.length - 1], id } }
      },
    }),
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-2xl pb-2">
              {messages.map((message) => (
                <MessageScrollerItem key={message.id} scrollAnchor>
                  <MessageGroup>
                    <Message align={message.role === "user" ? "end" : "start"}>
                      {message.role === "assistant" && (
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
                            className={
                              message.role === "assistant" ? "py-2!" : undefined
                            }
                          >
                            {message.role === "assistant" ? (
                              <Markdown>
                                {message.parts
                                  .map((part) =>
                                    part.type === "text" ? part.text : ""
                                  )
                                  .join("")}
                              </Markdown>
                            ) : (
                              message.parts
                                .map((part) =>
                                  part.type === "text" ? part.text : ""
                                )
                                .join("")
                            )}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageGroup>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      <div className="mx-auto w-full max-w-2xl">
        <ChatComposer onSubmit={(value) => sendMessage({ text: value })} />
      </div>
    </div>
  )
}
