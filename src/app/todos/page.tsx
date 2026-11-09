import TodoClient from "./todo-client";

export const dynamic = "force-dynamic";

export default function TodosPage() {
  return (
    <main className="min-h-screen bg-white py-10 text-gray-900">
      <TodoClient />
    </main>
  );
}