export type AnswerValue = "yes" | "no" | "na";

export interface ChecklistItem {
  id: string;
  section: string;
  section_order: number;
  item_order: number;
  code: string;
  text: string;
  weight: number;
  hint: string | null;
}

export interface AuditAnswer {
  item_id: string;
  answer: AnswerValue;
  note: string | null;
}

export interface ScoreResult {
  actual: number;
  possible: number;
  pct: number | null;
  answered: number;
  total: number;
}

export function computeScore(
  items: ChecklistItem[],
  answers: Record<string, AuditAnswer>,
): ScoreResult {
  let actual = 0;
  let possible = 0;
  let answered = 0;

  for (const item of items) {
    const a = answers[item.id];
    if (!a) continue;
    answered += 1;
    if (a.answer === "na") continue;
    possible += item.weight;
    if (a.answer === "yes") actual += item.weight;
  }

  return {
    actual,
    possible,
    pct: possible > 0 ? (actual / possible) * 100 : null,
    answered,
    total: items.length,
  };
}

export type ScoreBand = "green" | "amber" | "red" | "none";

export function scoreBand(pct: number | null | undefined): ScoreBand {
  if (pct === null || pct === undefined) return "none";
  if (pct >= 85) return "green";
  if (pct >= 60) return "amber";
  return "red";
}

export function bandClasses(band: ScoreBand): string {
  switch (band) {
    case "green":
      return "bg-ok-soft text-ok border-ok/30";
    case "amber":
      return "bg-warn-soft text-warn border-warn/30";
    case "red":
      return "bg-bad-soft text-bad border-bad/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function formatPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  return `${Math.round(pct)}%`;
}

export function groupBySection(items: ChecklistItem[]) {
  const map = new Map<string, ChecklistItem[]>();
  const sorted = [...items].sort(
    (a, b) => a.section_order - b.section_order || a.item_order - b.item_order,
  );
  for (const item of sorted) {
    const list = map.get(item.section) ?? [];
    list.push(item);
    map.set(item.section, list);
  }
  return [...map.entries()].map(([section, sectionItems]) => ({ section, items: sectionItems }));
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
