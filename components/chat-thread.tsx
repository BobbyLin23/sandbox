"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import Image from "next/image"

import { ChatComposer } from "@/components/chat-composer"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
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

const initialMessages: UIMessage[] = [
  {
    id: "1",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Hey! I'm your game-building partner. Describe the game you want to build and I'll help you bring it to life.",
      },
    ],
  },
]

export function ChatThread() {
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: initialMessages,
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-2xl">
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
                            {message.parts
                              .map((part) =>
                                part.type === "text" ? part.text : ""
                              )
                              .join("")}
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
