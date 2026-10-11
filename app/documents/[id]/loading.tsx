import { Loader2 } from "lucide-react";

export default function DocumentLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Opening document...
        </p>
      </div>
    </div>
  );
}
