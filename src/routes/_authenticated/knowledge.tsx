import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { KennisUpload } from "@/components/kennis-upload";
import type { KennisVoorstel } from "@/lib/kennisimport.functions";
import { heeftKennisbank, soortVan } from "@/lib/agent-soorten";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import {
  CATEGORIES,
  listKnowledge,
  saveKnowledge,
  deleteKnowledge,
  exportKnowledge,
} from "@/lib/knowledge.functions";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({
    meta: [
      { title: "Kennisbank — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Beheer de kennis voor het trainen van AI agents." },
      { property: "og:title", content: "Kennisbank — Zakelijke AI Agents klantportaal" },
      {
        property: "og:description",
        content: "Beheer de kennis voor het trainen van AI agents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KnowledgePage,
});

const inputCls =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-brand outline-none placeholder:text-ink/35 focus:border-violet/55";
const btnCls =
  "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold text-primary-foreground disabled:opacity-50";
const ghostBtnCls =
  "rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-[12px] font-semibold text-brand hover:bg-white/10 disabled:opacity-50";

type Item = {
  id: string;
  category: string;
  title: string;
  question: string | null;
  content: string;
  tags: string[];
  sort_order: number;
  is_active: boolean;
};

type Draft = {
  id?: string;
  category: string;
  title: string;
  question: string;
  content: string;
  tags: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyDraft: Draft = {
  category: "bedrijf",
  title: "",
  question: "",
  content: "",
  tags: "",
  sortOrder: 0,
  isActive: true,
};

function download(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function KnowledgePage() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const listFn = useServerFn(listKnowledge);
  const saveFn = useServerFn(saveKnowledge);
  const deleteFn = useServerFn(deleteKnowledge);
  const exportFn = useServerFn(exportKnowledge);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });

  // Welke agent hoort bij deze gebruiker? Een klant heeft er meestal één; een
  // beheerder krijgt onze eigen website-assistent. Zonder deze stap zou de
  // upload proberen te schrijven naar een agent die niet van de klant is, en
  // dat weigert de database terecht.
  const agentsFn = useServerFn(listAgents);
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const mijnAgents = (agentsQuery.data ?? []) as Array<{
    id: string;
    name: string;
    kind: string | null;
  }>;

  // Kennis gaat over het bedrijf van de klant, niet over één agent. Iemand moet
  // zijn prijslijst en voorwaarden kwijt kunnen voordat er een chat-assistent
  // staat, zodat het klaarstaat zodra die er komt. We slaan het daarom op bij
  // de gekozen agent en zeggen erbij wie het straks gaat gebruiken.
  const gekoppeld = mijnAgents;
  const leestKennis = gekoppeld.some((a) => heeftKennisbank(a.kind));
  const [gekozenId, setGekozenId] = useState<string | null>(null);
  // Op id en niet op slug: niet elke agent heeft een slug, want die wordt pas
  // gezet als er een embed voor nodig is. Een id heeft elke agent.
  // Een chat-assistent krijgt voorrang, want die gaat de kennis werkelijk lezen.
  const actieveId =
    gekozenId ?? gekoppeld.find((a) => heeftKennisbank(a.kind))?.id ?? gekoppeld[0]?.id ?? null;
  const actieveAgent = gekoppeld.find((a) => a.id === actieveId) ?? null;
  const isAdmin = meQuery.data?.isAdmin === true;
  // Geen enabled-vlag meer op de rol: RLS bepaalt wat iemand terugkrijgt. Een
  // beheerder ziet alles, een klant alleen de kennis van zijn eigen agents.
  // De sleutel bevat de agent, zodat wisselen van agent ook echt een andere
  // lijst oplevert in plaats van dezelfde uit het geheugen.
  const itemsQuery = useQuery({
    queryKey: ["knowledge", actieveId],
    queryFn: () =>
      listFn({ data: actieveId ? { agentId: actieveId } : {} }) as Promise<Item[]>,
    enabled: actieveId !== null,
  });

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("alle");

  const items = itemsQuery.data ?? [];
  const visible = filter === "alle" ? items : items.filter((i) => i.category === filter);

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      await qc.invalidateQueries({ queryKey: ["knowledge", actieveId] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setBusy(false);
    }
  }

  function edit(item: Item) {
    setDraft({
      id: item.id,
      category: item.category,
      title: item.title,
      question: item.question ?? "",
      content: item.content,
      tags: (item.tags ?? []).join(", "),
      sortOrder: item.sort_order,
      isActive: item.is_active,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!draft.title.trim()) {
      setMsg("Geef het kennisstuk een titel");
      return;
    }
    await run(
      () =>
        saveFn({
          data: {
            ...(draft.id ? { id: draft.id } : {}),
            ...(actieveId ? { agentId: actieveId } : {}),
            category: draft.category,
            title: draft.title.trim(),
            question: draft.question.trim() || null,
            content: draft.content,
            tags: draft.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            sortOrder: draft.sortOrder,
            isActive: draft.isActive,
          },
        }),
      draft.id ? "Kennisstuk bijgewerkt" : "Kennisstuk toegevoegd",
    );
    setDraft(emptyDraft);
  }

  /**
   * Voorstellen uit een geüpload bestand wegschrijven. Eén voor één, zodat een
   * item dat de database weigert de rest niet meesleept, en de gebruiker ziet
   * hoeveel er echt zijn opgeslagen.
   */
  async function neemVoorstellenOver(items: KennisVoorstel[]) {
    setBusy(true);
    setMsg(null);
    let gelukt = 0;
    const redenen: string[] = [];

    try {
      for (const item of items) {
        try {
          await saveFn({
            data: {
              // Zonder dit belanden de items bij onze eigen agent in plaats van
              // bij die van de klant, en weigert de database het terecht.
              ...(actieveId ? { agentId: actieveId } : {}),
              category: item.category,
              title: item.title,
              question: item.question,
              content: item.content,
              tags: [],
              sortOrder: 0,
              isActive: true,
            },
          });
          gelukt++;
        } catch (err) {
          // De reden hoort op het scherm, niet alleen in de console. Anders
          // lijkt de knop stuk terwijl de database een duidelijke uitleg geeft.
          const reden = err instanceof Error ? err.message : String(err);
          if (!redenen.includes(reden)) redenen.push(reden);
          console.error("kennisitem opslaan mislukt", item.title, err);
        }
      }

      await itemsQuery.refetch();

      const melding =
        gelukt === items.length
          ? `${gelukt} kennisstukken toegevoegd aan je kennisbank.`
          : gelukt === 0
            ? `Niets opgeslagen. ${redenen.join(" ")}`
            : `${gelukt} van ${items.length} toegevoegd. ${redenen.join(" ")}`;

      setMsg(melding);
      return { gelukt, melding };
    } finally {
      setBusy(false);
    }
  }

  async function doExport(format: "json" | "txt") {
    setBusy(true);
    setMsg(null);
    try {
      const result = (await exportFn()) as { count: number; json: unknown; text: string };
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        download(
          `cadence-kennisbank-${stamp}.json`,
          JSON.stringify(result.json, null, 2),
          "application/json",
        );
      } else {
        download(`cadence-kennisbank-${stamp}.txt`, result.text, "text/plain;charset=utf-8");
      }
      setMsg(`${result.count} kennisstukken gedownload`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Export mislukt");
    } finally {
      setBusy(false);
    }
  }

  if (meQuery.isLoading) {
    return (
      <DashboardShell>
        <p className="text-[13px] text-ink/55">Laden…</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell isAdmin={isAdmin} userName={meQuery.data?.name}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-brand">
            Kennisbank
          </h1>
          <p className="mt-1 text-[12px] text-ink/55">
            Alles wat je agent over je bedrijf moet weten. Hoe vollediger dit is, hoe beter hij
            antwoordt.
          </p>
        </div>
        <div className="flex gap-2">
          <button className={ghostBtnCls} disabled={busy} onClick={() => doExport("txt")}>
            Download tekst
          </button>
          <button className={btnCls} disabled={busy} onClick={() => doExport("json")}>
            Download trainingsbestand
          </button>
        </div>
      </div>

      {gekoppeld.length > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-ink/55">Kennis voor:</span>
          {gekoppeld.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setGekozenId(a.id)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                actieveId === a.id
                  ? "bg-violet text-white"
                  : "border border-white/12 bg-white/5 text-ink/70 hover:bg-white/10"
              }`}
            >
              {a.name}
              <span className="ml-1.5 opacity-60">{soortVan(a.kind).label}</span>
            </button>
          ))}
        </div>
      )}

      {actieveAgent && !leestKennis && (
        <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[12.5px]/[1.7] text-ink/60">
          Je kunt hier alvast alles kwijt over je bedrijf: prijzen, voorwaarden, veelgestelde
          vragen. We bewaren het bij {actieveAgent.name}. Zodra er een agent draait die vragen
          beantwoordt, is dit waar hij het uit haalt.
        </p>
      )}

      <div className="mt-6">
        {actieveId ? (
          <KennisUpload agentId={actieveId} onOvernemen={neemVoorstellenOver} />
        ) : (
          <div className="card-glass rounded-3xl p-5">
            <p className="max-w-[68ch] text-[13px]/[1.7] text-ink/60">
              Er is nog geen agent aan je account gekoppeld, dus er is nog geen plek om deze kennis
              te bewaren. Zodra je agent is ingericht, kun je hier bestanden uploaden.
            </p>
          </div>
        )}
      </div>

      {msg && (
        <p className="mt-4 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-[12px] text-brand">
          {msg}
        </p>
      )}

      {/* Editor */}
      <section className="card-glass-lg mt-5 rounded-3xl p-5">
        <h2 className="font-display text-[15px] font-semibold text-brand">
          {draft.id ? "Kennisstuk bewerken" : "Nieuw kennisstuk"}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink/55">Categorie</span>
            <select
              className={inputCls}
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink/55">Titel</span>
            <input
              className={inputCls}
              value={draft.title}
              placeholder="Bijv. Prijs starterspakket"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium text-ink/55">
              Vraag (optioneel, voor vraag &amp; antwoord)
            </span>
            <input
              className={inputCls}
              value={draft.question}
              placeholder="Bijv. Wat kost een AI agent?"
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium text-ink/55">Inhoud</span>
            <textarea
              className={`${inputCls} min-h-32`}
              value={draft.content}
              placeholder="Het antwoord of de informatie die de agent moet kennen…"
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink/55">
              Labels (komma-gescheiden)
            </span>
            <input
              className={inputCls}
              value={draft.tags}
              placeholder="prijs, pakket"
              onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink/55">Volgorde</span>
            <input
              type="number"
              className={inputCls}
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={btnCls} disabled={busy} onClick={save}>
            {draft.id ? "Opslaan" : "Toevoegen"}
          </button>
          {draft.id && (
            <button className={ghostBtnCls} disabled={busy} onClick={() => setDraft(emptyDraft)}>
              Annuleren
            </button>
          )}
          <label className="flex items-center gap-2 text-[12px] text-ink/60">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            />
            Meenemen in export
          </label>
        </div>
      </section>

      {/* Filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {["alle", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={
              filter === c
                ? "rounded-full bg-brand px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
                : "rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-[11px] font-medium text-brand hover:bg-white/10"
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* List */}
      <section className="mt-4 space-y-2.5 pb-10">
        {/* Als beheerder zie je de kennis van elke klant, en dan moet er geen
            twijfel zijn over wie je voor je hebt. Zonder deze regel leek elke
            agent dezelfde kennisbank te hebben. */}
        {actieveAgent && !itemsQuery.isLoading && (
          <p className="pb-1 text-[11.5px] text-ink/45">
            {items.length === 0
              ? `${actieveAgent.name} heeft nog geen kennis.`
              : `${items.length} ${items.length === 1 ? "stuk" : "stukken"} van ${actieveAgent.name}.`}
          </p>
        )}
        {itemsQuery.isLoading && <p className="text-[13px] text-ink/55">Kennis laden…</p>}
        {!itemsQuery.isLoading && visible.length === 0 && (
          <p className="text-[13px] text-ink/55">Nog geen kennisstukken in deze categorie.</p>
        )}
        {visible.map((item) => (
          <article key={item.id} className="card-glass rounded-2xl px-4 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo/15 px-2.5 py-1 text-[10px] font-semibold text-brand">
                    {item.category}
                  </span>
                  {!item.is_active && (
                    <span className="rounded-full bg-ink/10 px-2.5 py-1 text-[10px] font-medium text-ink/60">
                      niet in export
                    </span>
                  )}
                  <p className="text-[13px] font-semibold text-brand">{item.title}</p>
                </div>
                {item.question && (
                  <p className="mt-1.5 text-[12px] font-medium text-ink/70">{item.question}</p>
                )}
                <p className="mt-1.5 text-[12px]/[1.55] whitespace-pre-wrap text-ink/55">
                  {item.content}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className={ghostBtnCls} onClick={() => edit(item)}>
                  Bewerken
                </button>
                <button
                  className={ghostBtnCls}
                  disabled={busy}
                  onClick={() => run(() => deleteFn({ data: { id: item.id } }), "Verwijderd")}
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </DashboardShell>
  );
}
