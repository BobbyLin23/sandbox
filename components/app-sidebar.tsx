"use client"

import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/nextjs"
import { Coins, Gamepad2, MessagesSquare, PenLine } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { useChatActivity } from "@/components/chat-activity"
import { GameMenu } from "@/components/game-menu"
import { Empty, EmptyDescription } from "@/components/ui/empty"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { getCreditsAction } from "@/lib/credits/actions"
import { listGamesAction } from "@/lib/games/actions"

type Game = {
  id: string
  title: string
}

export function AppSidebar({
  games,
  credits: creditsProp = "$1.00",
}: {
  games?: Game[]
  credits?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { orgId } = useAuth()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const [clientGames, setClientGames] = useState<Game[]>(games ?? [])
  const [credits, setCredits] = useState(creditsProp)
  const prevOrgId = useRef(orgId)
  const { active: chatActive } = useChatActivity()

  // Poll the live balance while a chat run is streaming so the badge drops
  // as a game builds; snap to the final balance once it finishes.
  useEffect(() => {
    let cancelled = false

    const tick = () => {
      getCreditsAction().then((balance) => {
        if (!cancelled) {
          setCredits(balance)
        }
      })
    }

    tick()

    if (!chatActive) {
      return () => {
        cancelled = true
      }
    }

    const interval = setInterval(tick, 2000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [chatActive])

  // Keep Recents in sync with server data (e.g. after an org switch re-renders
  // the layout with the new org's games).
  useEffect(() => {
    setClientGames(games ?? [])
  }, [games])

  // Switching organizations is a client-side session change, so the server
  // layout doesn't re-render on its own — refresh it to pick up the new
  // org's credits and games.
  useEffect(() => {
    if (prevOrgId.current === orgId) {
      return
    }
    prevOrgId.current = orgId
    router.refresh()
  }, [orgId, router])

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch games on navigation so new games appear in Recents
  useEffect(() => {
    let cancelled = false

    listGamesAction().then((latest) => {
      if (!cancelled) {
        setClientGames(latest)
      }
    })

    return () => {
      cancelled = true
    }
  }, [pathname])

  const activeGames = clientGames

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Image
            src="/logo.svg"
            alt="Sandbox"
            width={20}
            height={20}
            className="size-5 group-data-[collapsible=icon]:hidden"
          />
          <span className="font-logo text-base font-medium tracking-tight group-data-[collapsible=icon]:hidden">
            Sandbox
          </span>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/" />}
                  isActive={pathname === "/"}
                >
                  <PenLine />
                  <span>New Game</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Recents</SidebarGroupLabel>
          <SidebarGroupContent>
            {isCollapsed ? (
              <Popover>
                <PopoverTrigger render={<SidebarMenuButton />}>
                  <MessagesSquare />
                  <span className="sr-only">Recents</span>
                </PopoverTrigger>
                <PopoverContent side="right" sideOffset={8}>
                  <PopoverHeader>
                    <PopoverTitle>Recents</PopoverTitle>
                  </PopoverHeader>
                  {activeGames && activeGames.length > 0 ? (
                    <div className="flex flex-col">
                      {activeGames.map((game) => (
                        <div
                          key={game.id}
                          className="flex items-center gap-1 pr-1.5"
                        >
                          <PopoverClose
                            nativeButton={false}
                            render={
                              <Link
                                href={`/games/${game.id}`}
                                aria-current={
                                  pathname === `/games/${game.id}`
                                    ? "page"
                                    : undefined
                                }
                              />
                            }
                            className="min-w-0 flex-1"
                          >
                            <span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                              <Gamepad2 className="size-4 shrink-0" />
                              <span className="truncate">{game.title}</span>
                            </span>
                          </PopoverClose>
                          <GameMenu
                            gameId={game.id}
                            title={game.title}
                            variant="compact"
                            align="start"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty className="border py-4">
                      <EmptyDescription className="text-xs">
                        Your games will live here.
                      </EmptyDescription>
                    </Empty>
                  )}
                </PopoverContent>
              </Popover>
            ) : activeGames && activeGames.length > 0 ? (
              <SidebarMenu>
                {activeGames.map((game) => (
                  <SidebarMenuItem key={game.id}>
                    <SidebarMenuButton
                      render={<Link href={`/games/${game.id}`} />}
                      isActive={pathname === `/games/${game.id}`}
                    >
                      <Gamepad2 />
                      <span>{game.title}</span>
                    </SidebarMenuButton>
                    <GameMenu
                      gameId={game.id}
                      title={game.title}
                      variant="sidebar"
                      align="start"
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <Empty className="border py-4">
                <EmptyDescription className="text-xs">
                  Your games will live here.
                </EmptyDescription>
              </Empty>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/billing" />}
              isActive={pathname === "/billing"}
            >
              <Coins />
              <span>Credits</span>
              <SidebarMenuBadge>{credits}</SidebarMenuBadge>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "w-full! max-w-full",
                  organizationSwitcherTrigger:
                    "w-full! max-w-full justify-between!",
                  organizationPreview: "min-w-0",
                  organizationPreviewTextContainer: "min-w-0",
                  organizationPreviewMainIdentifier: "truncate",
                },
              }}
            />
          </div>
          <UserButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
