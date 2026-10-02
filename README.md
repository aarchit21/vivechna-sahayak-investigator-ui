# Vivechna Sahayak investigator interface

A responsive investigator prototype with the original 637-step Bopal case and a focused 854-step investigation workflow for the linked Sanand case. Stable step IDs, source citations, priorities and investigative detail are preserved.

**Public demo:** https://aarchit21.github.io/vivechna-sahayak-investigator-ui/

The public repository and demo intentionally include the exact linked FIR, including personal information, as authorized for this publication. GitHub Pages has no investigator authentication. Do not use the demo to record operational progress.

## Run

1. Install dependencies: `pnpm install`
2. Start the app: `pnpm dev`
3. Open `http://localhost:5173`

In this Codex Windows workspace, the bundled pnpm wrapper may try to reinstall packages when running a script. After installation, the equivalent direct commands are:

```powershell
.\node_modules\.bin\vite.cmd --configLoader runner --host 127.0.0.1
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\vite.cmd build --configLoader runner
.\node_modules\.bin\vitest.cmd run --configLoader runner
```

The app starts in **demo mode**. Progress, warning review, and confirmed special sections live only in memory and reset on refresh. The imported case contains real personal information from the linked record and is included in the public build.

Use `pnpm build` for a production bundle and `pnpm test` for the data and adapter checks. The frontend is not connected to the live case page or a backend at runtime.

## What to review

System navigation stays in the top bar on desktop and mobile: Dashboard, Cases, Work Queue, Search, and Reports. The case list includes the original case and the Sanand procedure preview. Opening a case displays the current FIR and case tabs in the main area, with breadcrumbs and a return to the case list. The on-screen Back controls and browser Back/Forward return to previous views; hash URLs preserve the selected page on refresh. Queue and library searches remain separate and stay in memory when moving between pages. The top bar includes a dark mode toggle. The first visit follows the browser’s light/dark preference; an explicit choice is remembered on this device. Case progress still resets on refresh.

- **Overview:** compact case context, record warnings, progress, and immediate actions.
- **Investigation:** numbered connected stages, distinct General Investigation Steps and Crime-Specific Investigation Steps, completion progress, next recommended action, phase/priority/status/search filters, and expandable checklists, legal basis and citations. References are optional reading; should-do actions are not downgraded to optional. The system Work Queue keeps its existing phase filters.
- **Special procedures:** separate Heinous Crime, Murder, and Theft additions. Add a section to the case only after reviewing it. Robbery steps within Theft are labelled.
- **All steps:** the complete imported source library, including other special-crime reference material.
- **FIR record:** all structured fields, narrative, original text, and record warnings.

The initial section mapping is curated in `src/lib/investigation.ts`. A police subject-matter owner should verify those assignments and the underlying procedure before operational use. See [BACKEND_CONNECTION.md](BACKEND_CONNECTION.md) for the proposed future API.

## Sanand investigation redesign

Open the linked case preview at `#/cases/11192050250093-2025/queue`, or select **Cases → Open investigation**. Source: http://200.234.38.244/cases/11192050250093-2025/index.html (read on 2 October 2026).

`src/data/sanand-procedures.json` retains all **854 steps** (335 must do, 276 should do, 243 reference) and **1,991 source links**. It exports procedural fields and basic FIR number/station/offence context only. Personal FIR fields and narrative are omitted; case-identifying strings within procedural passages are replaced with `[case detail withheld]`. Stable IDs, source citations and deadline wording are preserved. This preview offers Investigation and All steps, with no personal FIR view.

Sexual offences / POCSO and Children / Abduction are suggested from the stated sections. Trafficking and cyber material follow the source routing and require applicability review; they do not establish additional offences. Every additional section requires investigator confirmation. Other source-linked material remains accessible in a separate disclosure and in All steps.

Navigation numbering and the current recommendation follow source phases, group order and priorities; they are not new legal dependencies. No progress is inferred from a registered FIR. Confirmed modules and task progress remain isolated by case in memory while navigating, and reset on refresh. A police subject-matter owner must review classification and source instructions before operational use.
