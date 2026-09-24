import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Building2, CalendarClock, Download, ExternalLink, Minus, ShieldAlert, Trophy } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { fetchAllAnswers, fetchAudits, fetchChecklist, fetchStores } from "@/lib/ace-data";
import { exportAuditXlsx } from "@/lib/export-audit";
import { computeScore, formatPct, formatPeriod, scoreBand } from "@/lib/scoring";
import { ScorePill } from "@/components/ScorePill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/hq")({
  head: () => ({
    meta: [
      { title: "Head office dashboard — ACE Audit" },
      { name: "description", content: "Monitor network performance, audit trends and recurring issues across Mövenpick stores." },
      { property: "og:title", content: "Head office dashboard — ACE Audit" },
      { property: "og:description", content: "Monitor network performance, audit trends and recurring issues across Mövenpick stores." },
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
  const auditIds = audits.map((audit) => audit.id);
  const { data: answersByAudit = {} } = useQuery({
    queryKey: ["answers", auditIds],
    queryFn: () => fetchAllAnswers(auditIds),
    enabled: auditIds.length > 0,
  });

  const scoreAudit = (audit: (typeof audits)[number]) => {
    const answers = answersByAudit[audit.id] ?? [];
    const answerMap = Object.fromEntries(answers.map((answer) => [answer.item_id, answer]));
    return { audit, answers, answerMap, score: computeScore(items, answerMap) };
  };

  const rows = stores.map((store) => {
    const storeAudits = audits.filter((audit) => audit.store_id === store.id);
    const latest = storeAudits[0] ? scoreAudit(storeAudits[0]) : null;
    const previous = storeAudits[1] ? scoreAudit(storeAudits[1]) : null;
    const latestCompletedAudit = storeAudits.find((audit) => audit.status === "completed");
    const latestCompleted = latestCompletedAudit ? scoreAudit(latestCompletedAudit) : null;
    const trend = latest?.score.pct !== null && previous?.score.pct !== null
      ? (latest?.score.pct ?? 0) - (previous?.score.pct ?? 0)
      : null;
    return { store, latest, previous, latestCompleted, trend };
  });

  const scored = rows.filter((row) => row.latest?.score.pct !== null);
  const average = scored.length
    ? scored.reduce((sum, row) => sum + (row.latest?.score.pct ?? 0), 0) / scored.length
    : null;
  const ranked = [...scored].sort((a, b) => (b.latest?.score.pct ?? -1) - (a.latest?.score.pct ?? -1));
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const needsAttention = scored.filter((row) => (row.latest?.score.pct ?? 100) < 60).length;

  const storeNameById = new Map(stores.map((store) => [store.id, store.name]));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const issueMap = new Map<string, Set<string>>();
  rows.forEach((row) => {
    row.latest?.answers.forEach((answer) => {
      if (answer.answer !== "no") return;
      const affected = issueMap.get(answer.item_id) ?? new Set<string>();
      affected.add(row.store.id);
      issueMap.set(answer.item_id, affected);
    });
  });
  const issues = [...issueMap.entries()]
    .map(([itemId, storeIds]) => ({ item: itemById.get(itemId), storeIds: [...storeIds] }))
    .filter((issue) => issue.item)
    .sort((a, b) => b.storeIds.length - a.storeIds.length || (a.item?.code ?? "").localeCompare(b.item?.code ?? ""));

  const periodStoreScores = new Map<string, Map<string, number>>();
  audits.forEach((audit) => {
    const score = scoreAudit(audit).score.pct;
    if (score === null) return;
    const byStore = periodStoreScores.get(audit.period) ?? new Map<string, number>();
    if (!byStore.has(audit.store_id)) byStore.set(audit.store_id, score);
    periodStoreScores.set(audit.period, byStore);
  });
  const trendData = [...periodStoreScores.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([period, values]) => ({
      period: formatPeriod(period).replace(/\s\d{4}$/, ""),
      score: [...values.values()].reduce((sum, value) => sum + value, 0) / values.size,
    }));

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  async function downloadLatest(row: (typeof rows)[number]) {
    if (!row.latestCompleted) return;
    try {
      await exportAuditXlsx(row.latestCompleted.audit, row.store.name, items, row.latestCompleted.answerMap);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the Excel report");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">Head office dashboard</h1>
        <p className="text-sm text-muted-foreground">Network performance from each store’s most recent audit</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={Building2} label="Network average" value={formatPct(average)} tone={scoreBand(average)} detail={`${scored.length} of ${stores.length} stores audited`} />
        <MetricCard icon={ShieldAlert} label="Needs attention" value={String(needsAttention)} tone={needsAttention > 0 ? "red" : "green"} detail="Stores below 60%" />
        <MetricCard icon={Trophy} label="Best performing" value={best?.store.name ?? "—"} tone="green" detail={formatPct(best?.latest?.score.pct)} />
        <MetricCard icon={ArrowDownRight} label="Lowest performing" value={worst?.store.name ?? "—"} tone={scoreBand(worst?.latest?.score.pct)} detail={formatPct(worst?.latest?.score.pct)} />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="border-b border-border px-4 py-4">
          <h2 className="font-bold text-foreground">Store performance</h2>
          <p className="text-xs text-muted-foreground">Latest score and movement from the previous audit</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Store</th>
                <th className="px-3 py-3 text-left font-bold">Latest score</th>
                <th className="px-3 py-3 text-left font-bold">Trend</th>
                <th className="px-3 py-3 text-left font-bold">Last audit</th>
                <th className="px-3 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const auditedThisMonth = row.latest?.audit.period === currentMonth;
                return (
                  <tr key={row.store.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{row.store.name}</p>
                      <p className="text-xs text-muted-foreground">{row.store.code}</p>
                    </td>
                    <td className="px-3 py-3"><ScorePill pct={row.latest?.score.pct} size="sm" /></td>
                    <td className="px-3 py-3"><TrendValue value={row.trend} /></td>
                    <td className="px-3 py-3">
                      <p className="text-foreground">{row.latest ? new Date(row.latest.audit.date).toLocaleDateString("en-GB") : "Never"}</p>
                      <p className={cn("text-xs font-medium", auditedThisMonth ? "text-ok" : "text-warn")}>
                        {auditedThisMonth ? "Audited this month" : "Not audited this month"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" disabled={!row.latestCompleted} title={row.latestCompleted ? "Download latest completed audit" : "No completed audit available"} onClick={() => downloadLatest(row)}>
                          <Download className="size-4" /><span className="sr-only">Download Excel report</span>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/store/$storeId" params={{ storeId: row.store.id }}>View details <ExternalLink className="size-4" /></Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-border bg-card shadow-card">
          <div className="border-b border-border px-4 py-4">
            <h2 className="font-bold text-foreground">Top issues across all stores</h2>
            <p className="text-xs text-muted-foreground">Recurring “No” answers in each store’s latest audit</p>
          </div>
          {issues.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No network-wide issues are currently flagged.</p> : (
            <ol className="divide-y divide-border">
              {issues.slice(0, 8).map((issue, index) => (
                <li key={issue.item?.id} className="flex gap-3 px-4 py-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-bad-soft text-xs font-bold text-bad">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-semibold text-foreground">{issue.item?.text}</p><p className="text-xs text-muted-foreground">{issue.item?.section} · {issue.item?.code}</p></div>
                      <span className="shrink-0 text-sm font-bold text-bad">{issue.storeIds.length} of {stores.length}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{issue.storeIds.map((id) => storeNameById.get(id)).filter(Boolean).join(", ")}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="font-bold text-foreground">Network score trend</h2>
          <p className="text-xs text-muted-foreground">Average of each store’s latest score per audit period</p>
          <div className="mt-4 h-72 w-full">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 12, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Network average"]} />
                  <Line type="monotone" dataKey="score" stroke="var(--color-foreground)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-accent)" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No trend data yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }: { icon: typeof Building2; label: string; value: string; detail: string; tone: "green" | "amber" | "red" | "none" }) {
  return (
    <article className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><Icon className={cn("size-4", { green: "text-ok", amber: "text-warn", red: "text-bad", none: "text-muted-foreground" }[tone])} /></div>
      <p className="mt-3 truncate text-xl font-extrabold text-foreground" title={value}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function TrendValue({ value }: { value: number | null }) {
  if (value === null) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="size-4" /> No comparison</span>;
  if (Math.abs(value) < 0.05) return <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground"><Minus className="size-4" /> 0.0 pts</span>;
  const positive = value > 0;
  return <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", positive ? "text-ok" : "text-bad")}>{positive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}{Math.abs(value).toFixed(1)} pts</span>;
}