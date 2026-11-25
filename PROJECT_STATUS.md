# Aarohi project status

Last audited: 2026-11-25  
Repository: [rounakraj7573-lgtm/Aarohi](https://github.com/rounakraj7573-lgtm/Aarohi)  
Verified application-code commit: `d028672f8760284c8d4f0a23c78582e202f2d35c`

Status meanings:
- **VERIFIED** — supported by a repeatable automated test or a current platform/runtime check.
- **PARTIAL** — some evidence exists, but end-to-end behavior or important cases remain unverified.
- **NOT TESTED** — no reliable verification evidence yet.

| Area | Status | Evidence and remaining work |
|---|---|---|
| Backend deployment | VERIFIED | Render reports the backend deployment containing application commit `d028672` as live. Startup completed; Render's `HEAD /` and `GET /` probes returned HTTP 200 after the latest change. |
| Frontend deployment | VERIFIED | Render reports the static frontend deployment containing application commit `d028672` as live. Build completed; a real Android/browser interaction session is still unavailable. |
| Backend health and security headers | VERIFIED | `/api/health` and security-header behavior pass automated TestClient checks. Render logs recorded `GET /api/health` 200 on 2026-11-25 01:47 UTC; latest deployment logged `HEAD /` 200 and `GET /` 200 at 03:08 UTC. |
| Frontend desktop/mobile behavior | PARTIAL | Responsive CSS, mobile menu, and asset serving are covered by source/endpoint tests; no real browser automation or Android interaction test yet. |
| AI provider configuration | PARTIAL | Provider allowlist and configured-provider filtering are tested; a mocked Gemini chat request passes. Render logged `GET /api/providers` 200, but live model responses, per-provider connectivity, and free quotas are not verified. |
| Chat behavior | PARTIAL | Chat route and Aarohi identity prompt pass a mocked Gemini test. A real model response and provider failure/retry behavior remain unverified. |
| Web research and recent news | PARTIAL | Search/date parsing and article filtering have regression tests. Previous user tests still reported poor or missing global news results; recent live cross-country article relevance, publisher/date accuracy, and original-link quality are not verified. |
| Website reader | PARTIAL | Direct HTML parsing and search-only fallback exist. Python Docs and WHO worked in user tests; Britannica returned 403 and fallback results were weak. The model must continue distinguishing fetched page text from search snippets. |
| Cloud Python execution | NOT TESTED | Tensorlake integration exists and correctly reports an unconfigured sandbox in a test. No actual deployed safe sandbox execution or current free-quota confirmation has been completed. |
| Workspace files and downloads | PARTIAL | Browser UI files use localStorage and persist only in that browser. Backend workspace endpoints are separate temporary in-memory storage and are not wired to the UI; neither provides durable cloud sync. Local browser download behavior still needs a real browser round-trip test. |
| Chat history export/import | PARTIAL | Browser-side HTML/JSON backup code exists and is source-checked; complete export-then-import round-trip remains untested in a real browser. |
| Access control, CORS, rate limits, SSRF safeguards | PARTIAL | Access-code enforcement, provider allowlist, rate limiting, filename/path validation, and public-IP URL checks have regression tests. A new CORS preflight test verifies the configured frontend origin and access-code header. This is not a security certification; DNS rebinding and broader abuse cases remain to assess. |
| Performance and error handling | PARTIAL | Provider timeouts and errors have appeared in earlier logs; a recent filtered log query found no matching timeout/error entries, but latency, resource use, and mobile performance are not benchmarked. |
| Continuous integration | VERIFIED | GitHub Actions [workflow #141](https://github.com/rounakraj7573-lgtm/Aarohi/actions/runs/45537786853) passed on application commit `d028672`: backend compilation, frontend JavaScript syntax check, and pytest all succeeded. The suite now contains 31 tests. |

## Current verification (2026-11-25)

- GitHub Actions workflow #140 passed after adding the CORS preflight regression test.
- GitHub Actions workflow #141: **success** on `d028672`; backend compile, `node --check static/app.js`, and `pytest -q` all passed.
- The test suite contains **31 tests** (29 previously, plus CORS preflight and root HEAD probe regression tests).
- Render backend and frontend deployments for application commit `d028672`: both **live**.
- Render backend logs confirmed `HEAD /` returned HTTP 200 at 2026-11-25 03:08:39 UTC and `GET /` returned HTTP 200 at 03:08:44 UTC. Before the fix, Render's HEAD probe returned 405.
- Render logs also recorded `GET /api/health` 200, `OPTIONS /api/providers` 200, and `GET /api/providers` 200 at 2026-11-25 01:47 UTC.
- A direct external HTTP probe could not be completed from the audit runtime because its DNS resolution failed. Platform logs and automated tests are the available verification evidence; this limitation is not represented as a public-browser test.

## Current evidenced fixes

- Current-news filtering no longer rejects every short single-segment article slug; it rejects known generic category paths while allowing article slugs such as `/japan-news`.
- Backend workspace writes enforce the 16 KB file limit in UTF-8 bytes, matching the documented/browser limit.
- The UI label says **Cloud AI · local files**, and README explains that browser-local files are not cloud-synced and backend workspace storage is temporary and separate.
- CORS preflight now has a regression test for the configured frontend origin and `X-Aarohi-Access-Code` header.
- Render previously received `HEAD /` 405 during deploy checks. The backend now serves a bodyless HTTP 200 response for root HEAD requests; the latest Render deployment logs confirm 200.

## Zero-cost guardrails

- No paid service, plan upgrade, billing change, secret change, or new runtime dependency was made in this audit.
- A connected provider or sandbox is not assumed to be free. Keep only explicitly approved free-quota providers enabled and verify current quotas before use.
- Cloud Python execution is not marked complete until an actual safe sandbox run succeeds and its cost/quota conditions are confirmed.

## Next verification priorities

1. Verify one real chat response and one safe Python run only if the configured provider/sandbox can be used within the user's ₹0 limit; do not expose or change secrets.
2. Improve search-source reliability and website-reader fallback relevance, and prevent the model from presenting search snippets as live webpage content.
3. Run real browser/Android flows for mobile menu, chat history export/import, workspace save/read/list/delete/download, and reload persistence.
4. Decide whether workspace files should remain explicitly browser-local or be moved to a durable cloud store; the current temporary in-memory API is not a persistence solution and no paid database may be introduced.
5. Complete a consolidated end-to-end regression pass before calling Aarohi production-ready.
