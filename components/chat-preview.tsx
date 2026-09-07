"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const POLL_INTERVAL_MS = 2_000
const MAX_POLL_ATTEMPTS = 90

export function ChatPreview({
  gameId,
  revision = 0,
}: {
  gameId: string
  revision?: number
}) {
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
        // Bust the fetch cache per revision; the iframe reload itself is
        // driven by the revision key.
        const response = await fetch(`${previewEndpoint}?r=${revision}`, {
          cache: "no-store",
        })

        if (response.ok) {
          if (!cancelled) {
            setPreviewUrl(previewEndpoint)
          }
          Sentry.logger.info("Game preview ready", {
            "game.id": gameId,
            "game.revision": revision,
          })
          return
        }

        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            setError("You don't have access to this preview.")
          }
          Sentry.logger.warn("Game preview access denied", {
            "game.id": gameId,
            "game.revision": revision,
            "preview.status": response.status,
          })
          return
        }
      } catch {
        // Transient network failure — keep polling.
        Sentry.logger.warn("Game preview poll failed", {
          "game.id": gameId,
          "game.revision": revision,
          "preview.attempt": attempts + 1,
        })
      }

      attempts += 1
      if (attempts >= MAX_POLL_ATTEMPTS) {
        if (!cancelled) {
          setError(
            "The preview is taking too long to start. Try again in a moment."
          )
        }
        Sentry.logger.error("Game preview setup timed out", {
          "game.id": gameId,
          "game.revision": revision,
          "preview.attempts": attempts,
        })
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
  }, [previewEndpoint, revision, gameId])

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
      key={revision}
      src={previewUrl}
      title="Game preview"
      className="h-full w-full border-0"
    />
  )
}
