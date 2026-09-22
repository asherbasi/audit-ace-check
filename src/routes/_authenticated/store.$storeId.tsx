import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";

import {
  fetchAllAnswers,
  fetchAudits,
  fetchChecklist,
  fetchStores,
} from "@/lib/ace-data";
import { computeScore, formatPct, formatPeriod, scoreBand } from "@/lib/scoring";
import { ScorePill } from "@/components/ScorePill";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/store/$storeId")({
  head: () => ({
    meta: [
      { title: "Store dashboard — ACE Audit" },
      { name: "description", content: "Audit history, score trend and outstanding corrective actions for this store." },
      { property: "og:title", content: "Store dashboard — ACE Audit" },
      { property: "og:description", content: "Audit history, score trend and outstanding corrective actions for this store." },
    ],
  }),
  component: StorePage,
});

const barColor: Record<string, string> = {
  green: "bg-ok",
  amber: "bg-warn",
  red: "bg-bad",
  none: "bg-muted",
};

function StorePage() {
  const { storeId } = Route.useParams();

  const { data: stores = [] } = useQuery({ queryKey: ["stores"], queryFn: fetchStores });
  const { data: items = [] } = useQuery({ queryKey: ["checklist"], queryFn: fetchChecklist });
  const { data: audits = [] } = useQuery({
    queryKey: ["audits", storeId],
    queryFn: () => fetchAudits(storeId),
  });
  const auditIds = audits.map((a) => a.id);
  const { data: answersByAudit = {} } = useQuery({
    queryKey: ["answers", auditIds],
    queryFn: () => fetchAllAnswers(auditIds),
    enabled: auditIds.length > 0,
  });

  const store = stores.find((s) => s.id === storeId);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const rows = audits.map((audit) => {
    const list = answersByAudit[audit.id] ?? [];
    const map = Object.fromEntries(list.map((a) => [a.item_id, a]));
    return { audit, score: computeScore(items, map), answers: list };
  });

  const latest = rows[0];
  const openIssues = (latest?.answers ?? []).filter((a) => a.answer === "no");
  const trend = [...rows].reverse().slice(-6);

  return (
    <div className="space-y-4">
      <Link
        to="/stores"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All stores
      </Link>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground">
              {store?.name ?? "Store"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {store?.code}
              {store?.region ? ` · ${store.region}` : ""}
            </p>
          </div>
          <ScorePill pct={latest?.score.pct ?? null} size="lg" />
        </div>

        {trend.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Score trend
            </p>
            <div className="mt-2 flex items-end gap-2">
              {trend.map(({ audit, score }) => (
                <div key={audit.id} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                    {formatPct(score.pct)}
                  </span>
                  <div className="flex h-24 w-full items-end rounded-md bg-muted/50">
                    <div
                      className={cn("w-full rounded-md transition-all", barColor[scoreBand(score.pct)])}
                      style={{ height: `${Math.max(score.pct ?? 0, 3)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{audit.period}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            Open corrective actions
          </h2>
          <p className="text-xs text-muted-foreground">From the most recent audit</p>
        </header>
        {openIssues.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Nothing outstanding.</p>
        ) : (
          <ul className="divide-y divide-border">
            {openIssues.map((issue) => {
              const item = itemById.get(issue.item_id);
              return (
                <li key={issue.item_id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 rounded bg-bad-soft px-1.5 py-0.5 text-[10px] font-bold text-bad">
                      {item?.code ?? "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item?.text ?? "Item"}</p>
                      {issue.note ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{issue.note}</p>
                      ) : (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">No action noted</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Audit history</h2>
        </header>
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No audits yet for this store.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ audit, score }) => (
              <li key={audit.id}>
                <Link
                  to="/audit/$auditId"
                  params={{ auditId: audit.id }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{formatPeriod(audit.period)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(audit.date).toLocaleDateString("en-GB")} ·{" "}
                      {audit.status === "completed" ? "Completed" : "Draft"}
                      {audit.conducted_by ? ` · ${audit.conducted_by}` : ""}
                    </p>
                  </div>
                  <ScorePill pct={score.pct} size="sm" />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
