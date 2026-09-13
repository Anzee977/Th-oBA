import { isHealthDbEnabled, listTodoCategories, listTodos } from "@/lib/healthDb";
import TodoList from "@/components/TodoList";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  if (!isHealthDbEnabled()) {
    return (
      <div>
        <h1>Todo</h1>
        <p className="muted">
          La todo list nécessite la base de données (variables HEALTH_DB_* dans site/.env).
        </p>
      </div>
    );
  }

  const [todos, categories] = await Promise.all([listTodos(), listTodoCategories()]);

  return (
    <div>
      <h1>Todo</h1>
      <p className="muted">Tes tâches, avec échéance et catégorie optionnelles.</p>

      <div className="card" style={{ marginTop: 20 }}>
        <TodoList initialTodos={todos} initialCategories={categories} />
      </div>
    </div>
  );
}
