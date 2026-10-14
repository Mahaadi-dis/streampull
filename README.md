<div align="center">

<img src="resources/icon.png" width="96" alt="StreamPull logo" />

# StreamPull

**Download videos and audio from almost any site — in a modern desktop app with switchable color themes.**

![License: MIT](https://img.shields.io/badge/license-MIT-8b5cf6)
![Platforms](https://img.shields.io/badge/Windows-available%20%C2%B7%20macOS%20%7C%20Linux%20%7C%20Android-coming%20soon-7c3aed)
![Built with](https://img.shields.io/badge/built%20with-Electron%20%2B%20yt--dlp%20%2B%20FFmpeg-c084fc)

[العربية](README.ar.md) · English

<img src="docs/screenshots/home-en.png" alt="StreamPull — home screen" width="820" />

</div>

StreamPull is a desktop alternative to browser extensions like *Video DownloadHelper*: paste a link
**or** browse inside the app and let it catch the videos for you. It is powered by
[yt-dlp](https://github.com/yt-dlp/yt-dlp) (1000+ supported sites) and [FFmpeg](https://ffmpeg.org).

## Features

- **Paste a link, pick a quality** — every available resolution with an estimated size, or audio only (MP3 / M4A).
- **Built‑in browser that detects media** — play a video on any page and it shows up in the *Detected media* panel
  (direct files, HLS and DASH streams). Your logins are kept and reused for the download.
- **Playlists** — select, search and download many items at once.
- **YouTube channels** — paste a channel link, choose **Videos**, **Shorts** or **Live streams**, then pick everything
  or just the ones you want (live/upcoming streams are skipped automatically).
- **TikTok & Instagram accounts** — paste a profile link and choose which posts to download. TikTok works out of the box.
  Instagram only shows full profiles to signed‑in users, so an account list needs a one‑time sign‑in inside the built‑in
  browser (the app then reuses that session). Direct links to public Instagram posts and reels work without signing in.
- **Smart queue** — parallel downloads, pause / resume / cancel / retry, live speed and ETA.
- **Library** — history with search, filters, *open file*, *show in folder*, *download again*.
- **Color themes** — Violet, Ocean, Emerald, Rose, Sunset or Midnight black; change it any time in *Settings → Appearance*.
- **Arabic first, English too** — full RTL layout, switchable at any time.
- **Auto‑updating engine** — yt-dlp refreshes itself daily, because sites change constantly.
- **Private by design** — no accounts, no telemetry, nothing leaves your machine except the downloads you start.

<p align="center">
  <img src="docs/screenshots/library-en.png" width="400" alt="Library" />
  <img src="docs/screenshots/browser-ar.png" width="400" alt="Built-in browser (Arabic UI)" />
</p>
<p align="center">
  <img src="docs/screenshots/settings-en.png" width="400" alt="Settings with theme picker" />
</p>

## Download

Get the latest Windows build from the [**Releases**](../../releases) page:

| File | What it is |
| --- | --- |
| `StreamPull-Setup-x.y.z.exe` | Installer (adds a Start menu entry, uninstaller) |
| `StreamPull-x.y.z-portable.exe` | Portable — run it from anywhere, nothing to install |

> **Coming soon:** macOS, Linux and Android versions are planned for the next few days.
> Star or watch the repository to get notified when they land.

**The builds are not code‑signed yet**, so Windows SmartScreen may warn you the first time:
*More info → Run anyway*.

On first launch the app downloads **yt-dlp** and **FFmpeg** (about 50 MB, one time) into its own data folder.

## Build from source

Requires Node.js 22+.

```bash
git clone https://github.com/Mahaadi-dis/streampull.git
cd streampull
npm ci
npm run dev          # run the app with hot reload
npm run typecheck    # TypeScript
npm test             # unit tests
npm run dist:win     # builds the Windows installer + portable exe into ./release
```

`dist:mac` and `dist:linux` also exist, but those platforms are **not released or tested yet** (coming soon).
Installers must be built on their own OS.

## How it works

```
renderer (React)  ──IPC──▶  main process (Electron)  ──spawn──▶  yt-dlp ──▶ FFmpeg
   UI / i18n / state          queue, history, settings            downloads, merging
                              embedded browser view  ─▶ sniffs network responses for media
```

- `src/main` — queue, yt-dlp/FFmpeg management, embedded browser + media sniffing, IPC (inputs are validated).
- `src/preload` — the small, typed `window.api` bridge (context isolation on, sandbox on).
- `src/renderer` — React UI, Tailwind, Framer Motion, Zustand, Arabic/English strings.
- The embedded browser runs in its own isolated session with **all permissions denied**, and the web content has no access to the app API.

## Limitations

- **DRM‑protected** services (Netflix, Disney+, …) are not supported and never will be.
- Signing in with a **Google account** inside the built‑in browser is often blocked by Google.
- The built‑in browser has a single tab for now.
- macOS, Linux and Android versions are coming soon (see above).

## Legal

StreamPull is a general‑purpose tool. **Only download content you own or are allowed to download**, and respect
copyright law and each site's terms of service. The authors do not endorse piracy and are not responsible for how
the software is used. The app does not circumvent DRM.

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
Translations are just two JSON files under `src/renderer/src/i18n/`.

## License

[MIT](LICENSE). Third‑party components are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
