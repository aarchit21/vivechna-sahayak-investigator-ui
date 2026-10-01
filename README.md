# Vivechna Sahayak investigator interface

A responsive prototype built around the linked FIR. It imports the source page's full 637-step payload and keeps the original step IDs, FIR fields, warnings, and citation metadata.

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

System navigation stays in the sidebar (or the mobile bottom bar): Dashboard, Cases, Work Queue, Search, and Reports. The demo contains one case. Opening it displays the current FIR and case tabs in the main area, with breadcrumbs and a return to the case list. The on-screen Back controls and browser Back/Forward return to previous views; hash URLs preserve the selected page on refresh. Queue and library searches remain separate and stay in memory when moving between pages.

- **Overview:** compact case context, record warnings, progress, and immediate actions.
- **Work queue:** phase, priority, search, grouped tasks, checklist, legal basis, and sources.
- **Special procedures:** separate Heinous Crime, Murder, and Theft additions. Add a section to the case only after reviewing it. Robbery steps within Theft are labelled.
- **All steps:** the complete imported source library, including other special-crime reference material.
- **FIR record:** all structured fields, narrative, original text, and record warnings.

The initial section mapping is curated in `src/lib/investigation.ts`. A police subject-matter owner should verify those assignments and the underlying procedure before operational use. See [BACKEND_CONNECTION.md](BACKEND_CONNECTION.md) for the proposed future API.
