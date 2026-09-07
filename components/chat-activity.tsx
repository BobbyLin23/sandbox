"use client"

import { createContext, useContext, useMemo, useState } from "react"

type ChatActivityContextValue = {
  active: boolean
  setActive: (active: boolean) => void
}

const ChatActivityContext = createContext<ChatActivityContextValue | undefined>(
  undefined
)

export function ChatActivityProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [active, setActive] = useState(false)

  const value = useMemo(() => ({ active, setActive }), [active])

  return (
    <ChatActivityContext.Provider value={value}>
      {children}
    </ChatActivityContext.Provider>
  )
}

export function useChatActivity() {
  const context = useContext(ChatActivityContext)

  if (!context) {
    throw new Error(
      "useChatActivity must be used within a ChatActivityProvider"
    )
  }

  return context
}
