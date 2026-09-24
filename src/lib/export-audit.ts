import ExcelJS from "exceljs";

import { computeScore, formatPeriod, groupBySection, scoreBand, type AuditAnswer, type ChecklistItem } from "./scoring";
import type { Audit } from "./ace-data";

const COLORS = {
  charcoal: "252525",
  white: "FFFFFF",
  gold: "C4A55A",
  paleGold: "F5F0E4",
  border: "D9D9D6",
  muted: "6B6B68",
  green: "1F7A4D",
  greenSoft: "DDEFE5",
  amber: "A66A00",
  amberSoft: "FFF0C7",
  red: "B53A32",
  redSoft: "F8DEDB",
  greySoft: "E9E9E7",
} as const;

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: COLORS.border } },
  left: { style: "thin", color: { argb: COLORS.border } },
  bottom: { style: "thin", color: { argb: COLORS.border } },
  right: { style: "thin", color: { argb: COLORS.border } },
};

function answerLabel(answer?: string) {
  if (answer === "yes") return "Yes";
  if (answer === "no") return "No";
  if (answer === "na") return "N/A";
  return "Not answered";
}

function scoreFill(pct: number | null) {
  const band = scoreBand(pct);
  if (band === "green") return COLORS.greenSoft;
  if (band === "amber") return COLORS.amberSoft;
  if (band === "red") return COLORS.redSoft;
  return COLORS.greySoft;
}

function scoreFont(pct: number | null) {
  const band = scoreBand(pct);
  if (band === "green") return COLORS.green;
  if (band === "amber") return COLORS.amber;
  if (band === "red") return COLORS.red;
  return COLORS.muted;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.charcoal } };
    cell.alignment = { vertical: "middle" };
    cell.border = thinBorder;
  });
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");
}

export async function exportAuditXlsx(
  audit: Audit,
  storeName: string,
  items: ChecklistItem[],
  answers: Record<string, AuditAnswer>,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mövenpick ACE Audit";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summary = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 12 }],
    properties: { defaultRowHeight: 20 },
  });
  summary.columns = [
    { key: "label", width: 25 },
    { key: "value", width: 34 },
    { key: "points", width: 18 },
    { key: "possible", width: 18 },
    { key: "percentage", width: 16 },
  ];
  summary.mergeCells("A1:E2");
  const title = summary.getCell("A1");
  title.value = "MÖVENPICK ACE AUDIT REPORT";
  title.font = { bold: true, size: 20, color: { argb: COLORS.white } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.charcoal } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  summary.getRow(1).height = 26;
  summary.getRow(2).height = 18;

  const details: [string, string][] = [
    ["Store", storeName],
    ["Period", formatPeriod(audit.period)],
    ["Audit date", new Date(audit.date).toLocaleDateString("en-GB")],
    ["RGM", audit.rgm ?? "—"],
    ["ARM", audit.arm ?? "—"],
    ["Unit Head", audit.unit_head ?? "—"],
    ["ACE conducted by", audit.conducted_by ?? "—"],
    ["Status", audit.status === "completed" ? "Completed" : "Draft"],
  ];
  details.forEach(([label, value], index) => {
    const row = summary.getRow(index + 3);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, color: { argb: COLORS.muted } };
    row.getCell(2).value = value;
    summary.mergeCells(index + 3, 2, index + 3, 5);
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.border } } };
      cell.alignment = { vertical: "middle" };
    });
  });

  const summaryHeader = summary.getRow(12);
  ["Section", "", "Points scored", "Points possible", "Score"].forEach((value, index) => {
    summaryHeader.getCell(index + 1).value = value;
  });
  summary.mergeCells("A12:B12");
  styleHeader(summaryHeader);

  const sections = groupBySection(items);
  sections.forEach(({ section, items: sectionItems }, index) => {
    const score = computeScore(sectionItems, answers);
    const row = summary.getRow(index + 13);
    row.getCell(1).value = section;
    summary.mergeCells(index + 13, 1, index + 13, 2);
    row.getCell(3).value = score.actual;
    row.getCell(4).value = score.possible;
    row.getCell(5).value = score.pct === null ? "—" : score.pct / 100;
    if (score.pct !== null) row.getCell(5).numFmt = "0.0%";
    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };
    });
    row.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: scoreFill(score.pct) } };
    row.getCell(5).font = { bold: true, color: { argb: scoreFont(score.pct) } };
  });

  const overall = computeScore(items, answers);
  const overallRow = summary.getRow(13 + sections.length);
  overallRow.getCell(1).value = "OVERALL";
  summary.mergeCells(overallRow.number, 1, overallRow.number, 2);
  overallRow.getCell(3).value = overall.actual;
  overallRow.getCell(4).value = overall.possible;
  overallRow.getCell(5).value = overall.pct === null ? "—" : overall.pct / 100;
  if (overall.pct !== null) overallRow.getCell(5).numFmt = "0.0%";
  overallRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.charcoal } };
    cell.border = thinBorder;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleGold } };
  });
  overallRow.getCell(5).font = { bold: true, color: { argb: scoreFont(overall.pct) } };

  const detail = workbook.addWorksheet("Checklist Detail", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 22 },
  });
  detail.columns = [
    { key: "code", width: 12 },
    { key: "item", width: 68 },
    { key: "weight", width: 12 },
    { key: "answer", width: 16 },
    { key: "note", width: 48 },
  ];
  const detailHeader = detail.addRow(["Code", "Checklist item", "Weight", "Answer", "Corrective note"]);
  styleHeader(detailHeader);

  sections.forEach(({ section, items: sectionItems }) => {
    const sectionRow = detail.addRow([section]);
    detail.mergeCells(sectionRow.number, 1, sectionRow.number, 5);
    sectionRow.height = 25;
    const sectionCell = sectionRow.getCell(1);
    sectionCell.font = { bold: true, color: { argb: COLORS.charcoal } };
    sectionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleGold } };
    sectionCell.alignment = { vertical: "middle" };
    sectionCell.border = thinBorder;

    sectionItems.forEach((item) => {
      const answer = answers[item.id];
      const row = detail.addRow([
        item.code,
        item.text,
        item.weight,
        answerLabel(answer?.answer),
        answer?.answer === "no" ? answer.note ?? "" : "",
      ]);
      row.eachCell((cell) => {
        cell.border = thinBorder;
        cell.alignment = { vertical: "top", wrapText: true };
      });
      const answerCell = row.getCell(4);
      const fill = answer?.answer === "yes" ? COLORS.greenSoft : answer?.answer === "no" ? COLORS.redSoft : COLORS.greySoft;
      const font = answer?.answer === "yes" ? COLORS.green : answer?.answer === "no" ? COLORS.red : COLORS.muted;
      answerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      answerCell.font = { bold: true, color: { argb: font } };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ACE_${safeFileName(storeName)}_${audit.period}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}