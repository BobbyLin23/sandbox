"use client"

import { EllipsisIcon, PenLineIcon, Trash2Icon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SidebarMenuAction } from "@/components/ui/sidebar"
import { deleteGame, renameGame } from "@/lib/games/actions"

export function GameMenu({
  gameId,
  title,
  variant = "header",
  align = "end",
}: {
  gameId: string
  title: string
  variant?: "header" | "sidebar" | "compact"
  align?: "start" | "end"
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(title)
  const [error, setError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (renameOpen) {
      setName(title)
      setError(null)
    }
  }, [renameOpen, title])

  useEffect(() => {
    if (deleteOpen) {
      setError(null)
    }
  }, [deleteOpen])

  const handleRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsRenaming(true)
    setError(null)

    const result = await renameGame(gameId, name)

    setIsRenaming(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setRenameOpen(false)
    router.refresh()
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    const result = await deleteGame(gameId)

    setIsDeleting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setDeleteOpen(false)

    if (pathname === `/games/${gameId}`) {
      router.push("/")
    }

    router.refresh()
  }

  const menuItemProps = {
    closeOnClick: true,
    onClick: () => setRenameOpen(true),
  }

  return (
    <>
      <DropdownMenu>
        {variant === "sidebar" ? (
          <DropdownMenuTrigger
            render={<SidebarMenuAction showOnHover />}
            data-slot="game-menu-trigger"
          >
            <EllipsisIcon />
            <span className="sr-only">Game options</span>
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size={variant === "compact" ? "icon-xs" : "icon-sm"}
              />
            }
            data-slot="game-menu-trigger"
          >
            <EllipsisIcon />
            <span className="sr-only">Game options</span>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align={align} className="min-w-36">
          <DropdownMenuItem {...menuItemProps}>
            <PenLineIcon />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            closeOnClick
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            Trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename game</DialogTitle>
            <DialogDescription>
              Choose a new name for this game.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename} className="flex flex-col gap-4">
            <Input
              name="title"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Game title"
              maxLength={100}
              required
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isRenaming || !name.trim()}>
                {isRenaming ? "Renaming…" : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the game, its chat history, and its
              sandbox. This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting…" : "Delete game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
