# Aarohi project status

Last audited: 2026-11-27  
Current main revision: `8e3fe6e647f2024e3ea569cd3e38c30e935fdac6`

Status meanings:
- **VERIFIED** — supported by a repeatable automated test or a current platform/runtime check.
- **PARTIAL** — some evidence exists, but end-to-end behavior or important cases remain unverified.
- **NOT TESTED** — no reliable verification evidence yet.

| Area | Status | Evidence and remaining work |
|---|---|---|
| Backend deployment | VERIFIED | Render build and deploy for `8e3fe6e` both succeeded on 2026-11-27. Uvicorn startup completed; Render recorded `HEAD /` 200 and `GET /` 200 after deployment. |
| Frontend deployment | VERIFIED | Render static-site build and deploy for `8e3fe6e` both succeeded on 2026-11-27. Real browser and Android interaction testing is still outstanding. |
| Backend health | VERIFIED | Current CI TestClient health checks pass. Render recorded `GET /api/health` 200 on 2026-11-26 08:11 UTC and the latest deployment's root HEAD/GET probes returned 200. A separate public HTTP probe could not be completed from the audit environment. |
| Frontend/mobile UI | PARTIAL | Frontend JavaScript syntax check passes; responsive layout and mobile-menu source checks exist. No real Android/browser interaction session or accessibility audit yet. |
| AI providers | PARTIAL | Provider allowlist/configuration checks and mocked provider chat tests pass. Live provider responses, current free quotas, and provider-specific failure/retry behavior are not verified. No paid calls were made. |
| Chat | PARTIAL | Chat route and Aarohi identity behavior have mocked tests. A live model conversation has not been verified in this audit. |
| Web research and recent news | PARTIAL | Search-intent regression tests now cover natural requests such as “Find information”, “Search for”, “Search Japan”, “Look for”, and “Find out”. Normal explanatory questions and search-engine-topic questions do not trigger search; explicit no-search instructions override search words. Current CI passes. Still unverified: live search reliability and a result set with 10 dated original articles from at least 8 countries across continents. |
| Website reader | PARTIAL | Direct HTML extraction and a separate search-snippet fallback are implemented; fallback output explicitly says it is snippets, not fetched page content. No new deployed live-page read was performed. |
| Cloud Python sandbox | NOT TESTED | Tensorlake integration exists, but no actual safe deployed execution or verified zero-cost allowance has been established. Do not enable paid usage. |
| Workspace files/downloads | PARTIAL | Browser files are localStorage-only; backend workspace files are temporary in-memory storage and are not durable cloud sync. Full save/read/list/delete/download round-trip remains unverified in a real browser. |
| Chat export/import | PARTIAL | Browser-side HTML/JSON backup code exists; complete export-then-import round-trip has not been verified in a real browser. |
| Access, CORS, rate limits, SSRF and security | PARTIAL | Access-code enforcement, CORS preflight, rate limits, filename validation, public-URL checks and redirect-hop validation have automated coverage. This is not a security certification; DNS rebinding and broader abuse cases still need review. |
| Performance and error handling | PARTIAL | Timeouts, bounded concurrency, rate limits and error responses have source/tests. No load test, latency benchmark, or Android performance measurement yet. Render returned no HTTP request/latency datapoints in the inspected 24-hour metrics window. |
| Continuous integration | VERIFIED | GitHub Actions [workflow #45932678581](https://github.com/rounakraj7573-lgtm/Aarohi/actions/runs/45932678581) passed on `8e3fe6e`: backend compile, frontend JavaScript syntax check, and pytest all succeeded. Test output: **54 passed in 3.75s**. |

## Current audit evidence (2026-11-27)

- Tightened agent search routing so bare “search engine” topics no longer count as a request to browse, while “search for X” and “search X” remain supported.
- Expanded negative-intent handling for “web search is not needed”, “no search”, “without browsing”, “don't search”, and Hinglish “bina web search”.
- Added 16 parametrized regression cases in `tests/test_search_intent.py` covering positive research intent, normal explanatory questions, search-engine topics, and explicit no-search instructions.
- GitHub Actions workflow #45932678581 passed: **54 tests passed in 3.75 seconds**, plus backend compile and frontend JavaScript syntax check.
- Render backend and frontend both built and deployed revision `8e3fe6e` successfully. Backend logs show Uvicorn startup complete and Render's root HEAD/GET probes returned 200.
- Render service configuration reports both services on the Free plan. No secrets were read or changed, no new runtime dependency was added, and no paid API/service was used.
- A direct public HTTP probe from this audit environment was unavailable; the endpoint response itself was not independently fetched during this run.

## Zero-cost guardrails

- Keep total project cost at ₹0. Do not add paid hosting, databases, subscriptions, API calls, upgrades, or billing changes.
- A provider key or sandbox integration is not proof of a free quota. Confirm cost/quota conditions before any live use.
- Keep cloud Python execution marked NOT TESTED until a safe run succeeds under a verified zero-cost allowance.
- Do not make live AI-provider or sandbox calls solely for testing when their remaining free quota/cost is unknown.

## Next priorities

1. Run a deployed multi-country news search and inspect actual article count, publication dates, publisher names, original URLs, and country spread. Do not mark global news complete until the 8-country requirement is evidenced.
2. Verify live chat/provider connectivity only where the user's existing configured free quota is known to be sufficient.
3. Complete real browser/Android flows for chat, mobile layout, workspace files/downloads, and chat export/import.
4. Decide whether workspace files should remain explicitly browser-local or be moved to a genuinely durable zero-cost store; the current in-memory API is temporary.
5. Complete consolidated end-to-end testing before calling Aarohi production-ready.
