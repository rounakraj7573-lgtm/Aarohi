# Aarohi project status

Last audited: 2026-11-26  
Repository: [rounakraj7573-lgtm/Aarohi](https://github.com/rounakraj7573-lgtm/Aarohi)  
Current main revision: \`c1b3b24fc53e726bf18f511a9c9e7269695b67f2\`

Status meanings:
- **VERIFIED** — supported by a repeatable automated test or a current platform/runtime check.
- **PARTIAL** — some evidence exists, but end-to-end behavior or important cases remain unverified.
- **NOT TESTED** — no reliable verification evidence yet.

| Area | Status | Evidence and remaining work |
|---|---|---|
| Backend deployment | VERIFIED | Render reports the latest main revision \`c1b3b24\` live. Uvicorn startup completed; Render recorded \`HEAD /\` 200 and \`GET /\` 200 after the deployment. |
| Frontend deployment | VERIFIED | Render reports the latest main revision \`c1b3b24\` live and the static-site build completed. Real browser and Android interaction testing is still outstanding. |
| Backend health | VERIFIED | \`/api/health\` and root homepage are covered by passing TestClient tests. Render's deployment probes recorded root HEAD/GET 200. A separate public-browser HTTP probe was not available in this audit environment. |
| Frontend/mobile UI | PARTIAL | Frontend JavaScript syntax check passes; responsive layout and mobile-menu source checks exist. No real Android/browser interaction session or accessibility audit yet. |
| AI providers | PARTIAL | Provider allowlist/configuration checks and mocked provider chat tests pass. Live provider responses, current free quotas, and provider-specific failure/retry behavior are not verified. No paid calls were made. |
| Chat | PARTIAL | Chat route and Aarohi identity behavior have mocked tests. A live model conversation has not been verified in this audit. |
| Web research and recent news | PARTIAL | Multi-country wording now activates the broad-news route. A concrete bug was found: Google News/Bing RSS article links use provider redirect URLs that the search filter rejected as search-engine URLs. The backend now safely follows only those known provider redirects, validates every hop against the public-URL/SSRF guard, and retains the publisher article URL. Regression tests cover successful publisher resolution, unresolved provider wrappers, and private redirect rejection. Strict publication-date filtering remains; GDELT observation time is not treated as publication time. Still unverified: a live result set with 10 dated original articles from at least 8 countries across continents. |
| Website reader | PARTIAL | Direct HTML extraction and a separate search-snippet fallback are implemented; fallback output explicitly says it is snippets, not fetched page content. Prior user tests showed mixed site accessibility. No new deployed live-page read was performed. |
| Cloud Python sandbox | NOT TESTED | Tensorlake integration exists, but no actual safe deployed execution or verified free-quota condition has been established. Do not enable paid usage. |
| Workspace files/downloads | PARTIAL | Browser files are localStorage-only; backend workspace files are temporary in-memory storage and are not durable cloud sync. Full save/read/list/delete/download round-trip remains unverified in a real browser. |
| Chat export/import | PARTIAL | Browser-side JSON/HTML backup code exists; complete export-then-import round-trip has not been verified in a real browser. |
| Access, CORS, rate limits, SSRF and security | PARTIAL | Access-code enforcement, CORS preflight, rate limits, filename validation, public-URL checks and redirect-hop validation have automated coverage. This is not a security certification; DNS rebinding and broader abuse cases still need review. |
| Performance and error handling | PARTIAL | Timeouts, bounded concurrency, rate limits and error responses have source/tests. No load test, latency benchmark, or Android performance measurement yet. |
| Continuous integration | VERIFIED | GitHub Actions [workflow #150](https://github.com/rounakraj7573-lgtm/Aarohi/actions/runs/45747672703) passed on \`c1b3b24\`: backend compile, frontend JavaScript syntax check, and pytest all succeeded. Test output: **38 passed in 3.28s**. |

## Current audit evidence (2026-11-26)

- Fixed broad-news intent detection so a request for “at least 8 different countries across different continents” is routed to global news search instead of being treated as a generic unsupported browsing request.
- Fixed RSS redirect handling for Google News and Bing. The resolver follows at most five redirects, checks each hop with the existing public-URL validation, rejects unresolved search-engine wrappers, and accepts only the final publisher URL.
- Added three resolver regression tests. GitHub Actions workflow #150 passed with 38 tests.
- Render backend and frontend both report the latest main revision \`c1b3b24\` as **live**. Backend logs show startup complete, \`HEAD /\` 200, and \`GET /\` 200.
- No secrets were read or changed, no new runtime dependency was added, and no paid plan/API/service was introduced.

## Zero-cost guardrails

- Keep total project cost at ₹0. Do not add paid hosting, databases, subscriptions, API calls, upgrades, or billing changes.
- A provider key or sandbox integration is not proof of a free quota. Confirm cost/quota conditions before any live use.
- Keep cloud Python execution marked NOT TESTED until a safe run succeeds under a verified zero-cost allowance.

## Next priorities

1. Run a deployed multi-country news search and inspect the actual article count, publication dates, publisher names, original URLs, and country spread. Do not mark global news complete until the 8-country requirement is evidenced.
2. Verify live chat/provider connectivity only where the user's existing configured free quota is known to be sufficient.
3. Complete real browser/Android flows for chat, mobile layout, workspace files/downloads, and chat export/import.
4. Decide whether workspace files should remain explicitly browser-local or be moved to a genuinely durable zero-cost store; the current in-memory API is temporary.
5. Complete consolidated end-to-end testing before calling Aarohi production-ready.
