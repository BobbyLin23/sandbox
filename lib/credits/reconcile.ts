import { clerkClient } from "@clerk/nextjs/server"
import { getCreditBalance } from "@/lib/credits/ledger"
import { db } from "@/lib/db"
import { creditLedger } from "@/lib/db/schema"

// $10 of credits per paid month, in billionths of a dollar.
const CREDITS_PER_MONTH = 10_000_000_000

const MONTHS_PER_PERIOD = {
  month: 1,
  annual: 12,
} as const

const PAID_ITEM_STATUSES = new Set(["active", "canceled", "ended"])

// Grants +$10 of credits per month the org has paid for. Each granted month
// gets a stable entry_key, so the unique (org_id, entry_key) constraint makes
// reconciliation idempotent — the same month is never granted twice.
export async function reconcileOrgCredits(orgId: string) {
  const client = await clerkClient()
  const subscription =
    await client.billing.getOrganizationBillingSubscription(orgId)

  const rows = subscription.subscriptionItems
    .filter(
      (item) =>
        PAID_ITEM_STATUSES.has(item.status) &&
        item.planPeriod &&
        item.periodStart != null
    )
    .flatMap((item) => {
      const months = MONTHS_PER_PERIOD[item.planPeriod]
      return Array.from({ length: months }, (_, monthIndex) => ({
        orgId,
        entryKey: `sub:${item.id}:${item.periodStart}:${monthIndex}`,
        amount: CREDITS_PER_MONTH,
      }))
    })

  if (rows.length === 0) {
    return
  }

  await db.insert(creditLedger).values(rows).onConflictDoNothing()
}

// True when the org can still build. If the balance is empty, sync the
// subscription once first — a month may have renewed.
export async function ensureOrgCredits(orgId: string): Promise<boolean> {
  if ((await getCreditBalance(orgId)) > 0) {
    return true
  }

  await reconcileOrgCredits(orgId)

  return (await getCreditBalance(orgId)) > 0
}
