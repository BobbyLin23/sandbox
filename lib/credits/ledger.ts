import { eq, sum } from "drizzle-orm"

import { db } from "@/lib/db"
import { creditLedger, games } from "@/lib/db/schema"

// $1 of free credits every org starts with, implicit (never a ledger row).
export const FREE_CREDITS = 1_000_000_000

export const OUT_OF_CREDITS_MESSAGE =
  "You're out of credits. Builder adds $10.00 in credits every month — upgrade your plan in Billing to keep building."

export async function getCreditBalance(orgId: string) {
  const [row] = await db
    .select({ total: sum(creditLedger.amount) })
    .from(creditLedger)
    .where(eq(creditLedger.orgId, orgId))

  return FREE_CREDITS + Number(row?.total ?? 0)
}

// Charges one build step: a negative ledger row keyed by the step's response
// id, so the same step can never be charged twice.
export async function chargeStep(
  orgId: string,
  responseId: string,
  amount: number
) {
  await db
    .insert(creditLedger)
    .values({
      orgId,
      entryKey: `step:${responseId}`,
      amount: -amount,
    })
    .onConflictDoNothing()
}

// The worker has no auth(), so the game's org is resolved from the DB.
export async function getGameOrgId(gameId: string): Promise<string | null> {
  const [game] = await db
    .select({ orgId: games.orgId })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1)

  return game?.orgId ?? null
}
