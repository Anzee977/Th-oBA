"use client";

import { useState } from "react";
import { CheckIcon, PlusIcon, TrashIcon } from "./icons";

type Todo = {
  id: number;
  text: string;
  category: string | null;
  dueDate: string | null;
  done: boolean;
  createdAt: string;
};

function formatDueDate(dueDate: string): string {
  const date = new Date(`${dueDate}T12:00:00`);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function isOverdue(dueDate: string | null, done: boolean): boolean {
  if (!dueDate || done) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dueDate}T00:00:00`) < today;
}

export default function TodoList({
  initialTodos,
  initialCategories,
}: {
  initialTodos: Todo[];
  initialCategories: string[];
}) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [categories] = useState<string[]>(initialCategories);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  async function refresh() {
    const res = await fetch("/api/todo");
    const data = await res.json().catch(() => ({}));
    if (data.todos) setTodos(data.todos);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category: category || null, dueDate: dueDate || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Échec.");
      }
      setText("");
      setCategory("");
      setDueDate("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function toggle(id: number, done: boolean) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    try {
      await fetch(`/api/todo/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
    } catch {
      // best-effort ; un refresh manuel corrigera l'état si l'appel a échoué
    }
  }

  async function remove(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/todo/${id}`, { method: "DELETE" });
    } catch {
      // idem
    }
  }

  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <div>
      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          placeholder="Nouvelle tâche"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="todo-form-text"
        />
        <input
          type="text"
          placeholder="Catégorie"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          list="todo-categories"
          className="todo-form-category"
        />
        <datalist id="todo-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="todo-form-date"
        />
        <button type="submit" className="btn" disabled={loading || !text.trim()}>
          <PlusIcon size={14} /> Ajouter
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {pending.length === 0 && done.length === 0 && (
        <p className="muted" style={{ marginTop: 16 }}>
          Aucune tâche. Ajoute la première ci-dessus.
        </p>
      )}

      <ul className="todo-items">
        {pending.map((t) => (
          <li key={t.id} className="todo-item">
            <button
              type="button"
              className="todo-check"
              aria-label="Marquer comme fait"
              onClick={() => toggle(t.id, true)}
            >
              <span className="todo-check-box" />
            </button>
            <div className="todo-item-main">
              <span>{t.text}</span>
              <div className="todo-item-meta">
                {t.category && <span className="badge">{t.category}</span>}
                {t.dueDate && (
                  <span className={isOverdue(t.dueDate, t.done) ? "error" : "muted"}>
                    {formatDueDate(t.dueDate)}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="icon-btn danger"
              aria-label="Supprimer"
              onClick={() => remove(t.id)}
            >
              <TrashIcon size={15} />
            </button>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button type="button" className="link-btn" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "Masquer" : `Voir les tâches terminées (${done.length})`}
          </button>

          {showDone && (
            <ul className="todo-items" style={{ marginTop: 10 }}>
              {done.map((t) => (
                <li key={t.id} className="todo-item done">
                  <button
                    type="button"
                    className="todo-check checked"
                    aria-label="Marquer comme non fait"
                    onClick={() => toggle(t.id, false)}
                  >
                    <span className="todo-check-box">
                      <CheckIcon size={12} />
                    </span>
                  </button>
                  <div className="todo-item-main">
                    <span className="todo-text-done">{t.text}</span>
                    <div className="todo-item-meta">
                      {t.category && <span className="badge">{t.category}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="Supprimer"
                    onClick={() => remove(t.id)}
                  >
                    <TrashIcon size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
