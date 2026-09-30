# Connecting Vivechna Sahayak to a future backend

This is a **proposed contract** for the future case service. No backend source, deployed API, credentials, or document server was provided. The current frontend uses the imported local case payload and an in-memory demo adapter.

## 1. Switch the frontend to API mode

The UI calls the `InvestigationAdapter` in `src/lib/backend.ts`. In demo mode it loads `src/data/case.json`; in API mode it calls the endpoints below. Add a local `.env.local` file:

```dotenv
VITE_DATA_MODE=api
API_PROXY_TARGET=http://localhost:8080
```

Then run `pnpm dev`. Vite proxies `/api` to `API_PROXY_TARGET` during development. In deployment, serve the frontend and `/api` under the same HTTPS origin through the application gateway. Keep `VITE_DATA_MODE` unset for the demo. Never place credentials or secret keys in a `VITE_` variable; Vite exposes those values to the browser.

The frontend requests the case ID `11192011260307-2026`. Change the route/case selector before using multiple cases. All endpoint IDs are URL encoded by the adapter.

## 2. Proposed endpoints

All responses use JSON and an authenticated, authorized session. The frontend currently uses `credentials: 'include'`, so the backend should issue a secure, HttpOnly session cookie and check that the user may access this case. Restrict writes to authorized investigators, use HTTPS, and check request origin on write endpoints.

### `GET /api/cases/{caseId}/investigation`

Return one `InvestigationRecord`:

```json
{
  "case": {
    "fir": {
      "fir_number": "11192011260307/2026",
      "police_station": "Bopal Police Station",
      "sections_stated": ["BNS 103(1)", "BNS 309(6)"],
      "fields": [{ "k": "FIR No.", "v": "11192011260307/2026", "span": "11192011260307/2026" }],
      "data_quality_warnings": ["Check the structured record against the paper FIR"]
    },
    "fir_text": "Original FIR text",
    "routing": { "crime_types": ["murder", "theft, robbery and dacoity"], "sections": ["1031", "3096"] },
    "steps": [
      {
        "id": "core-registration-receive-information-any-mode",
        "title": "Receive cognizable information in any mode",
        "text": "Source-linked action text",
        "phase": "now",
        "triage": "REFERENCE",
        "group": "Register the case",
        "ticks": [{ "do": "First action" }],
        "legal_basis": ["Section 173(1) BNSS 2023"],
        "sources": [{ "document": "bnss_2023", "citation": "Bharatiya Nagarik Suraksha Sanhita, 2023", "section": "BNSS 173", "role": "operative" }]
      }
    ],
    "documents": { "bnss_2023": { "citation": "Bharatiya Nagarik Suraksha Sanhita, 2023", "file": "BNSS.pdf" } }
  },
  "confirmedModules": ["murder"],
  "modulesVersion": 3,
  "progress": {
    "core-registration-receive-information-any-mode": {
      "done": false,
      "completedTickIds": ["0"],
      "version": 1
    }
  }
}
```

The `case` object may initially reuse the imported payload shape. Preserve **all** steps, including the 244 `MUST_DO`, 170 `SHOULD_DO`, and 223 `REFERENCE` records in the current fixture. Keep each `step.id` stable across fetches and content updates. Preserve source document ID, citation, authority, section, page, role, and any supporting passages. Do not turn a source file path into a public URL automatically; supply an authorized document endpoint or signed URL when the document service is ready. The UI displays citation text when a file is unavailable.

For future case types, return the relevant case payload with the same fields. Keep `routing` grounded in the FIR's **stated** sections; do not silently infer or add offences. The frontend currently suggests Heinous Crime and Murder for BNS 103(1), and Theft for BNS 309(6), then requires an investigator to confirm each section. Update this mapping only after a police subject-matter review.

### `PUT /api/cases/{caseId}/modules`

Request:

```json
{ "confirmedModules": ["heinous", "murder", "theft"], "version": 3 }
```

Response:

```json
{ "confirmedModules": ["heinous", "murder", "theft"], "version": 4 }
```

Accepted module IDs are `heinous`, `murder`, and `theft`. Replace the set atomically after checking the submitted `version`; return **409 Conflict** for a stale version. Module confirmation changes which additional steps enter the active queue. It must not delete any saved task progress.

### `PATCH /api/cases/{caseId}/tasks/{stepId}`

Request:

```json
{ "done": true, "completedTickIds": ["0", "1", "1.0"], "version": 2 }
```

Response:

```json
{ "done": true, "completedTickIds": ["0", "1", "1.0"], "version": 3 }
```

Check case access, step membership, and `version` before storing. Return **409 Conflict** when another user has changed the task. `completedTickIds` in the imported fixture use zero-based action indexes (`"0"`, `"1"`) and nested indexes (`"1.0"`). When procedure content changes, migrate these indexes to backend-owned stable subtask IDs before accepting progress against the new revision. Do not equate subtask completion with the separate whole-step `done` field unless the approved workflow requires it.

## 3. Errors and operational safeguards

| Condition | API behavior | Current UI behavior |
| --- | --- | --- |
| Unauthenticated or forbidden | `401` or `403` | Shows access error and keeps the change unsaved. |
| Missing case or step | `404` | Shows a clear not-found error. |
| Stale version | `409` | Tells the investigator to reload; no silent overwrite. |
| Network failure or `5xx` | JSON error/status | Keeps the prior state and offers retry by reloading. |

The UI applies changes only after the adapter reports success. The backend should keep an audit trail of investigator identity, timestamp, old and new values, and case ID for task or section changes. Record-quality warnings are review markers in the demo; this contract does **not** yet persist their review state or change the FIR. Add an audited warning-review endpoint if that workflow becomes operational.

## 4. Integration checklist

1. Implement the three endpoints and return the JSON shape above. Keep the initial 637 imported step IDs and citation data intact.
2. Authenticate the user, authorize each case read/write, and put `/api` behind the same HTTPS origin as the frontend.
3. Configure `.env.local` for local development, start the backend, then start the frontend with `pnpm dev`.
4. Confirm that the case loads, a section can be added and removed, a task and subtask can be saved, and reloading restores backend state.
5. Exercise `401/403`, `404`, `409`, network outage, and unavailable source-document responses before rollout.

The exact record in `src/data/case.json` contains personal information. The current repository and GitHub Pages demo intentionally publish this record. This deployment has no investigator authentication and does not save progress; do not use it as an operational case system. A future backend deployment should restrict access to its API, logs, and backups, and should review whether the public static fixture remains appropriate.
