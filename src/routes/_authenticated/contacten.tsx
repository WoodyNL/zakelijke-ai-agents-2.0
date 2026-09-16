import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ContactImport } from "@/components/contact-import";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import { haalContacten, importeerContacten } from "@/lib/contacten.functions";
import type { GelezenContact } from "@/lib/contactimport";

export const Route = createFileRoute("/_authenticated/contacten")({
  head: () => ({
    meta: [
      { title: "Contacten — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Beheer de contactlijsten voor uitgaande e-mail." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContactenPagina,
});

type Contact = {
  id: string;
  email: string;
  naam: string | null;
  bedrijf: string | null;
  plaats: string | null;
  herkomst: string;
  afgemeld_op: string | null;
  bounce_op: string | null;
};

function ContactenPagina() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const importFn = useServerFn(importeerContacten);
  const lijstFn = useServerFn(haalContacten);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });

  const agents = (agentsQuery.data ?? []) as Array<{
    id: string;
    name: string;
    kind: string | null;
  }>;
  const [gekozenId, zetGekozenId] = useState<string | null>(null);
  const actieveId = gekozenId ?? agents[0]?.id ?? null;

  const contactenQuery = useQuery({
    queryKey: ["contacten", actieveId],
    queryFn: () => lijstFn({ data: { agentId: actieveId! } }) as Promise<Contact[]>,
    enabled: actieveId !== null,
  });

  const contacten = contactenQuery.data ?? [];
  const afgemeld = contacten.filter((c) => c.afgemeld_op !== null).length;

  async function opslaan(gelezen: GelezenContact[], herkomst: "oud_klant" | "koud") {
    if (!actieveId) throw new Error("Kies eerst een agent.");
    const uitkomst = await importFn({
      data: { agentId: actieveId, herkomst, contacten: gelezen },
    });
    await qc.invalidateQueries({ queryKey: ["contacten", actieveId] });
    return uitkomst;
  }

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header>
          <h1 className="font-display text-[22px] font-bold text-brand">Contacten</h1>
          <p className="mt-1.5 max-w-[68ch] text-[13px]/[1.7] text-ink/60">
            De mensen die je e-mailagent aanschrijft. Wie zich afmeldt blijft hier staan maar
            krijgt niets meer — ook niet als het adres later opnieuw in een lijst wordt
            aangeleverd.
          </p>
        </header>

        {agents.length === 0 ? (
          <div className="card-glass-lg rounded-3xl p-6">
            <p className="text-[13px]/[1.7] text-ink/60">
              Er is nog geen agent aan dit account gekoppeld. Zodra die er staat, kun je hier de
              contactlijst inladen.
            </p>
          </div>
        ) : (
          <>
            {agents.length > 1 && (
              <div className="card-glass-lg rounded-3xl p-4">
                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-medium text-ink/70">
                    Voor welke agent?
                  </span>
                  <select
                    value={actieveId ?? ""}
                    onChange={(e) => zetGekozenId(e.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none focus:border-violet/55"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id} className="bg-[#12121a]">
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <ContactImport onOpslaan={opslaan} />

            <section className="card-glass-lg rounded-3xl p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-[16px] font-semibold text-brand">In de lijst</h2>
                <span className="text-[11.5px] text-ink/45">
                  {contacten.length.toLocaleString("nl-NL")}
                  {afgemeld > 0 && ` · ${afgemeld} afgemeld`}
                </span>
              </div>

              {contactenQuery.isLoading ? (
                <p className="mt-4 text-[12.5px] text-ink/50">Bezig met laden…</p>
              ) : contacten.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center">
                  <Users className="mx-auto h-5 w-5 text-ink/30" aria-hidden="true" />
                  <p className="mt-2 text-[12.5px] text-ink/50">
                    Nog geen contacten. Laad hierboven een lijst in.
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-[12.5px]">
                    <thead>
                      <tr className="text-[11px] tracking-wide text-ink/45 uppercase">
                        <th className="pb-2 font-medium">Adres</th>
                        <th className="pb-2 font-medium">Naam</th>
                        <th className="pb-2 font-medium">Bedrijf</th>
                        <th className="pb-2 font-medium">Plaats</th>
                        <th className="pb-2 font-medium">Herkomst</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacten.map((c) => {
                        const uit = c.afgemeld_op !== null || c.bounce_op !== null;
                        return (
                          <tr key={c.id} className="border-t border-white/8">
                            <td className={`py-2 pr-3 ${uit ? "text-ink/35" : "text-ink/85"}`}>
                              {c.email}
                              {c.afgemeld_op && (
                                <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10.5px] text-amber-300">
                                  afgemeld
                                </span>
                              )}
                              {c.bounce_op && !c.afgemeld_op && (
                                <span className="ml-2 rounded-full bg-rose-400/15 px-2 py-0.5 text-[10.5px] text-rose-300">
                                  bestaat niet
                                </span>
                              )}
                            </td>
                            {/* De naam staat er bewust naast het adres: hiermee begint
                                straks elke aanhef, dus dit is het veld dat je wilt
                                nalopen voordat er iets uitgaat. */}
                            <td className={`py-2 pr-3 ${c.naam ? "text-ink/70" : "text-ink/30"}`}>
                              {c.naam ?? "geen naam"}
                            </td>
                            <td className="py-2 pr-3 text-ink/55">{c.bedrijf ?? "—"}</td>
                            <td className="py-2 pr-3 text-ink/55">{c.plaats ?? "—"}</td>
                            <td className="py-2 text-ink/45">
                              {c.herkomst === "oud_klant" ? "oud-klant" : "koud"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
