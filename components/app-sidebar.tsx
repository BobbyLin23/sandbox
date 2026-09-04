"use client"

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { Coins, Gamepad2, MessagesSquare, PenLine } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

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

type Game = {
  id: string
  title: string
}

export function AppSidebar({ games }: { games?: Game[] }) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

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
                  {games && games.length > 0 ? (
                    <div className="flex flex-col">
                      {games.map((game) => (
                        <PopoverClose
                          key={game.id}
                          nativeButton={false}
                          render={<Link href={`/games/${game.id}`} />}
                        >
                          <span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                            <Gamepad2 className="size-4 shrink-0" />
                            <span className="truncate">{game.title}</span>
                          </span>
                        </PopoverClose>
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
            ) : games && games.length > 0 ? (
              <SidebarMenu>
                {games.map((game) => (
                  <SidebarMenuItem key={game.id}>
                    <SidebarMenuButton
                      render={<Link href={`/games/${game.id}`} />}
                    >
                      <Gamepad2 />
                      <span>{game.title}</span>
                    </SidebarMenuButton>
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
            <SidebarMenuButton>
              <Coins />
              <span>Credits</span>
              <SidebarMenuBadge>$1.00</SidebarMenuBadge>
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
