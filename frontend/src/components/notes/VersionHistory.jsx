import { LoaderCircle, RotateCcw, X } from "lucide-react";
import { useMemo } from "react";

function tokenize(text) {
  return (text || "").split(/(\s+)/).filter(Boolean);
}

function buildDiff(previousText, currentText) {
  const a = tokenize(previousText);
  const b = tokenize(currentText);
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      matrix[i][j] = a[i - 1] === b[j - 1] ? matrix[i - 1][j - 1] + 1 : Math.max(matrix[i - 1][j], matrix[i][j - 1]);
    }
  }

  const parts = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      parts.unshift({ value: a[i - 1], type: "same" });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      parts.unshift({ value: b[j - 1], type: "added" });
      j -= 1;
    } else if (i > 0) {
      parts.unshift({ value: a[i - 1], type: "removed" });
      i -= 1;
    }
  }

  return parts;
}

function relativeTime(value) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function VersionHistory({
  open,
  versions,
  selectedVersion,
  currentContent,
  loading,
  restoring,
  onClose,
  onSelectVersion,
  onRestore
}) {
  const diff = useMemo(() => {
    if (!selectedVersion) return [];
    return buildDiff(selectedVersion.content, currentContent);
  }, [selectedVersion, currentContent]);

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 w-full max-w-xl transform border-l border-line/80 bg-paper shadow-panel transition ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Version history</div>
            <div className="text-xs text-slate-500">Browse and restore previous saves.</div>
          </div>
          <button type="button" onClick={onClose} className="icon-button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]">
          <div className="overflow-y-auto border-r border-line/70 bg-[#faf7f0] p-4">
            <div className="space-y-2">
              {versions.map((version) => (
                <button
                  key={version.version_num}
                  type="button"
                  onClick={() => onSelectVersion(version.version_num)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    selectedVersion?.version_num === version.version_num
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                    <div className="text-sm font-semibold">v{version.version_num}</div>
                  <div className={`mt-1 text-xs ${selectedVersion?.version_num === version.version_num ? "text-slate-300" : "text-slate-500"}`}>
                    {relativeTime(version.created_at)}
                  </div>
                  <div className={`mt-2 line-clamp-2 text-xs ${selectedVersion?.version_num === version.version_num ? "text-slate-300" : "text-slate-600"}`}>
                    {version.preview}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto p-5">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                <LoaderCircle className="h-5 w-5 animate-spin" />
              </div>
            ) : selectedVersion ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{selectedVersion.title}</div>
                    <div className="text-xs text-slate-500">v{selectedVersion.version_num}</div>
                  </div>
                  <button type="button" onClick={onRestore} disabled={restoring} className="command-button">
                    {restoring ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    <span>Restore this version</span>
                  </button>
                </div>
                <div className="rounded-2xl border border-line/70 bg-[#fffdf8] p-4 text-sm leading-7 text-slate-700">
                  {diff.map((part, index) => (
                    <span
                      key={`${part.type}-${index}`}
                      className={
                        part.type === "added"
                          ? "rounded bg-emerald-100 px-0.5 text-emerald-900"
                          : part.type === "removed"
                            ? "rounded bg-rose-100 px-0.5 text-rose-900 line-through"
                            : ""
                      }
                    >
                      {part.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Pick a version to compare it with the current note.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
