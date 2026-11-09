"use client";

import { useState } from "react";

import {
  createTodo,
  getTodos,
} from "./actions";

type TodoItem = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

export default function TodoClient() {
  const [title, setTitle] = useState("");

  const [items, setItems] = useState<TodoItem[]>([]);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  // =====================================
  // CREATE TODO BUTTON
  // =====================================

  async function handleCreateTodo() {
    if (!title.trim()) {
      setMessage("Please enter a todo title.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await createTodo(title);

      if (result.success) {
        setMessage(result.message);
        setTitle("");
      } else {
        setMessage(result.message);
      }

    } catch {
      setMessage("Something went wrong while creating the todo.");
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // RETRIEVE TODOS BUTTON
  // =====================================

  async function handleGetTodos() {
    setLoading(true);
    setMessage("");

    try {
      const result = await getTodos();

      if (result.success) {
        setItems(result.items);
        setMessage(
          `Successfully retrieved ${result.items.length} todos.`
        );
      } else {
        setMessage(result.message);
      }

    } catch {
      setMessage("Something went wrong while retrieving todos.");
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // UI
  // =====================================

  return (
    <div className="mx-auto max-w-2xl p-6">

      <h1 className="mb-2 text-3xl font-bold">
        Cloudflare D1 Todo Test
      </h1>

      <p className="mb-8 text-gray-500">
        Next.js + Drizzle ORM + Cloudflare D1
      </p>

      {/* CREATE TODO */}

      <div className="mb-6 rounded-xl border p-5">

        <h2 className="mb-4 text-xl font-semibold">
          Create Todo
        </h2>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter your todo..."
          maxLength={500}
          className="mb-4 w-full rounded-lg border px-4 py-3 text-black"
          disabled={loading}
        />

        <button
          type="button"
          onClick={handleCreateTodo}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Create Todo"}
        </button>

      </div>

      {/* RETRIEVE TODOS */}

      <div className="mb-6 rounded-xl border p-5">

        <h2 className="mb-4 text-xl font-semibold">
          Retrieve Todos
        </h2>

        <button
          type="button"
          onClick={handleGetTodos}
          disabled={loading}
          className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Retrieve Todos"}
        </button>

      </div>

      {/* STATUS MESSAGE */}

      {message && (
        <div className="mb-5 rounded-lg bg-gray-100 p-4 text-gray-800">
          {message}
        </div>
      )}

      {/* TODO LIST */}

      <div className="space-y-3">

        {items.map((todo) => (
          <div
            key={todo.id}
            className="rounded-lg border p-4"
          >
            <div className="font-semibold">
              {todo.title}
            </div>

            <div className="mt-2 text-sm text-gray-500">
              ID: {todo.id}
            </div>

            <div className="text-sm text-gray-500">
              Completed: {todo.completed ? "Yes" : "No"}
            </div>

            <div className="text-sm text-gray-500">
              Created: {new Date(todo.createdAt).toLocaleString()}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <p className="py-5 text-center text-gray-500">
            No todos loaded. Click Retrieve Todos.
          </p>
        )}

      </div>

    </div>
  );
}