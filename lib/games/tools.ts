import { dirname, resolve } from "node:path"
import type { Sandbox } from "@daytona/sdk"
import { tool } from "ai"
import { z } from "zod"

import { GAME_INDEX_PATH, getGameSandbox } from "@/lib/daytona/utils"

const READ_FILE_MAX_CHARS = 100_000

// Tool paths are relative to the game directory. Resolve and reject anything
// that escapes it (e.g. "../" traversal or absolute paths outside the game).
function resolveGamePath(path: string): string {
  const resolved = resolve(GAME_INDEX_PATH, path)

  if (
    resolved !== GAME_INDEX_PATH &&
    !resolved.startsWith(`${GAME_INDEX_PATH}/`)
  ) {
    throw new Error(
      `Path must stay inside the game directory (${GAME_INDEX_PATH}): ${path}`
    )
  }

  return resolved
}

function displayPath(resolved: string): string {
  return resolved.slice(GAME_INDEX_PATH.length + 1) || "."
}

async function withGameSandbox<T>(
  gameId: string,
  operation: (sandbox: Sandbox) => Promise<T>
): Promise<T> {
  const sandbox = await getGameSandbox(gameId)
  return operation(sandbox)
}

export function createGameTools(gameId: string) {
  return {
    ask_player: tool({
      description:
        "Ask the player a question about the game you are building and wait for their answer. First pick which aspect of the game the question is about, then write one clear question with 2-4 concrete options to choose from. The player's answer will arrive as the tool result.",
      inputSchema: z.object({
        dimension: z
          .enum([
            "loop",
            "goal",
            "world",
            "look",
            "feel",
            "controls",
            "sound",
            "scope",
          ])
          .describe(
            "The part of the game the question is about: 'loop' (core gameplay loop), 'goal' (winning/losing/objectives), 'world' (setting, story, theme), 'look' (visual style and art direction), 'feel' (mood, tone, pacing), 'controls' (input and interaction), 'sound' (music and audio), 'scope' (size and complexity)."
          ),
        question: z
          .string()
          .describe("A single, specific question for the player."),
        options: z
          .array(
            z.object({
              id: z
                .string()
                .describe("Short unique identifier, e.g. 'top-down'"),
              label: z
                .string()
                .describe("Short label shown to the player, e.g. 'Top-down'"),
              description: z
                .string()
                .describe("One sentence explaining what this option means."),
            })
          )
          .min(2)
          .max(4)
          .describe("2-4 options for the player to choose from."),
      }),
      outputSchema: z.object({
        optionId: z.string().describe("The id of the option the player chose."),
        optionLabel: z
          .string()
          .describe("The label of the option the player chose."),
      }),
    }),

    write_file: tool({
      description:
        "Write a file inside the game directory (/home/daytona/game). Creates parent folders as needed and overwrites the file if it already exists.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "File path relative to the game directory, e.g. 'index.html' or 'assets/style.css'"
          ),
        content: z.string().describe("Full file content to write (UTF-8 text)"),
      }),
      execute: async ({ path, content }) =>
        withGameSandbox(gameId, async (sandbox) => {
          const target = resolveGamePath(path)
          const folder = dirname(target)

          try {
            await sandbox.fs.createFolder(folder, "755")
          } catch {
            // The folder already exists.
          }

          await sandbox.fs.uploadFile(Buffer.from(content, "utf8"), target)

          return `Wrote ${displayPath(target)} (${Buffer.byteLength(content, "utf8")} bytes).`
        }),
    }),

    replace_text: tool({
      description:
        "Replace text in a file inside the game directory. The file must already exist and contain the exact text to replace. All occurrences are replaced.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "File path relative to the game directory, e.g. 'index.html'"
          ),
        oldText: z
          .string()
          .describe("Exact text to replace (must match existing content)"),
        newText: z.string().describe("Replacement text"),
      }),
      execute: async ({ path, oldText, newText }) =>
        withGameSandbox(gameId, async (sandbox) => {
          const target = resolveGamePath(path)
          const current = (await sandbox.fs.downloadFile(target)).toString(
            "utf8"
          )

          const occurrences = current.split(oldText).length - 1

          if (occurrences === 0) {
            throw new Error(
              `The text to replace was not found in ${displayPath(target)}. Read the file first and use the exact existing text.`
            )
          }

          await sandbox.fs.uploadFile(
            Buffer.from(current.replaceAll(oldText, newText), "utf8"),
            target
          )

          return `Replaced ${occurrences} occurrence(s) in ${displayPath(target)}.`
        }),
    }),

    read_file: tool({
      description:
        "Read the contents of a file inside the game directory (/home/daytona/game).",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "File path relative to the game directory, e.g. 'index.html'"
          ),
      }),
      execute: async ({ path }) =>
        withGameSandbox(gameId, async (sandbox) => {
          const target = resolveGamePath(path)
          const content = (await sandbox.fs.downloadFile(target)).toString(
            "utf8"
          )

          if (content.length > READ_FILE_MAX_CHARS) {
            return `${content.slice(0, READ_FILE_MAX_CHARS)}\n\n[Truncated: file is ${content.length} characters, showing the first ${READ_FILE_MAX_CHARS}.]`
          }

          return content
        }),
    }),

    list_files: tool({
      description:
        "List files and folders inside the game directory (/home/daytona/game).",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe(
            "Directory path relative to the game directory. Defaults to the game directory root."
          ),
        depth: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe("How many levels deep to list. Defaults to 2."),
      }),
      execute: async ({ path, depth }) =>
        withGameSandbox(gameId, async (sandbox) => {
          const target = path ? resolveGamePath(path) : GAME_INDEX_PATH
          const files = await sandbox.fs.listFiles(target, {
            depth: depth ?? 2,
          })

          if (files.length === 0) {
            return "No files yet."
          }

          return files
            .map(
              (file) =>
                `${file.path ?? file.name}${file.isDir ? "/" : ""} (${file.size} bytes)`
            )
            .join("\n")
        }),
    }),
  }
}

export type GameTools = ReturnType<typeof createGameTools>
