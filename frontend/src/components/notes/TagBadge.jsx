export function TagBadge({ tag, active = false, onClick, removable = false, onRemove }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
        active ? "border-slate-900/15 bg-white text-slate-900" : "border-transparent text-slate-700"
      }`}
      style={{ backgroundColor: `${tag.color}22` }}
    >
      <button type="button" onClick={onClick} className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
        <span>{tag.name}</span>
      </button>
      {removable ? (
        <button type="button" onClick={onRemove} className="text-slate-500 hover:text-slate-900">
          x
        </button>
      ) : null}
    </span>
  );
}
