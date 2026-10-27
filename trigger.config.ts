import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin"
import { esbuildPlugin } from "@trigger.dev/build/extensions"
import { additionalFiles } from "@trigger.dev/build/extensions/core"
import { defineConfig } from "@trigger.dev/sdk"

export default defineConfig({
  project: "proj_tfdwnrvriqgwqbsqbaon",
  runtime: "node-24",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["trigger"],
  build: {
    // @daytona/sdk loads these through runtime `require()` calls that esbuild
    // can't see, so they aren't bundled into the worker. Without them
    // sandbox.fs.uploadFile/downloadFile throw "Module ... is not available".
    external: ["form-data", "busboy"],
    // runtime/* is not imported anywhere; copy it into the build so tasks can seed sandboxes from it.
    extensions: [
      additionalFiles({ files: ["lib/games/runtime/**"] }),
      esbuildPlugin(
        sentryEsbuildPlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
        }),
        { placement: "last", target: "deploy" }
      ),
    ],
  },
})
