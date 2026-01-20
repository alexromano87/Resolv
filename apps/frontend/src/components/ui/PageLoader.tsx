export function PageLoader({ message = 'Caricamento...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-4 text-sm font-semibold">{message}</p>
      </div>
    </div>
  );
}
