import {
  sqliteTable,
  integer,
  text,
} from "drizzle-orm/sqlite-core";

import { sql } from "drizzle-orm";

export const todos = sqliteTable("todos", {
  id: integer("id")
    .primaryKey({ autoIncrement: true }),

  title: text("title")
    .notNull(),

  completed: integer("completed", {
    mode: "boolean",
  })
    .notNull()
    .default(false),

  createdAt: integer("created_at", {
    mode: "timestamp",
  })
    .notNull()
    .default(sql`(unixepoch())`),
});

// TypeScript types inferred from the database schema

export type Todo = typeof todos.$inferSelect;

export type NewTodo = typeof todos.$inferInsert;