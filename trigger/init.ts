import * as Sentry from "@sentry/node"
import { tasks } from "@trigger.dev/sdk"

Sentry.init({
  defaultIntegrations: false,
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.NODE_ENV === "production" ? "production" : "development",
})

tasks.onFailure(({ payload, error, ctx }) => {
  Sentry.captureException(error, {
    extra: {
      payload,
      ctx,
    },
  })
})
