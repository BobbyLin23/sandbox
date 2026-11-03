"use client"

import { AlertTriangle, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function ErrorView({
  digest,
  onRetry,
}: {
  digest?: string
  onRetry: () => void
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <Empty className="max-w-md flex-none border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            This page crashed unexpectedly. Try again, or head back home if the
            problem continues.
            {digest ? ` (Error ID: ${digest})` : null}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button onClick={onRetry}>
            <RotateCw data-icon="inline-start" />
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.assign("/")}>
            Go home
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
