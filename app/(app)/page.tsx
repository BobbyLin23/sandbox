import { auth } from "@clerk/nextjs/server"
import Image from "next/image"

import { suggestions } from "@/lib/games/suggestions"

import { ChatComposer } from "@/components/chat-composer"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function Page() {
  await auth.protect()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6">
      <Empty>
        <EmptyMedia>
          <Image src="/logo.svg" alt="Logo" width={48} height={48} />
        </EmptyMedia>
        <EmptyContent className="w-full max-w-2xl gap-6">
          <EmptyHeader className="max-w-sm">
            <EmptyTitle className="text-2xl">
              What should we build today?
            </EmptyTitle>
            <EmptyDescription>
              Build your own racers, shooters, puzzles and whole worlds using
              your own words. If you can describe it, you can play it.
            </EmptyDescription>
          </EmptyHeader>
          <ChatComposer />
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map(({ icon: Icon, label }) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                className="gap-1.5 font-normal text-muted-foreground rounded-full"
              >
                <Icon className="size-4" />
                {label}
              </Button>
            ))}
          </div>
        </EmptyContent>
      </Empty>
    </div>
  )
}
