import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check as CheckIcon } from "lucide-react";
import * as React from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CONTACT, FOOTER, NAV, SITE } from "@/content/site";
import { Reveal } from "@/hooks/use-reveal";
import { submitLeadRequest } from "@/lib/leads.functions";
import { Container, Section, shadowBrand } from "./ui";

type Errors = Partial<Record<"name" | "company" | "email" | "form", string>>;

const SEO_LINKS = [
  { to: "/ai-scan", label: "AI-scan" },
  { to: "/ai-consultancy-mkb", label: "AI-consultancy & strategie" },
  { to: "/ai-automatisering-op-maat", label: "Maatwerk AI-automatisering" },
  { to: "/ai-project-vastgelopen", label: "AI-project vastgelopen?" },
  { to: "/ai-voor-het-mkb-amsterdam", label: "AI voor het MKB in Amsterdam" },
  { to: "/ai-agents-amsterdam", label: "AI agents in Amsterdam" },
  { to: "/ai-lead-opvolging", label: "AI-leadopvolging" },
  { to: "/ai-klantenservice-automatiseren", label: "AI-klantenservice" },
  { to: "/whatsapp-follow-up-automatiseren", label: "WhatsApp follow-up" },
  { to: "/blog/waarom-ai-pilots-mislukken", label: "Waarom AI-pilots mislukken" },
] as const;

const fieldClass =
  "h-12 w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-[14px] text-ink placeholder:text-ink/35 outline-none transition focus:border-violet/60 focus:ring-2 focus:ring-violet/30";

const inputFieldClass =
  "h-12 w-full rounded-2xl border border-white/15 bg-white px-4 text-[14px] text-black placeholder:text-black/40 outline-none transition focus:border-violet/60 focus:ring-2 focus:ring-violet/30";

export function ContactSection() {
  const submit = useServerFn(submitLeadRequest);
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});
  const [values, setValues] = React.useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    stage: CONTACT.stages[0],
    message: "",
  });

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Vul je naam in";
    if (!values.company.trim()) next.company = "Vul je bedrijf in";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      next.email = "Vul een geldig e-mailadres in";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSending(true);
    try {
      await submit({ data: values });
      setSent(true);
    } catch {
      setErrors({ form: "Versturen is niet gelukt. Probeer het nog eens of mail ons direct." });
    } finally {
      setSending(false);
    }
  }

  return (
    <Section id="contact" labelledBy="contact-titel" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 50% at 50% 35%, rgba(120,110,255,.18), transparent 70%), radial-gradient(40% 45% at 50% 90%, rgba(90,220,190,.10), transparent 70%)",
        }}
      />
      <Container className="relative">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="contact-titel"
              className="font-display text-[28px]/[1.15] font-bold tracking-tight text-brand sm:text-[38px]/[1.1]"
            >
              {CONTACT.h2}
            </h2>
            <p className="mt-4 text-[15px]/[1.7] text-ink/65">{CONTACT.sub}</p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="card-glass-lg mx-auto mt-8 max-w-xl rounded-3xl p-6 sm:p-8">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-mint/15 text-mint">
                  <CheckIcon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="font-display text-[17px] font-semibold text-brand">
                  {CONTACT.success}
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Naam" error={errors.name}>
                    <input
                      className={inputFieldClass}
                      value={values.name}
                      onChange={set("name")}
                      autoComplete="name"
                      required
                    />
                  </Field>
                  <Field label="Bedrijf" error={errors.company}>
                    <input
                      className={inputFieldClass}
                      value={values.company}
                      onChange={set("company")}
                      autoComplete="organization"
                      required
                    />
                  </Field>
                  <Field label="E-mailadres" error={errors.email}>
                    <input
                      type="email"
                      className={inputFieldClass}
                      value={values.email}
                      onChange={set("email")}
                      autoComplete="email"
                      required
                    />
                  </Field>
                  <Field label="Telefoon (optioneel)">
                    <input
                      type="tel"
                      className={inputFieldClass}
                      value={values.phone}
                      onChange={set("phone")}
                      autoComplete="tel"
                    />
                  </Field>
                </div>

                <Field label={CONTACT.stageLabel}>
                  <select className={fieldClass} value={values.stage} onChange={set("stage")}>
                    {CONTACT.stages.map((s) => (
                      <option key={s} value={s} className="bg-[#12121a] text-ink">
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={`${CONTACT.messageLabel} (optioneel)`}>
                  <textarea
                    rows={4}
                    className={`${inputFieldClass} h-auto py-3`}
                    value={values.message}
                    onChange={set("message")}
                  />
                </Field>

                {errors.form && <p className="text-[12px] text-warn">{errors.form}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="mt-1 inline-flex h-13 w-full items-center justify-center rounded-full bg-brand px-6 py-3.5 text-[14px] font-semibold text-primary-foreground cta-lift disabled:opacity-60"
                  style={shadowBrand}
                >
                  {sending ? "Bezig met versturen…" : CONTACT.submit}
                </button>
                <p className="text-center text-[11px]/[1.6] text-ink/45">{CONTACT.privacy}</p>
              </form>
            )}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink/60">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-warn">{error}</span>}
    </label>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-14">
      <Container>
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <BrandLogo />
            <p className="mt-3 text-[12px] text-ink/55">{SITE.tagline}</p>
            <p className="mt-3 max-w-[34ch] text-[12px]/[1.7] text-ink/40">{FOOTER.blurb}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/70">Diensten</p>
            <ul className="mt-3 grid gap-2">
              {FOOTER.services.map((s) => (
                <li key={s}>
                  <a href="#diensten" className="text-[13px] text-ink/55 hover:text-ink">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/70">Bedrijf</p>
            <ul className="mt-3 grid gap-2">
              {FOOTER.company.map((c) => (
                <li key={c.href}>
                  <a href={c.href} className="text-[13px] text-ink/55 hover:text-ink">
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/70">Contact</p>
            <ul className="mt-3 grid gap-2 text-[13px] text-ink/55">
              <li>
                <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="hover:text-ink">
                  {SITE.phone}
                </a>
              </li>
              <li>KvK {SITE.kvk}</li>
              <li>
                <a href="#contact" className="hover:text-ink">
                  Stuur een bericht
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/70">Meer lezen</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SEO_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-[13px] text-ink/55 hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <span className="text-[11px] text-ink/40">© 2026 {SITE.name}</span>
          <div className="flex flex-wrap gap-4">
            {FOOTER.legal.map((l) => (
              <span key={l} className="text-[11px] text-ink/40">
                {l}
              </span>
            ))}
          </div>
        </div>

        <nav aria-label="Meer pagina's" className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[11px] text-ink/35 hover:text-ink/70">
              {n.label}
            </a>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
