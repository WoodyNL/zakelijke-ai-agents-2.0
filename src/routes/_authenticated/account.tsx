import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getMe } from "@/lib/dashboard.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Beheer je account en wijzig je wachtwoord." },
      { property: "og:title", content: "Account — Zakelijke AI Agents klantportaal" },
      { property: "og:description", content: "Beheer je account en wijzig je wachtwoord." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

const inputClass =
  "mt-1.5 w-full rounded-xl border border-white/60 bg-white/70 px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-indigo/50 focus:ring-2 focus:ring-indigo/35";

function AccountPage() {
  const me = useServerFn(getMe);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me() });

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (next.length < 8) {
      setError("Kies een nieuw wachtwoord van minimaal 8 tekens.");
      return;
    }
    if (next !== repeat) {
      setError("De twee nieuwe wachtwoorden zijn niet gelijk.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
        current_password: current,
      } as Parameters<typeof supabase.auth.updateUser>[0]);
      if (updateError) throw updateError;
      setInfo("Je wachtwoord is gewijzigd. Gebruik het vanaf nu bij het inloggen.");
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      isAdmin={meQuery.data?.isAdmin}
      userName={meQuery.data?.name || meQuery.data?.email}
    >
      <div className="animate-rise">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-brand">Account</h1>
        <p className="mt-1.5 text-[13px] text-ink/55">
          {meQuery.data?.email ? `Ingelogd als ${meQuery.data.email}.` : "Je accountinstellingen."}
        </p>
      </div>

      <div className="card-glass-lg mt-6 max-w-md rounded-3xl p-6">
        <h2 className="font-display text-[16px] font-semibold text-brand">Wachtwoord wijzigen</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-3.5">
          <label className="block text-[12px] font-medium text-ink/70">
            Huidig wachtwoord
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </label>
          <label className="block text-[12px] font-medium text-ink/70">
            Nieuw wachtwoord
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <label className="block text-[12px] font-medium text-ink/70">
            Herhaal nieuw wachtwoord
            <input
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </label>

          {error && <p className="text-[12px] text-destructive">{error}</p>}
          {info && <p className="text-[12px] text-brand">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
            style={{ boxShadow: "0 12px 26px -12px oklch(0.2 0.04 285 / 0.8)" }}
          >
            {busy ? "Bezig…" : "Wachtwoord opslaan"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
