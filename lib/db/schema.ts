import type { UIMessage } from "ai"
import { sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id").notNull(),
    title: text("title").notNull(),
    messages: jsonb("messages")
      .$type<UIMessage[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    lastEventId: text("last_event_id"),
    publicAccessToken: text("public_access_token"),
    sandboxId: text("sandbox_id"),
    modelId: text("model_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("games_org_id_idx").on(table.orgId)]
)

export type Game = typeof games.$inferSelect
export type NewGame = typeof games.$inferInsert
