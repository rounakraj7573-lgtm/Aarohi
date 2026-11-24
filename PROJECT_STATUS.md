# Aarohi project status

Last audited: 2026-11-24  
Repository: [rounakraj7573-lgtm/Aarohi](https://github.com/rounakraj7573-lgtm/Aarohi)  
Audited deployed commit: `2fe267435c1653214c2bda6576af0fe5d909f49a`

Status meanings:
- **VERIFIED** — supported by a repeatable automated test or a current platform/runtime check.
- **PARTIAL** — some evidence exists, but end-to-end behavior or important cases remain unverified.
- **NOT TESTED** — no reliable verification evidence yet.

| Area | Status | Evidence and remaining work |
|---|---|---|
| Backend deployment | VERIFIED | Render reports the backend deploy for `48d42bc` as live; startup completed and health requests returned HTTP 200 in logs. |
| Frontend deployment | VERIFIED | Render reports the static-site deploy for `48d42bc` as live. A real browser/device session is not available in this audit. |
| Backend health and security headers | VERIFIED | `/api/health` and security-header behavior pass automated TestClient checks; Render logs also confirm the backend starts and serves `/` with HTTP 200. |
| Frontend desktop/mobile behavior | PARTIAL | Responsive CSS and mobile-menu controls exist; no real browser automation or Android interaction test yet. |
| AI provider configuration | PARTIAL | Provider allowlist and configuration logic exist; a mocked Gemini chat test is being added. Live provider-by-provider quota/connectivity checks remain outstanding. |
| Chat behavior | PARTIAL | Chat route and Aarohi identity prompt exist; mocked route coverage is being added. Real model responses and failure cases still need live verification. |
| Web research and recent news | PARTIAL | Render logs show Bing results but also DDGS timeouts, GDELT connection timeouts, and empty Google News feeds. Search quality and dated-source verification need further work. |
| Website reader | PARTIAL | Direct HTML reader and search-only fallback exist. User-reported tests show some sites work while Britannica returns 403 and fallback relevance is weak. |
| Cloud Python execution | NOT TESTED | Tensorlake sandbox integration exists; this audit does not confirm the deployed secret, free-tier availability, or a successful live sandbox run. |
| Workspace files and downloads | PARTIAL | Web UI stores files in browser localStorage; backend has separate temporary in-memory endpoints. They are not currently connected to each other. |
| Chat history export/import | PARTIAL | Browser-side HTML/JSON backup code exists; full browser round-trip testing remains outstanding. |
| Access control, CORS, rate limits, SSRF safeguards | PARTIAL | Controls exist in code; focused automated regression tests are being added, but this is not a security certification. |
| Performance and error handling | PARTIAL | Search-provider timeouts are visible in logs; broader latency, resource, and mobile performance testing remains outstanding. |
| Continuous integration | VERIFIED | Workflow [#138](https://github.com/rounakraj7573-lgtm/Aarohi/actions/runs/45323173397) passed on commit `2fe2674`: Python compile passed, `node --check static/app.js` passed, and all 29 pytest tests passed. |

## Current verification (2026-11-24)

- GitHub Actions workflow #138: **success**.
- `python -m py_compile app.py`: **passed**.
- `node --check static/app.js`: **passed**.
- `pytest -q`: **29 passed in 2.58 seconds**.
- Render backend and frontend deploys for commit `2fe2674`: both **live**.
- Backend startup completed and Render logged a successful `GET /` with HTTP 200. A direct external health-endpoint probe was not available in this audit; the health route and headers were verified through automated tests.

## Current evidenced fixes

- Current-news filtering previously rejected every single-segment URL slug shorter than 18 characters, including valid examples such as `/japan-news` and `/brazil-policy`. It now rejects known generic category paths without rejecting short article slugs.
- Backend workspace writes now enforce the 16 KB file limit in UTF-8 bytes, matching the documented/browser limit. This prevents multibyte text from exceeding the per-file byte cap.
- The UI label now says **Cloud AI · local files**, and the README distinguishes browser-local files from the separate temporary backend workspace API.

## Zero-cost guardrails

- No paid service, plan upgrade, billing change, secret change, or new runtime dependency was made for this audit.
- A connected provider or sandbox is not assumed to be free. Keep only explicitly approved free-quota providers enabled and verify current quotas before use.
- Cloud Python execution is not marked complete until an actual safe sandbox run succeeds.

## Next verification priorities

1. Confirm this commit's CI passes, including backend tests and JavaScript syntax check.
2. Verify real Android/browser flows: access-code prompt, chat, mobile menu, backup export/import, and local workspace download.
3. Verify one real chat request and one safe Python run without exposing secrets.
4. Improve search-source reliability and the reader's blocked-site fallback relevance.
5. Complete one consolidated regression pass before calling Aarohi production-ready.
