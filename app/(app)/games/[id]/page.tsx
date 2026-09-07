import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { GameChat } from "@/components/game-chat"
import { resolveGameModelId } from "@/lib/games/model-catalog"
import { getGame } from "@/lib/games/queries"

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await auth.protect()
  const { id } = await params

  if (!id) {
    return notFound()
  }

  const game = await getGame(id)

  if (!game) {
    return notFound()
  }

  return (
    <div className="flex h-svh w-full flex-col py-4">
      <GameChat
        gameId={game.id}
        messages={game.messages.length > 0 ? game.messages : undefined}
        lastEventId={game.lastEventId ?? undefined}
        publicAccessToken={game.publicAccessToken ?? undefined}
        sandboxId={game.sandboxId ?? undefined}
        modelId={resolveGameModelId(game.modelId)}
      />
    </div>
  )
}
