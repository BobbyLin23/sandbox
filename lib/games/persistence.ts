import type {
  TranscriptLoadOptions,
  TranscriptLoadResult,
  TranscriptScope,
  TranscriptStorage,
} from "@trigger.dev/sdk/ai"
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

type GameClientData = {
  modelId?: string
  orgId?: string
}

/**
 * Pick the non-regressing stream cursor: keep the highest numeric event id so
 * a partially-failed turn can't move it backwards (which would cause
 * full-stream replays with duplicated text). A `save` that carries no cursor
 * leaves the stored one alone.
 */
function pickEventId(
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

/**
 * The conversation as a document on the game row.
 *
 * The Trigger.dev runtime owns the transcript and calls this storage at its
 * durable boundaries: `load` when a continuation run boots, `save` after every
 * change (turn start, turn complete, failure, compaction, recovery). Storing
 * the runtime's own `state` and cursors means crash recovery and durable
 * compaction work without any extra bookkeeping here.
 */
export const gameTranscriptStorage: TranscriptStorage<GameClientData> = {
  async load<TUIMessage extends UIMessage = UIMessage>(
    { chatId }: TranscriptScope<GameClientData>,
    opts?: TranscriptLoadOptions
  ): Promise<TranscriptLoadResult<TUIMessage>> {
    const [game] = await withRetry(() =>
      db
        .select({
          messages: games.messages,
          state: games.transcriptState,
          nonFinalIds: games.nonFinalMessageIds,
          lastEventId: games.lastEventId,
          lastInEventId: games.lastInEventId,
        })
        .from(games)
        .where(eq(games.id, chatId))
        .limit(1)
    )

    if (!game) {
      return { messages: [], state: null }
    }

    const all = game.messages
    const cursors = {
      lastOutEventId: game.lastEventId ?? undefined,
      lastInEventId: game.lastInEventId ?? undefined,
    }

    // `before` is a message id from a previous page's `nextCursor`; the page
    // stops just before it. An unknown anchor means there is no earlier page.
    let end = all.length
    if (opts?.before) {
      const anchor = all.findIndex((message) => message.id === opts.before)
      if (anchor === -1) {
        return { messages: [], state: null, cursors }
      }
      end = anchor
    }

    const start = opts?.limit ? Math.max(0, end - opts.limit) : 0
    const messages = all.slice(start, end)
    const nonFinalIds = new Set(game.nonFinalIds)
    const page = messages.filter((message) => nonFinalIds.has(message.id))

    return {
      messages: messages as TUIMessage[],
      state: game.state ?? null,
      cursors,
      ...(start > 0 ? { nextCursor: messages[0]?.id } : {}),
      ...(page.length > 0
        ? { nonFinalIds: page.map((message) => message.id) }
        : {}),
    }
  },

  async save({ chatId }, changeset) {
    const messages = changeset.transcript.entries.map((entry) => entry.message)
    const nonFinalMessageIds = changeset.transcript.entries
      .filter((entry) => !entry.final)
      .map((entry) => entry.id)
    const { lastOutEventId, lastInEventId } = changeset.cursors ?? {}

    await withRetry(async () => {
      const [game] = await db
        .select({
          lastEventId: games.lastEventId,
          lastInEventId: games.lastInEventId,
        })
        .from(games)
        .where(eq(games.id, chatId))
        .limit(1)

      // The game row is deleted with the game; a save that lands after that
      // has nowhere to go and nothing to recover.
      if (!game) {
        return
      }

      await db
        .update(games)
        .set({
          messages,
          transcriptState: changeset.transcript.state,
          nonFinalMessageIds,
          lastEventId: pickEventId(game.lastEventId, lastOutEventId),
          lastInEventId: pickEventId(game.lastInEventId, lastInEventId),
          updatedAt: new Date(),
        })
        .where(eq(games.id, chatId))
    })
  },
}

export async function persistGameAccessToken(
  gameId: string,
  publicAccessToken: string
) {
  await withRetry(() =>
    db
      .update(games)
      .set({ publicAccessToken, updatedAt: new Date() })
      .where(eq(games.id, gameId))
  )
}
