/**
 * Rapport als CSV. Een klant die om cijfers vraagt, wil ze meestal in Excel of
 * Google Sheets zetten om er iets mee te doen, niet in een pdf om naar te
 * kijken. CSV opent overal en is zo gemaakt; een pdf vraagt een bibliotheek en
 * levert minder op.
 */

type AgentRij = {
  name: string;
  status: string;
  metric_label: string;
  score_label: string;
  total30?: number | null;
  score30?: number | null;
  series?: Array<{ date?: string; output_count?: number | null; performance_score?: number | null }>;
};

/** Excel in het Nederlands verwacht een puntkomma, en struikelt over komma's. */
const SCHEIDING = ";";

function veld(waarde: unknown): string {
  const t = waarde == null ? "" : String(waarde);
  // Aanhalingstekens verdubbelen en het veld omsluiten zodra er iets in staat
  // wat de kolomindeling kan breken.
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function regel(velden: unknown[]): string {
  return velden.map(veld).join(SCHEIDING);
}

/** Nederlandse notatie: 15-09-2026. */
function datum(d: Date): string {
  return [d.getDate(), d.getMonth() + 1, d.getFullYear()]
    .map((n, i) => (i < 2 ? String(n).padStart(2, "0") : n))
    .join("-");
}

export function bouwRapport(agents: AgentRij[]): string {
  const nu = new Date();
  const regels: string[] = [
    regel(["Rapport AI-agents"]),
    regel(["Gegenereerd op", datum(nu)]),
    regel(["Periode", "laatste 30 dagen"]),
    "",
    regel(["Agent", "Status", "Wat gemeten wordt", "Totaal 30 dagen", "Prestatiemaat", "Score"]),
  ];

  for (const a of agents) {
    regels.push(
      regel([
        a.name,
        a.status,
        a.metric_label,
        a.total30 ?? 0,
        a.score_label,
        a.score30 != null ? `${Math.round(Number(a.score30))}%` : "",
      ]),
    );
  }

  // Per agent de dagcijfers eronder, zodat iemand er zelf een grafiek van kan
  // maken zonder ons erom te hoeven vragen.
  const metReeks = agents.filter((a) => (a.series ?? []).length > 0);
  if (metReeks.length > 0) {
    regels.push("", regel(["Dagcijfers"]), regel(["Agent", "Datum", "Aantal", "Score"]));
    for (const a of metReeks) {
      for (const dag of a.series ?? []) {
        regels.push(
          regel([
            a.name,
            dag.date ?? "",
            dag.output_count ?? 0,
            dag.performance_score != null ? Math.round(Number(dag.performance_score)) : "",
          ]),
        );
      }
    }
  }

  return regels.join("\r\n");
}

export function downloadRapport(agents: AgentRij[]) {
  const csv = bouwRapport(agents);

  // De BOM zorgt dat Excel het als UTF-8 leest; zonder komen accenten en het
  // euroteken er verminkt in te staan.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `ai-agents-rapport-${datum(new Date()).replace(/-/g, "")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Direct opruimen zou de download in sommige browsers afbreken.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
