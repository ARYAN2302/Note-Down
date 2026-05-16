import { Copy, Globe, LoaderCircle, Trash2, Users, X } from "lucide-react";
import { useState } from "react";

export function ShareModal({
  open,
  shares,
  publicLink,
  busy,
  onClose,
  onSubmitShare,
  onRevokeShare,
  onEnablePublicLink,
  onDisablePublicLink
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/20 p-4 backdrop-blur-sm">
      <div className="mx-auto mt-10 max-w-2xl rounded-[22px] border border-line/80 bg-paper p-5 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Share note</div>
            <div className="text-xs text-slate-500">Invite collaborators or enable a public link.</div>
          </div>
          <button type="button" onClick={onClose} className="icon-button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                type="button"
                onClick={async () => {
                  await onSubmitShare({ share_with_email: email, role });
                  setEmail("");
                  setRole("viewer");
                }}
                disabled={!email || busy}
                className="command-button justify-center"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                <span>Invite</span>
              </button>
            </div>

            <div className="rounded-2xl border border-line/70 bg-[#faf7f0] p-3">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">People with access</div>
              <div className="space-y-2">
                {shares.length ? (
                  shares.map((share) => (
                    <div key={`${share.email}-${share.role}`} className="flex items-center justify-between rounded-xl border border-line/70 bg-white px-3 py-2">
                      <div>
                        <div className="text-sm text-slate-800">{share.email}</div>
                        <div className="text-xs text-slate-500">{share.role}</div>
                      </div>
                      <button type="button" onClick={() => onRevokeShare(share)} className="icon-button">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No collaborators yet.</div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-line/70 bg-[#faf7f0] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Anyone with the link</div>
                <div className="text-xs text-slate-500">Read-only public access.</div>
              </div>
              <button
                type="button"
                onClick={() => (publicLink ? onDisablePublicLink() : onEnablePublicLink())}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${publicLink ? "bg-slate-900" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${publicLink ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-line bg-white p-3">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Globe className="h-4 w-4" />
                Public link
              </div>
              {publicLink ? (
                <div className="space-y-3">
                  <div className="break-all rounded-md bg-slate-50 p-2 text-sm text-slate-700">{publicLink.url}</div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(publicLink.url)}
                    className="command-button"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy link</span>
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Enable the toggle to generate a shareable URL.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
