import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Klantreis, type Reisgegevens } from "@/components/klantreis";
import { getMe } from "@/lib/dashboard.functions";
import { haalContactReis } from "@/lib/contacten.functions";

export const Route = createFileRoute("/_authenticated/contact/$contactId")({
  head: () => ({
    meta: [
      { title: "Contact — Zakelijke AI Agents klantportaal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContactPagina,
});

function ContactPagina() {
  const { contactId } = useParams({ from: "/_authenticated/contact/$contactId" });
  const meFn = useServerFn(getMe);
  const reisFn = useServerFn(haalContactReis);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const reisQuery = useQuery({
    queryKey: ["klantreis", contactId],
    queryFn: () => reisFn({ data: { contactId } }) as unknown as Promise<Reisgegevens>,
  });

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <Link
          to="/contacten"
          className="inline-flex w-fit items-center gap-1.5 text-[12.5px] text-ink/55 transition hover:text-ink/85"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          terug naar contacten
        </Link>

        {reisQuery.isLoading && (
          <div className="card-glass-lg rounded-3xl p-6">
            <p className="text-[12.5px] text-ink/50">Bezig met laden…</p>
          </div>
        )}

        {reisQuery.error && (
          <p className="flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-[12.5px]/[1.65] text-ink/85">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
            {reisQuery.error instanceof Error
              ? reisQuery.error.message
              : "Dit contact kon niet worden geladen."}
          </p>
        )}

        {reisQuery.data && <Klantreis g={reisQuery.data} />}
      </div>
    </DashboardShell>
  );
}
