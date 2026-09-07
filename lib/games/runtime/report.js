(() => {
  let firstError = null

  const capture = (error) => {
    if (firstError) return
    firstError = error
  }

  const describeRejection = (reason) => {
    if (reason instanceof Error) {
      return {
        name: reason.name,
        message: reason.message,
        stack: reason.stack ?? null,
        source: null,
        line: null,
        column: null,
      }
    }

    let text
    try {
      text = typeof reason === "string" ? reason : String(reason)
    } catch {
      text = "Unknown rejection"
    }
    return {
      name: "UnhandledRejection",
      message: text,
      stack: null,
      source: null,
      line: null,
      column: null,
    }
  }

  window.addEventListener(
    "error",
    (event) => {
      if (firstError) return

      if (event instanceof ErrorEvent) {
        capture({
          name: event.error?.name ?? "Error",
          message: event.message,
          stack: event.error?.stack ?? null,
          source: event.filename || null,
          line: event.lineno || null,
          column: event.colno || null,
        })
        return
      }

      const target = event.target
      if (target && target !== window) {
        const url = target.src ?? target.href ?? null
        capture({
          name: "ResourceError",
          message: `Failed to load ${target.tagName?.toLowerCase() ?? "resource"}${url ? `: ${url}` : ""}`,
          stack: null,
          source: url,
          line: null,
          column: null,
        })
      }
    },
    true
  )

  window.addEventListener("unhandledrejection", (event) => {
    capture(describeRejection(event.reason))
  })

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "game-ping") return

    const target = event.source ?? window.parent
    target?.postMessage({ type: "game-status", error: firstError }, "*")
  })
})()
