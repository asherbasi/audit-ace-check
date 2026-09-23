import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { fetchAllAnswers, fetchAudits, fetchChecklist, fetchStores } from "@/lib/ace-data";
import { computeScore, formatPeriod } from "@/lib/scoring";
import { ScorePill } from "@/components/ScorePill";

export const Route = createFileRoute("/_authenticated/hq")({
  head: () => ({
    meta: [
      { title: "Head office — ACE Audit" },
      { name: "description", content: "Compare the latest ACE audit scores across every Mövenpick store." },
      { property: "og:title", content: "Head office — ACE Audit" },
      { property: "og:description", content: "Compare the latest ACE audit scores across every Mövenpick store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HqPage,
});

function HqPage() {
  const { data: stores = [] } = useQuery({ queryKey: ["stores"], queryFn: fetchStores });
  const { data: items = [] } = useQuery({ queryKey: ["checklist"], queryFn: fetchChecklist });
  const { data: audits = [] } = useQuery({ queryKey: ["audits"], queryFn: () => fetchAudits() });
  const auditIds = audits.map((a) => a.id);
  const { data: answersByAudit = {} } = useQuery({
    queryKey: ["answers", auditIds],
    queryFn: () => fetchAllAnswers(auditIds),
    enabled: auditIds.length > 0,
  });

  const rows = stores.map((store) => {
    const latest = audits.find((a) => a.store_id === store.id);
    const list = latest ? (answersByAudit[latest.id] ?? []) : [];
    const map = Object.fromEntries(list.map((a) => [a.item_id, a]));
    const score = latest ? computeScore(items, map) : null;
    const openCount = list.filter((a) => a.answer === "no").length;
    return { store, latest, pct: score?.pct ?? null, openCount };
  });

  const scored = rows.filter((r) => r.pct !== null);
  const average =
    scored.length > 0 ? scored.reduce((sum, r) => sum + (r.pct ?? 0), 0) / scored.length : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">Head office</h1>
          <p className="text-sm text-muted-foreground">
            Latest audit per store · {scored.length} of {stores.length} audited
          </p>
        </div>
        <ScorePill pct={average} size="lg" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-bold">Store</th>
              <th className="hidden px-4 py-2 text-left font-bold sm:table-cell">Period</th>
              <th className="px-3 py-2 text-right font-bold">Open</th>
              <th className="px-4 py-2 text-right font-bold">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ store, latest, pct, openCount }) => (
              <tr key={store.id} className="transition-colors hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link
                    to="/store/$storeId"
                    params={{ storeId: store.id }}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {store.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{store.code}</p>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {latest ? formatPeriod(latest.period) : "—"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {latest ? openCount : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <ScorePill pct={pct} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
