Last Updated: 2025-12-02

# SenseType AI — Codex Notes

- For product vision, UI/UX flow, and architecture choices, see `docs/start.md`; this file only captures extra guardrails and process details.

## Repo Safety & Scope
- Stay within the current working directory; modifying files elsewhere requires explicit confirmation.
- Current repo content is documentation-only (`docs/start.md`); extension code and backend binaries are not yet scaffolded.

## Git Protocol
- Before any commit, list the files that would be committed and show the commit message, then wait for explicit approval.
- Do not commit `CLAUDE.md`. Keep `docs/` changes uncommitted unless they directly relate to current work and are confirmed.

## Documentation Rules
- Store project docs under `docs/`; each doc must start with `Last Updated: YYYY-MM-DD`.
- For external references, use `[Name](URL) (accessed: YYYY-MM-DD)`.
- Maintain `README.md` with a brief intro for all files whenever new artifacts are added or renamed.

## User Identity
- “Lin Guanguo / linguanguo / Lin-Guanguo” all refer to the same user; preserve this mapping in any user-facing content.

## Extra Dev References (from `docs/references/README.md`)
- Key repos to mine patterns: `raycast/extensions` (search `spawn`, `execFile`, `assetsPath`), `raycast/extensions-swift-tools` (bundled binaries layout), `bfollington/raycast-process-list` (frequent updates), and the Everything Search extension (external CLI integration).
- Prefer `@raycast/utils` `useExec` (or `usePromise`) over raw `child_process` for running binaries.
- Store guidelines: heavy binaries discouraged; if binary >~10MB, implement first-run download with SHA-256 integrity checks instead of bundling.
- Bundling rule of thumb: small binaries can live in `assets/`; large ones should be downloaded with verification and an open build process.
