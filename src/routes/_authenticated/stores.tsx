import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  createAudit,
  fetchAllAnswers,
  fetchAudits,
  fetchChecklist,
  fetchMyProfile,
  fetchStores,
  type Audit,
} from "@/lib/ace-data";
import { computeScore, currentPeriod, formatPeriod } from "@/lib/scoring";
import { ScorePill } from "@/components/ScorePill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/stores")({
  head: () => ({
    meta: [
      { title: "Stores — ACE Audit" },
      { name: "description", content: "Pick a store to start or review its monthly ACE audit." },
      { property: "og:title", content: "Stores — ACE Audit" },
      { property: "og:description", content: "Pick a store to start or review its monthly ACE audit." },
    ],
  }),
  component: StoresPage,
});

function StoresPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newFor, setNewFor] = useState<{ id: string; name: string } | null>(null);
  const [period, setPeriod] = useState(currentPeriod());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [conductedBy, setConductedBy] = useState("");

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchMyProfile });
  const { data: stores = [], isLoading } = useQuery({ queryKey: ["stores"], queryFn: fetchStores });
  const { data: items = [] } = useQuery({ queryKey: ["checklist"], queryFn: fetchChecklist });
  const { data: audits = [] } = useQuery({ queryKey: ["audits"], queryFn: () => fetchAudits() });
  const { data: answersByAudit = {} } = useQuery({
    queryKey: ["answers", audits.map((a) => a.id)],
    queryFn: () => fetchAllAnswers(audits.map((a) => a.id)),
    enabled: audits.length > 0,
  });

  const create = useMutation({
    mutationFn: createAudit,
    onSuccess: (audit) => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      setNewFor(null);
      navigate({ to: "/audit/$auditId", params: { auditId: audit.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const visibleStores = stores.filter(
    (s) => profile?.isAdmin || !profile?.store_id || profile.store_id === s.id,
  );

  function latestFor(storeId: string): Audit | undefined {
    return audits.find((a) => a.store_id === storeId);
  }

  function scoreFor(audit?: Audit) {
    if (!audit) return null;
    const list = answersByAudit[audit.id] ?? [];
    const map = Object.fromEntries(list.map((a) => [a.item_id, a]));
    return computeScore(items, map).pct;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">Stores</h1>
        <p className="text-sm text-muted-foreground">
          {profile?.isAdmin ? "All stores" : "Your store"} · latest audit score
        </p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      <div className="space-y-3">
        {visibleStores.map((store) => {
          const latest = latestFor(store.id);
          const pct = scoreFor(latest);
          return (
            <div key={store.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/store/$storeId"
                    params={{ storeId: store.id }}
                    className="group flex items-center gap-1 font-bold text-foreground"
                  >
                    <span className="truncate">{store.name}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {store.code}
                    {store.region ? ` · ${store.region}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {latest
                      ? `Last audit: ${formatPeriod(latest.period)} · ${latest.status === "completed" ? "Completed" : "Draft"}`
                      : "No audits yet"}
                  </p>
                </div>
                <ScorePill pct={pct} />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  setNewFor({ id: store.id, name: store.name });
                  setPeriod(currentPeriod());
                  setDate(new Date().toISOString().slice(0, 10));
                  setConductedBy(profile?.full_name ?? "");
                }}
              >
                <Plus className="size-4" /> Start new audit
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={newFor !== null} onOpenChange={(open) => !open && setNewFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New audit — {newFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="period">Period</Label>
              <Input id="period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Audit date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conductedBy">Conducted by</Label>
              <Input
                id="conductedBy"
                value={conductedBy}
                onChange={(e) => setConductedBy(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!newFor || create.isPending}
              onClick={() =>
                newFor &&
                create.mutate({
                  store_id: newFor.id,
                  period,
                  date,
                  conducted_by: conductedBy || null,
                })
              }
            >
              {create.isPending ? "Creating…" : "Create audit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
