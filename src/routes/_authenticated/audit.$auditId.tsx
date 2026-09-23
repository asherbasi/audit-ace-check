import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";

import {
  fetchAnswers,
  fetchAudit,
  fetchChecklist,
  fetchStores,
  saveAnswer,
  updateAudit,
} from "@/lib/ace-data";
import {
  computeScore,
  formatPct,
  formatPeriod,
  groupBySection,
  scoreBand,
  type AnswerValue,
  type AuditAnswer,
} from "@/lib/scoring";
import { ScorePill } from "@/components/ScorePill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/audit/$auditId")({
  head: () => ({
    meta: [
      { title: "Audit — ACE Audit" },
      { name: "description", content: "Complete the 6-section ACE checklist with live weighted scoring." },
      { property: "og:title", content: "Audit — ACE Audit" },
      { property: "og:description", content: "Complete the 6-section ACE checklist with live weighted scoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { auditId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, AuditAnswer> | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: audit } = useQuery({ queryKey: ["audit", auditId], queryFn: () => fetchAudit(auditId) });
  const { data: items = [] } = useQuery({ queryKey: ["checklist"], queryFn: fetchChecklist });
  const { data: stores = [] } = useQuery({ queryKey: ["stores"], queryFn: fetchStores });
  const { data: loadedAnswers } = useQuery({
    queryKey: ["answers", auditId],
    queryFn: () => fetchAnswers(auditId),
  });

  const current = useMemo<Record<string, AuditAnswer>>(() => {
    if (answers) return answers;
    return Object.fromEntries((loadedAnswers ?? []).map((a) => [a.item_id, a]));
  }, [answers, loadedAnswers]);

  const store = stores.find((s) => s.id === audit?.store_id);
  const sections = useMemo(() => groupBySection(items), [items]);
  const overall = computeScore(items, current);
  const readOnly = audit?.status === "completed";
  const progress = items.length ? (overall.answered / items.length) * 100 : 0;
  const overallBand = scoreBand(overall.pct);

  async function setAnswer(itemId: string, answer: AnswerValue) {
    if (readOnly) return;
    const next = {
      ...current,
      [itemId]: { item_id: itemId, answer, note: current[itemId]?.note ?? null },
    };
    setAnswers(next);
    setSaving(true);
    try {
      await saveAnswer({ audit_id: auditId, item_id: itemId, answer, note: next[itemId]!.note });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function setNote(itemId: string, note: string) {
    const existing = current[itemId];
    if (!existing || readOnly) return;
    const next = { ...current, [itemId]: { ...existing, note } };
    setAnswers(next);
    try {
      await saveAnswer({ audit_id: auditId, item_id: itemId, answer: existing.answer, note });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save note");
    }
  }

  async function toggleStatus() {
    if (!audit) return;
    const status = audit.status === "completed" ? "draft" : "completed";
    try {
      await updateAudit(auditId, { status });
      await queryClient.invalidateQueries({ queryKey: ["audit", auditId] });
      await queryClient.invalidateQueries({ queryKey: ["audits"] });
      toast.success(status === "completed" ? "Audit completed" : "Audit reopened");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update audit");
    }
  }

  if (!audit) return <p className="text-sm text-muted-foreground">Loading audit…</p>;

  return (
    <div className="space-y-4">
      <Link
        to="/store/$storeId"
        params={{ storeId: audit.store_id }}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {store?.name ?? "Store"}
      </Link>

      <div className="sticky top-14 z-30 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold text-foreground">
              {store?.name} · {formatPeriod(audit.period)}
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date(audit.date).toLocaleDateString("en-GB")} ·{" "}
              {readOnly ? "Completed (read-only)" : saving ? "Saving…" : "Draft · autosaved"}
            </p>
          </div>
          <ScorePill pct={overall.pct} size="lg" />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", {
              green: "bg-ok",
              amber: "bg-warn",
              red: "bg-bad",
              none: "bg-muted-foreground",
            }[overallBand])}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {overall.answered} of {items.length} items answered · {overall.actual}/{overall.possible} points
        </p>
      </div>

      {sections.map(({ section, items: sectionItems }) => {
        const sectionScore = computeScore(sectionItems, current);
        return (
          <section key={section} className="rounded-2xl border border-border bg-card shadow-card">
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <h2 className="flex-1 text-sm font-bold uppercase tracking-wide text-foreground">{section}</h2>
              <ScorePill pct={sectionScore.pct} size="sm" />
            </header>
            <ul className="divide-y divide-border">
              {sectionItems.map((item) => {
                const answer = current[item.id]?.answer;
                return (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {item.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{item.text}</p>
                        {item.hint ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
                        ) : null}
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{item.weight} pt</span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {(["yes", "no", "na"] as const).map((value) => (
                        <Button
                          key={value}
                          type="button"
                          disabled={readOnly}
                          onClick={() => setAnswer(item.id, value)}
                          className={cn(
                            "h-10 rounded-md border px-2 text-sm font-semibold shadow-none",
                            answer === value
                              ? value === "yes"
                                ? "border-ok bg-ok text-primary-foreground hover:bg-ok/90"
                                : value === "no"
                                  ? "border-bad bg-bad text-primary-foreground hover:bg-bad/90"
                                  : "border-muted-foreground/30 bg-muted text-foreground hover:bg-muted"
                              : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                          )}
                        >
                          {value === "na" ? "N/A" : value === "yes" ? "Yes" : "No"}
                        </Button>
                      ))}
                    </div>

                    {answer === "no" ? (
                      <Textarea
                        className="mt-2"
                        placeholder="What needs to be fixed?"
                        defaultValue={current[item.id]?.note ?? ""}
                        disabled={readOnly}
                        onBlur={(e) => setNote(item.id, e.target.value)}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Overall score</p>
            <p
              className={cn(
                "text-2xl font-extrabold tabular-nums",
                { green: "text-ok", amber: "text-warn", red: "text-bad", none: "text-muted-foreground" }[
                  scoreBand(overall.pct)
                ],
              )}
            >
              {formatPct(overall.pct)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/store/$storeId", params: { storeId: audit.store_id } })}>
              Done
            </Button>
            <Button onClick={toggleStatus}>
              {readOnly ? (
                <>
                  <Lock className="size-4" /> Reopen
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> Complete audit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
