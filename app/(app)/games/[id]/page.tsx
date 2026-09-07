import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { GameChat } from "@/components/game-chat"
import { GameMenu } from "@/components/game-menu"
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
    <div className="flex h-svh w-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h1 className="min-w-0 truncate text-sm font-semibold">{game.title}</h1>
        <GameMenu gameId={game.id} title={game.title} />
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <GameChat
          gameId={game.id}
          messages={game.messages.length > 0 ? game.messages : undefined}
          lastEventId={game.lastEventId ?? undefined}
          publicAccessToken={game.publicAccessToken ?? undefined}
          sandboxId={game.sandboxId ?? undefined}
          modelId={resolveGameModelId(game.modelId)}
        />
      </div>
    </div>
  )
}
