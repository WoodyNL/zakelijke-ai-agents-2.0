import { BrandLogo } from "@/components/brand-logo";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { startpagina } from "@/lib/startpagina";
import { supabase } from "@/lib/supabase-browser";
import { paginaMeta } from "@/lib/seo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: paginaMeta({
      pad: "/auth",
      titel: "Inloggen — Zakelijke AI Agents klantportaal",
      beschrijving:
        "Log in op het Zakelijke AI Agents klantportaal en bekijk de prestaties van je AI-agents.",
      ogBeschrijving: "Log in en bekijk live status en resultaten van je AI-agents.",
      noindex: true,
    }),
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) startpagina().then((to) => navigate({ to, replace: true }));
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: await startpagina(), replace: true });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name },
          },
        });
        if (error) throw error;
        setInfo("Account aangemaakt. Je kunt direct inloggen.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo(
          "Als dit adres bij ons bekend is, ontvang je binnen enkele minuten een herstel-link. Controleer ook je spam-map.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="theme-dark surface-gradient flex min-h-screen w-full items-center justify-center px-4 py-10 font-sans text-ink antialiased">
      <div className="w-full max-w-sm animate-rise">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <BrandLogo markClassName="size-9" textClassName="text-[17px]" />
        </Link>

        <div className="card-glass-lg rounded-3xl p-6">
          <h1 className="font-display text-[20px] font-bold text-brand">
            {mode === "login" && "Klantportaal"}
            {mode === "signup" && "Account aanmaken"}
            {mode === "forgot" && "Wachtwoord vergeten"}
          </h1>
          <p className="mt-1.5 text-[12px]/[1.6] text-ink/55">
            {mode === "login" && "Log in om de prestaties van je AI-agents te bekijken."}
            {mode === "signup" && "Maak je account aan met e-mail en wachtwoord."}
            {mode === "forgot" && "Vul je e-mailadres in, dan sturen we een herstel-link."}
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <Field
                label="Naam"
                value={name}
                onChange={setName}
                type="text"
                placeholder="Bedrijfsnaam"
              />
            )}
            <Field
              label="E-mailadres"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="jij@bedrijf.nl"
            />
            {mode !== "forgot" && (
              <Field
                label="Wachtwoord"
                value={password}
                onChange={setPassword}
                type="password"
                placeholder="••••••••"
              />
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] font-medium text-ink/85"
              >
                {error}
              </p>
            )}
            {info && (
              <p
                role="status"
                className="rounded-xl border border-mint/30 bg-mint/10 px-3 py-2 text-[12px] font-medium text-ink/85"
              >
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="cta-dark mt-1 w-full rounded-full px-6 py-3 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {busy
                ? "Bezig…"
                : mode === "login"
                  ? "Inloggen"
                  : mode === "signup"
                    ? "Account aanmaken"
                    : "Stuur herstel-link"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap justify-between gap-2 text-[12px] text-ink/55">
            {mode !== "forgot" ? (
              <button
                onClick={() => setMode("forgot")}
                className="transition-colors hover:text-violet"
              >
                Wachtwoord vergeten?
              </button>
            ) : (
              <button
                onClick={() => setMode("login")}
                className="transition-colors hover:text-violet"
              >
                Terug naar inloggen
              </button>
            )}
            {mode === "login" ? (
              <button
                onClick={() => setMode("signup")}
                className="transition-colors hover:text-violet"
              >
                Account aanmaken
              </button>
            ) : mode === "signup" ? (
              <button
                onClick={() => setMode("login")}
                className="transition-colors hover:text-violet"
              >
                Ik heb al een account
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-5 text-center text-[11.5px]/[1.7] text-ink/40">
          Alleen voor klanten van Zakelijke AI Agents. Nog geen agent?{" "}
          <Link to="/" hash="contact" className="underline underline-offset-2 hover:text-ink/70">
            Plan een gratis verkenning
          </Link>
          .
        </p>

        <Link
          to="/"
          className="mt-4 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/12 bg-white/[0.03] px-6 py-3 text-[13px] font-medium text-ink/70 transition hover:border-violet/45 hover:bg-white/[0.06] hover:text-violet"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Terug naar de website
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-ink outline-none transition placeholder:text-ink/35 focus:border-violet/55 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet/25"
      />
    </label>
  );
}
