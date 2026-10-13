# Contributing

Thanks for helping! Bug reports, ideas, translations and pull requests are all welcome.

## Getting started

```bash
npm ci
npm run dev        # Electron + Vite with hot reload
npm run typecheck
npm test
```

Node.js 22+ is required. On first run the app downloads yt-dlp and FFmpeg into its user‑data folder.

## Project layout

| Path | What lives there |
| --- | --- |
| `src/main` | Electron main process: queue, yt-dlp/FFmpeg management, embedded browser, IPC |
| `src/main/services/*Args.ts`, `sniffRules.ts`, `binaryAssets.ts` | Pure helpers with unit tests — keep them free of Electron imports |
| `src/preload` | The typed `window.api` bridge |
| `src/shared` | Types and the `Api` interface shared by main and renderer |
| `src/renderer` | React UI |
| `src/renderer/src/i18n` | `ar.json` and `en.json` |

Tip: when you open `http://localhost:5173` in a normal browser during `npm run dev`, the UI runs against a mock
API (`src/renderer/src/lib/mockApi.ts`), which is handy for design work. Query params:
`?page=library&lang=en&analyze=<url>`.

## Guidelines

- **TypeScript strict**, no `any` without a good reason. Run `npm run typecheck` and `npm test` before opening a PR.
- **Strings** go in *both* `ar.json` and `en.json`. Never hard‑code user‑facing text.
- **RTL‑safe CSS**: use logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`) instead of
  `left`/`right`. Avoid `letter-spacing` on text that may be Arabic (it breaks letter joining).
- **IPC is a security boundary.** Validate every argument in `src/main/ipc.ts`; never pass renderer input to a shell.
  The embedded browser must stay sandboxed with no preload and no granted permissions.
- **Cross‑platform**: don't assume Windows. Use `path` helpers, avoid shell‑specific commands, and keep
  platform branches small and documented.
- Add unit tests for new pure logic (see `src/main/services/*.test.ts`).
- Keep PRs focused; describe what changed and how you tested it.

## Reporting bugs

Please include your OS and version, the app version, what you did, what you expected and what happened.
For a site that fails to download, first try *Settings → Update engine* — most breakages are fixed by a newer yt-dlp.
Do **not** paste cookies, tokens or private URLs.

## Code of conduct

Be kind and constructive. Harassment or discrimination of any kind is not tolerated.
