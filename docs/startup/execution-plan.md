Last Updated: 2025-12-02

# SenseType AI Execution Plan

## 1) Context & Objectives
- Deliver a Raycast React extension that acts like an AI-assisted input method: real-time typing → debounce → OpenRouter transform → live output → copy on exit (vision: `docs/start.md`).
- MVP target: <1 s perceived latency for 200 chars, stable copy-on-exit, no crashes, and clear error toasts.
- Keep the stack pure TypeScript (Raycast runtime) without extra compiled binaries; all model calls go through OpenRouter HTTP.
- Favor low-latency UX, safe key handling, and store compliance from the start.

## 2) Technical Stack Options
- **Frontend & Logic**: TypeScript + React + Raycast APIs; prefer `@raycast/utils` (`usePromise`) over raw `fetch` wrappers for cancellation.
- **LLM provider**: Use OpenRouter per [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart) (accessed: 2025-12-02); load API key from `.env` at runtime for dev, prefer Raycast password preference (Keychain) for shipped builds.
- **Networking**: Direct HTTPS calls from the Raycast command; no separate backend service or compiled binaries.

## 3) Architecture & Data Flow
- UI: Controlled `Form.TextArea` for input + `Detail`/`Form.TextArea` for output; `ActionPanel` with copy/regenerate; clipboard on exit.
- Data path: input change → debounce (e.g., 300–500 ms) → `usePromise` call → OpenRouter HTTP POST → parse response → render output; surface errors via toast and console logging.
- Modes: start with per-request calls; if latency is high, add incremental/streaming rendering when OpenRouter streaming is enabled.
- Preferences: password-type API key fields stored in Keychain when using cloud models (fallback to `.env` for local dev).
- LLM call: Frontend invokes OpenRouter using key from env/Keychain and returns normalized `{ text, meta }` JSON.

## 4) Project Structure
- `src/index.tsx`: Main command UI (controlled input/output, debounce wiring, action panel, toasts, copy-on-exit).
- `src/openrouter.ts`: Client wrapper around OpenRouter HTTP API with abort support, normalized `{ text, meta }` output.
- `src/debounce.ts`: Shared debounce helper (or lodash wrapper).
- `assets/`: Icons only (no binaries).
- `docs/`: Vision (`start.md`), supplements (`start-gemini.md`, `start-codex.md`), references, and this plan.
- `package.json`: Raycast manifest (`raycast` block) + scripts for TS build and lint/format.

## 5) Execution Plan (Phased)
- **Phase 0 — Setup**: Scaffold Raycast extension (`npm init raycast-extension`), add TypeScript lint/format configs, stub assets folder.
- **Phase 1 — API Client Prototype**: Implement `src/openrouter.ts` wrapper returning `{ text, meta }`; handle aborts/timeouts; add minimal tests with mocked HTTP.
- **Phase 2 — UI Skeleton**: Build input/output form, wire debounce, add action panel, error toasts, and copy-to-clipboard action.
- **Phase 3 — Integration**: Call OpenRouter via `usePromise`; handle aborts for stale input; display loading state without flicker; log errors to console; read key from `.env` (dev) and from Raycast password preference (release).
- **Phase 4 — UX & Perf**: Tune debounce (start 300–500 ms), add optional streaming rendering, ensure smooth exit-copy behavior; add preference inputs for API keys/models if needed.
- **Phase 5 — Packaging**: Update manifest metadata (icon, title, author); ensure `.env` not bundled; add scripts for lint/build; confirm no external binaries.
- **Phase 6 — QA**: Manual smoke via `ray develop`; add lightweight unit tests for debounce and OpenRouter parsing; verify Keychain usage for secrets.
- **Phase 7 — Store Readiness (optional)**: Apply AI extension guidelines (model transparency, key handling), add changelog/README notes.

## 6) Acceptance Criteria
- API client: `src/openrouter.ts` returns valid `{ text, meta }` within <200 ms overhead on a ~200 char prompt (excluding network latency); unit test covers happy/error paths with mocked HTTP.
- Frontend: Debounce 300–500 ms; stale requests cancelled; loading state avoids flicker; output updates from OpenRouter JSON; errors show toast and preserve last good output; exit copies output to clipboard.
- Integration: `usePromise` path works on macOS dev with Raycast; aborts prevent stale output; errors logged.
- Packaging: `npm run build` produces TS bundle; manifest has icon/title/author; `.env` excluded; no external binaries required.
- QA: Manual `ray develop` verifies typing latency acceptable, copy-on-exit works, preference fields (if used) persist via Keychain.
- LLM: OpenRouter call follows quickstart; key loaded from `.env` during dev; missing/invalid key surfaces toast and logs cleanly without crashing.

## 7) Testing & Validation
- Unit: debounce helper, OpenRouter response parsing/normalization, error paths with mocked HTTP.
- Integration: invoke OpenRouter wrapper via `usePromise` with sample inputs (mocked for CI); ensure stale response cancellation works.
- Manual: Raycast dev run for typing latency, clipboard-on-exit, failure toasts, and preference flow.

## 8) Risks & Mitigations
- **Latency**: Use streaming mode if available; keep debounce adaptive; cache model choice to avoid extra calls.
- **Stale responses**: Use `AbortController` cancellation; track request IDs.
- **API key safety**: Only accept user-provided keys via `preferences` or `.env` in dev; avoid bundling secrets.
- **Network limits**: Handle rate limits/429 with backoff messaging; surface clear toasts for connectivity issues.

## 9) Immediate Next Steps
- Finalize JSON I/O contract `{ text, meta }` and model defaults for OpenRouter.
- Scaffold extension + `src/openrouter.ts` wrapper and wire a mock processing loop.
- Add scripts for lint/build and ensure `.env` loading in dev (Keychain preference planned for release).
