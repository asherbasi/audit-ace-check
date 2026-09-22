# Pizza Audit Pal

Build a web app called "ACE Audit" for tracking monthly store audits across 13 Pizza Hut stores.

DATA MODEL (use Supabase):

- stores: id, name, code, region (seed with a placeholder list of 13 stores I can rename later)

- audits: id, store_id, period, date, rgm, arm, unit_head, conducted_by, status (draft/completed), created_at

- audit_answers: id, audit_id, item_id, answer (yes/no/na), note (text, for corrective action when answer is "no")

- checklist_items: id, section, code, text, weight, hint (seed this table with the items below)

CHECKLIST STRUCTURE (6 sections, seed as checklist_items):

1. General — 7 items (weights 2,2,4,3,2,2,2)

2. Sales & Customer — 6 items (weights 3,2,3,2,1,1)

3. Product — 12 items (weights mostly 2, one at 1)

4. People — 4 items (weights 3,2,2,2)

5. Physical Security — 7 items (weights 2,2,1,2,1,1,1)

6. Finance / Cash — 9 items (weights 1,1,1,2,1,2,2,2,2)

[I'll paste the exact item text and weights in the next message / attach the reference file.]

CORE SCREENS:

1. Store list — pick a store, see its most recent audit score and a "Start new audit" button

2. Audit form — same store picks a period, fills the 6-section checklist with Yes/No/N/A toggles per item, auto-calculates section and overall scores as they go, and can add a note when marking "No" (what needs to be fixed)

3. Store dashboard — score history over time for one store (line chart), current section breakdown, open items still marked "No"

4. Head office dashboard — table of all 13 stores with their latest score and trend (up/down), sortable, so head office can see at a glance which stores need attention

5. Audit history — list of past audits per store, click to view a read-only summary of any completed audit

SCORING RULES:

- Each item is worth its weight if answered "Yes", 0 if "No", excluded from both actual and possible totals if "N/A"

- Section score = sum of item scores / sum of applicable weights, as a percentage

- Overall score = same logic across all sections combined

- Color code: green ≥85%, amber 60–84%, red <60%

AUTH:

Simple login (email/password via Supabase Auth) so each store's managers only edit their own store's audits, but head office accounts can view all stores. Keep it simple — two roles: "store" and "admin".

DESIGN:

Clean, professional, mobile-first (most use will be on phones in-store). Use a red/white color scheme fitting Pizza Hut branding. Sticky top navigation, card-based layout, progress bar on the audit form.

Start by setting up the Supabase schema and seeding the checklist_items table, then build the audit form screen first.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://audit-ace-check.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ac4be46d-2e34-40ec-a0fd-9fee2747115c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
