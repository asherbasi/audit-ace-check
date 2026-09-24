# Head Office dashboard and styled Excel reports

## Dashboard

- Replace the Head Office comparison table with four summary cards: latest-audit network average, stores below 60%, best store, and worst store.
- Build a richer store performance table showing each store’s latest score, change from its previous audit, latest audit date, current-month status, report download, and store history link.
- Use the latest completed audit for downloads; keep current performance based on each store’s most recent audit so drafts already visible in the app remain represented.
- Add a network issues ranking from “No” answers in each store’s latest audit, listing the failed checklist item, section, affected-store count, and store names.
- Add a clear network-average trend chart by audit period rather than fifteen overlapping store lines.

## Excel reports

- Replace the current SheetJS export with ExcelJS in the browser.
- Create a styled **Summary** sheet with audit details, section results, overall result, borders, score colors, fixed widths, and frozen content headers.
- Create a styled **Checklist Detail** sheet with section divider rows, item details, colored Yes/No/N/A cells, corrective notes, wrapping, fixed widths, and a frozen column header.
- Keep the audit-screen download and add downloads for the latest completed audit on Head Office and store history pages.

## Verification

- Check calculations and report eligibility with stores having zero, one, and multiple audits.
- Verify dashboard and store-history downloads, chart rendering, desktop/mobile layout, and generated workbook structure.
- Preserve the existing score thresholds, branding, store records, open access, and audit workflow.

## Technical details

- Reuse existing audit, checklist, answer, scoring, and store queries; no database changes are required.
- Generate `.xlsx` files entirely in the browser using ExcelJS plus a Blob download.
- Derive current-month status from the audit date and trend as percentage-point change between the latest two audits.
