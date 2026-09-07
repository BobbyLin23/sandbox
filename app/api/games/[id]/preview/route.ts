import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

import { startGameServer } from "@/lib/daytona/utils"
import { getGame } from "@/lib/games/queries"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const game = await getGame(id)

  if (!game) {
    return new NextResponse("Game not found", { status: 404 })
  }

  const { url, token } = await startGameServer(id)

  const upstream = await fetch(url, {
    headers: {
      "x-daytona-preview-token": token,
      "X-Daytona-Skip-Preview-Warning": "true",
    },
  })

  if (!upstream.ok) {
    Sentry.logger.error("Game preview upstream failed", {
      "game.id": id,
      "preview.status": upstream.status,
    })
    return new NextResponse(`Upstream preview error: ${upstream.status}`, {
      status: 502,
    })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/html",
      "Cache-Control": "no-store",
    },
  })
}
