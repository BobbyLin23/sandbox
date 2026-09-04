"use client"

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

const messages = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hey! I'm your game-building partner. Describe the game you want to build and I'll help you bring it to life.",
  },
  {
    id: 2,
    role: "user",
    content:
      "I want to build a voxel survival game where I mine resources and craft things.",
  },
  {
    id: 3,
    role: "assistant",
    content:
      "Great idea! I'll set up a world where you can dig, gather blocks, and craft tools to survive the night.",
  },
] as const

export function ChatThread() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent>
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
                            {message.content}
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
      <ChatComposer />
    </div>
  )
}
