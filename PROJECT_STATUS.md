# Aarohi project status

Last audited: 2026-11-28  
Code revision under audit: `404c098de8dfb362110260b23ca83f5cbb2c27cf`

Status meanings:
- **VERIFIED** — supported by a repeatable automated test or a current platform/runtime check.
- **PARTIAL** — some evidence exists, but end-to-end behavior or important cases remain unverified.
- **NOT TESTED** — no reliable verification evidence yet.

| Area | Status | Evidence and remaining work |
|---|---|---|
| Backend deployment | VERIFIED | Render reports code revision `404c098` live on 2026-11-28. Build succeeded; Uvicorn startup completed and Render recorded `HEAD /` 200 plus `GET /` 200. |
| Frontend deployment | VERIFIED | Render reports static-site deploy for `404c098` live on 2026-11-28. Real browser and Android interaction testing is still outstanding. |
| Backend health | VERIFIED | CI TestClient /api/health and homepage checks pass; Render's 2026-11-28 deployment probes returned root HEAD/GET 200. Direct public /api/health fetch was blocked by DNS/network access in this audit runtime, so no fresh external health response is claimed. |
| Frontend/mobile UI | PARTIAL | Frontend JavaScript syntax check passes; responsive layout and mobile-menu source checks exist. No real Android/browser interaction session or accessibility audit yet. |
| AI providers | PARTIAL | Provider allowlist/configuration checks and mocked provider chat tests pass. Live provider responses, current free quotas, and provider-specific failure/retry behavior are not verified. No paid calls were made. |
| Chat | PARTIAL | Chat route and Aarohi identity behavior have mocked tests. A live model conversation has not been verified in this audit. |
| Web research and recent news | PARTIAL | Broad world-news mode now queries 12 named countries across six continent buckets using local Google News editions plus Bing RSS/DDGS; returns at most one article per country and fewer than 10 if too few country queries produce valid dated results. Country/continent query labels are carried through /api/research and Agent results. Mocked regression tests verify spread and no duplicate-country padding. Live deployed results, publication dates, original publisher URLs, and real 8-country coverage remain unverified. |
| Website reader | PARTIAL | Direct HTML extraction and a separate search-snippet fallback are implemented; fallback output explicitly says it is snippets, not fetched page content. No new deployed live-page read was performed. |
| Cloud Python sandbox | NOT TESTED | Tensorlake integration exists, but no actual safe deployed execution or verified zero-cost allowance has been established. Do not enable paid usage. |
| Workspace files/downloads | PARTIAL | Browser files are localStorage-only; backend workspace files are temporary in-memory storage and are not durable cloud sync. Full save/read/list/delete/download round-trip remains unverified in a real browser. |
| Chat export/import | PARTIAL | Browser-side HTML/JSON backup code exists; complete export-then-import round-trip has not been verified in a real browser. |
| Access, CORS, rate limits, SSRF and security | PARTIAL | Access-code enforcement, CORS preflight, rate limits, filename validation, public-URL checks and redirect-hop validation have automated coverage. This is not a security certification; DNS rebinding and broader abuse cases still need review. |
| Performance and error handling | PARTIAL | Timeouts, bounded concurrency, rate limits and error responses have source/tests. Recent-news requests now skip GDELT because its seen timestamp is not a verified publisher date and every such candidate was rejected as undated; this removes an unusable request per search. No load test, latency benchmark, or Android performance measurement yet. Render returned no /api/health request datapoints in this audit window. |
| Continuous integration | VERIFIED | GitHub Actions [workflow #46103494928](https://github.com/rounakraj7573-lgtm/Aarohi/actions/runs/46103494928) passed on `404c098`: backend compile, frontend JavaScript syntax check, and pytest all succeeded. Test output: **57 passed in 2.84s**. |

## Current audit evidence (2026-11-28)

- Fixed a concrete global-news routing gap: the previous worldwide mode searched six broad topics and could return ten results dominated by a small number of countries.
- Worldwide mode now searches 12 country targets across Asia, Europe, Africa, North America, South America, and Oceania using each target's local Google News edition plus Bing RSS/DDGS. It returns no more than one result per country query; if fewer than ten countries return valid dated articles, Aarohi returns fewer rather than padding with duplicates.
- Added country_query and continent_query metadata through the research endpoint and Agent. The Agent is instructed that these are query buckets, not proof of publisher origin or event location, and to disclose when fewer than eight country buckets are present.
- Recent-news searches now skip GDELT: its seendate is an indexing/seen timestamp, not the publisher's original publication timestamp, and the strict filter rejected those candidates as undated. GDELT remains available for non-news research.
- Added three regression tests for country-balanced routing, no duplicate-country padding when results are missing, and API metadata preservation.
- GitHub Actions workflow #46103494928 passed on code commit 404c098: **57 tests passed in 2.84s**, backend compilation passed, and frontend JavaScript syntax validation passed.
- Render backend and frontend deployments for 404c098 both reached live. Backend logs show Uvicorn startup complete and Render's root HEAD/GET probes returned 200; frontend logs report the site live.
- A direct public fetch of the backend /api/health and frontend root could not be completed from this audit runtime because DNS/network resolution was unavailable. The /api/health TestClient test passed; this is not a live external HTTP verification.
- No live world-news query or live AI-provider call was made, because external fetch was unavailable and configured provider quotas/costs cannot be assumed. Global news quality remains PARTIAL.
- No secret or environment variable was changed, no paid dependency or API call was added, and the backend Render service remains on its Free plan.

## Previous audit evidence (2026-11-27)

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
