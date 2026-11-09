"use server";

import { getDb } from "@/db";

import { todos } from "@/db/schema";

import { desc } from "drizzle-orm";

// =====================================
// CREATE TODO
// =====================================

export async function createTodo(title: string) {
  try {
    const cleanTitle = title.trim();

    if (!cleanTitle || cleanTitle.length > 500) {
      return {
        success: false,
        message: "Todo title must contain 1–500 characters.",
      };
    }

    const db = getDb();

    const [newTodo] = await db
      .insert(todos)
      .values({
        title: cleanTitle,
      })
      .returning();

    if (!newTodo) {
      throw new Error("Todo creation returned no record.");
    }

    return {
      success: true,
      message: "Todo created successfully.",
      item: {
        id: newTodo.id,
        title: newTodo.title,
        completed: newTodo.completed,
        createdAt: newTodo.createdAt.toISOString(),
      },
    };

  } catch (error) {
    console.error("CREATE TODO ERROR:", error);

    return {
      success: false,
      message: "Failed to create todo.",
    };
  }
}

// =====================================
// GET ALL TODOS
// =====================================

export async function getTodos() {
  try {
    const db = getDb();

    const result = await db
      .select()
      .from(todos)
      .orderBy(desc(todos.id));

    return {
      success: true,
      items: result.map((todo) => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        createdAt: todo.createdAt.toISOString(),
      })),
    };

  } catch (error) {
    console.error("GET TODOS ERROR:", error);

    return {
      success: false,
      message: "Failed to retrieve todos.",
      items: [],
    };
  }
}