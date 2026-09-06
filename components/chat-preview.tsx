"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const POLL_INTERVAL_MS = 2_000
const MAX_POLL_ATTEMPTS = 90

export function ChatPreview({ gameId }: { gameId: string }) {
  const previewEndpoint = `/api/games/${gameId}/preview`
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      if (cancelled) return

      try {
        const response = await fetch(previewEndpoint, { cache: "no-store" })

        if (response.ok) {
          if (!cancelled) {
            setPreviewUrl(previewEndpoint)
          }
          return
        }

        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            setError("You don't have access to this preview.")
          }
          return
        }
      } catch {
        // Transient network failure — keep polling.
      }

      attempts += 1
      if (attempts >= MAX_POLL_ATTEMPTS) {
        if (!cancelled) {
          setError(
            "The preview is taking too long to start. Try again in a moment."
          )
        }
        return
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()

    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [previewEndpoint])

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!previewUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <Spinner className="size-5" />
        <p className="text-sm text-muted-foreground">Setting up preview…</p>
      </div>
    )
  }

  return (
    <iframe
      src={previewUrl}
      title="Game preview"
      className="h-full w-full border-0"
    />
  )
}
