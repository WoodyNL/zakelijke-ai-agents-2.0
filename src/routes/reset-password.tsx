import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { paginaMeta } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: paginaMeta({
      pad: "/reset-password",
      titel: "Nieuw wachtwoord — Zakelijke AI Agents",
      beschrijving: "Stel een nieuw wachtwoord in voor je account.",
      noindex: true,
    }),
  }),
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
  }

  return (
    <div className="surface-gradient flex min-h-screen items-center justify-center px-4 font-sans text-ink antialiased">
      <div className="card-glass-lg w-full max-w-sm animate-rise rounded-3xl p-6">
        <h1 className="font-display text-[20px] font-bold text-brand">Nieuw wachtwoord</h1>
        {done ? (
          <p className="mt-2 text-[13px] text-mint">Gelukt — je wordt doorgestuurd.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                Wachtwoord
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/60 bg-white/70 px-3.5 py-2.5 text-[13px] text-brand outline-none focus:border-indigo"
              />
            </label>
            {error && <p className="text-[12px] font-medium text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={busy || password.length < 8}
              className="w-full rounded-full bg-brand px-6 py-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Bezig…" : "Opslaan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
