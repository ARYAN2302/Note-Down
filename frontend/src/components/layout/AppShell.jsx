import { LogOut } from "lucide-react";

export function AppShell({ user, onLogout, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-cloud">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-cloud/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-3 sm:px-8">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-900">Notes</div>
            <div className="text-xs text-slate-500">{user?.email || "Signed in"}</div>
          </div>
          <button type="button" onClick={onLogout} className="command-button">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col px-5 py-5 sm:px-8">{children}</main>
    </div>
  );
}
