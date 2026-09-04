"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

export async function createGame(title: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("You must be in an organization to create a game.")
  }

  const [game] = await db.insert(games).values({ orgId, title }).returning()

  revalidatePath("/")

  return game
}
