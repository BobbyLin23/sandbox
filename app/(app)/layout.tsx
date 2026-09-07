import { auth } from "@clerk/nextjs/server"

import { AppSidebar } from "@/components/app-sidebar"
import { ChatActivityProvider } from "@/components/chat-activity"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { formatCredits } from "@/lib/credits/format"
import { FREE_CREDITS, getCreditBalance } from "@/lib/credits/ledger"
import { listGames } from "@/lib/games/queries"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await auth.protect()

  const { orgId } = await auth()
  const games = await listGames()
  const credits = orgId ? await getCreditBalance(orgId) : FREE_CREDITS

  return (
    <ChatActivityProvider>
      <SidebarProvider>
        <AppSidebar games={games} credits={formatCredits(credits)} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ChatActivityProvider>
  )
}
