// Lazy-loaded page aane tak ka loader
export default function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="h-10 w-10 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading...
        </p>
      </div>
    </div>
  );
}
