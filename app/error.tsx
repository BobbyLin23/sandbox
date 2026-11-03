"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

import { ErrorView } from "@/components/error-view"

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return <ErrorView digest={error.digest} onRetry={unstable_retry} />
}
