import type { UIMessage } from "ai"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

const RETRY_DELAYS_MS = [150, 500, 1500]

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS_MS[attempt])
        )
      }
    }
  }

  throw lastError
}

export async function getGameMessages(gameId: string): Promise<UIMessage[]> {
  const [game] = await withRetry(() =>
    db
      .select({ messages: games.messages })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1)
  )

  return game?.messages ?? []
}

export async function updateGameMessages(
  gameId: string,
  messages: UIMessage[]
) {
  await withRetry(() =>
    db
      .update(games)
      .set({ messages, updatedAt: new Date() })
      .where(eq(games.id, gameId))
  )
}

/**
 * Pick the non-regressing stream cursor: keep the highest numeric
 * lastEventId so a partially-failed turn can't move it backwards
 * (which would cause full-stream replays with duplicated text).
 */
function pickLastEventId(
  existing: string | null,
  incoming: string | undefined
): string | null {
  if (!incoming) return existing
  if (!existing) return incoming

  const current = Number(existing)
  const next = Number(incoming)

  if (!Number.isNaN(current) && !Number.isNaN(next) && next < current) {
    return existing
  }

  return incoming
}

export async function persistGameState(
  gameId: string,
  data: {
    messages: UIMessage[]
    lastEventId?: string
    publicAccessToken?: string
  }
) {
  const [existing] = await withRetry(() =>
    db.select().from(games).where(eq(games.id, gameId)).limit(1)
  )

  if (!existing) {
    return
  }

  await withRetry(() =>
    db
      .update(games)
      .set({
        messages: data.messages,
        lastEventId: pickLastEventId(existing.lastEventId, data.lastEventId),
        publicAccessToken: data.publicAccessToken || existing.publicAccessToken,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId))
  )
}
