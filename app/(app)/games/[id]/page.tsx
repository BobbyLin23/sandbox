import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await auth.protect()
  const { orgId } = await auth()
  const { id } = await params

  if (!id || !orgId) {
    return notFound()
  }

  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, id))
    .limit(1)

  if (!game || game.orgId !== orgId) {
    return notFound()
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <p>{game.id}</p>
    </div>
  )
}
