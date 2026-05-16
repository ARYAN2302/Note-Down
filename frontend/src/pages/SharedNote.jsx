import { LoaderCircle, LockOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { miscApi } from "../api";
import { TagBadge } from "../components/notes/TagBadge";

export default function SharedNote() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, note: null, error: "" });

  useEffect(() => {
    async function loadNote() {
      try {
        const note = await miscApi.sharedNote(token);
        setState({ loading: false, note, error: "" });
      } catch (error) {
        setState({ loading: false, note: null, error: error.response?.data?.detail || "Unable to open shared note" });
      }
    }
    loadNote();
  }, [token]);

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (state.error) {
    return <div className="flex min-h-screen items-center justify-center px-4 text-sm text-slate-500">{state.error}</div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <div className="panel p-6 sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <LockOpen className="h-4 w-4" />
          Shared note
        </div>
        <h1 className="text-3xl font-semibold text-slate-900">{state.note.title}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {state.note.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
        <article className="mt-8 whitespace-pre-wrap text-sm leading-8 text-slate-700">{state.note.content}</article>
      </div>
    </div>
  );
}
