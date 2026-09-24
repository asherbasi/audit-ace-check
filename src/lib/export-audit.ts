import * as XLSX from "xlsx";
import { computeScore, formatPeriod, groupBySection, type AuditAnswer, type ChecklistItem } from "./scoring";
import type { Audit } from "./ace-data";

const label = (a?: string) => (a === "yes" ? "Yes" : a === "no" ? "No" : a === "na" ? "N/A" : "");
const pct = (p: number | null) => (p === null ? "—" : `${p.toFixed(1)}%`);

export function exportAuditXlsx(
  audit: Audit,
  storeName: string,
  items: ChecklistItem[],
  answers: Record<string, AuditAnswer>,
) {
  const rows: (string | number)[][] = [
    ["Mövenpick ACE Audit Report"],
    [],
    ["Store", storeName],
    ["Period", formatPeriod(audit.period)],
    ["Date", new Date(audit.date).toLocaleDateString("en-GB")],
    ["RGM", audit.rgm ?? ""],
    ["ARM", audit.arm ?? ""],
    ["Unit Head", audit.unit_head ?? ""],
    ["ACE conducted by", audit.conducted_by ?? ""],
    ["Status", audit.status === "completed" ? "Completed" : "Draft"],
    [],
    ["Section", "Code", "Item", "Weight", "Answer", "Corrective note"],
  ];
  const sections = groupBySection(items);
  for (const { items: list } of sections) {
    for (const i of list) {
      const a = answers[i.id];
      rows.push([i.section, i.code, i.text, i.weight, label(a?.answer), a?.answer === "no" ? a.note ?? "" : ""]);
    }
  }
  rows.push([], ["Summary"], ["Section", "Score", "Possible", "Percentage"]);
  for (const { section, items: list } of sections) {
    const s = computeScore(list, answers);
    rows.push([section, s.actual, s.possible, pct(s.pct)]);
  }
  const o = computeScore(items, answers);
  rows.push(["Overall", o.actual, o.possible, pct(o.pct)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 70 }, { wch: 10 }, { wch: 10 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit");
  const safe = storeName.replace(/[^\w-]+/g, "_");
  XLSX.writeFile(wb, `ACE_${safe}_${audit.period}.xlsx`);
}
