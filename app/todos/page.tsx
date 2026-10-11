import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function TodosPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from("todos").select();

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4 font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Supabase Connection Test (Todos)
        </h1>
        <Link
          href="/"
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to DocSpace
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <p className="font-semibold">Notice from Supabase:</p>
          <p>{error.message}</p>
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            (If the <code>todos</code> table has not been created yet in Supabase, this is expected. Your <code>documents</code> and <code>document_shares</code> tables are ready.)
          </p>
        </div>
      ) : null}

      <ul className="space-y-2">
        {todos && todos.length > 0 ? (
          todos.map((todo: { id: string | number; name?: string; title?: string }) => (
            <li
              key={todo.id}
              className="rounded-md border border-zinc-200 p-2.5 text-sm dark:border-zinc-800"
            >
              {todo.name || todo.title || JSON.stringify(todo)}
            </li>
          ))
        ) : (
          <li className="text-xs text-zinc-500 italic">
            No todos found in Supabase <code>todos</code> table.
          </li>
        )}
      </ul>
    </div>
  );
}
