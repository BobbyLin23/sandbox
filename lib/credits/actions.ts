"use server"

import { auth as clerkAuth } from "@clerk/nextjs/server"

import { formatCredits } from "@/lib/credits/format"
import { FREE_CREDITS, getCreditBalance } from "@/lib/credits/ledger"

export async function getCreditsAction() {
  const { orgId } = await clerkAuth()

  if (!orgId) {
    return formatCredits(FREE_CREDITS)
  }

  return formatCredits(await getCreditBalance(orgId))
}
