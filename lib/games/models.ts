// Server-only: imported by trigger/chat.ts and other server code. Never import
// from client components — the provider instances aren't client-safe and the
// "server-only" alias isn't available in the Trigger.dev esbuild build.
import { deepSeek } from "@ai-sdk/deepseek"

import type { GameModelId } from "@/lib/games/model-catalog"

export const gameModelProviders: Record<
  GameModelId,
  ReturnType<typeof deepSeek>
> = {
  "deepseek-v4-flash": deepSeek("deepseek-v4-flash"),
  "deepseek-v4-pro": deepSeek("deepseek-v4-pro"),
  "deepseek-v4-flash-vision-exp": deepSeek("deepseek-v4-flash-vision-exp"),
}
