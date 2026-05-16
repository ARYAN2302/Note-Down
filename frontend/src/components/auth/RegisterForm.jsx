import { LoaderCircle, UserPlus } from "lucide-react";
import { useState } from "react";

export function RegisterForm({ onSubmit, busy, error, success }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ email, password });
      }}
      className="w-full max-w-md rounded-[24px] border border-line/80 bg-paper p-7 shadow-panel"
    >
      <div className="text-2xl font-semibold tracking-tight text-slate-900">Create your account</div>
      <div className="mt-2 text-sm text-slate-500">Password needs at least 8 characters and one digit.</div>
      <div className="mt-6 space-y-4">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-line/80 bg-white/90 px-3 py-3 text-sm"
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-line/80 bg-white/90 px-3 py-3 text-sm"
          placeholder="Password"
        />
      </div>
      {error ? <div className="mt-4 rounded-md bg-roseSoft px-3 py-2 text-sm text-rose-900">{error}</div> : null}
      {success ? <div className="mt-4 rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-900">{success}</div> : null}
      <button type="submit" disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        <span>Register</span>
      </button>
    </form>
  );
}
