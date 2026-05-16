import { LoaderCircle, Sparkles, Tags, TextQuote } from "lucide-react";

export function AIToolbar({
  disabled,
  loadingAction,
  result,
  onSummarise,
  onSuggestTags,
  onContinueWriting,
  onApplySuggestion
}) {
  const loading = (name) => loadingAction === name;

  return (
    <div className="rounded-2xl border border-line/70 bg-white/80 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSummarise} disabled={disabled || !!loadingAction} className="command-button">
          {loading("summarise") ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TextQuote className="h-4 w-4" />}
          <span>Summarise</span>
        </button>
        <button type="button" onClick={onSuggestTags} disabled={disabled || !!loadingAction} className="command-button">
          {loading("suggest-tags") ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" />}
          <span>Suggest tags</span>
        </button>
        <button type="button" onClick={onContinueWriting} disabled={disabled || !!loadingAction} className="command-button">
          {loading("continue") ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span>Continue writing</span>
        </button>
      </div>

      {result ? (
        <div className="mt-3 rounded-xl border border-line/70 bg-[#fffdf8] p-3.5">
          {result.type === "summary" ? <p className="text-sm leading-6 text-slate-700">{result.value}</p> : null}
          {result.type === "suggestions" ? (
            <div className="flex flex-wrap gap-2">
              {result.value.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onApplySuggestion(suggestion)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 hover:border-slate-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          {result.type === "message" ? <p className="text-sm text-slate-600">{result.value}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
