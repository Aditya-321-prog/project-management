export default function Logo() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-md">
        PM
      </div>

      <div>
        <h1 className="text-lg font-bold tracking-tight">
          ProjectCamp
        </h1>

        <p className="text-xs text-slate-500">
          Project Management
        </p>
      </div>
    </div>
  );
}