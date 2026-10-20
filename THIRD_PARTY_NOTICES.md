# Third-party notices

StreamPull is MIT-licensed (see [LICENSE](LICENSE)). It builds on the following projects.

## Downloaded at runtime (not bundled in this repository or in the installers)

On first run the app downloads these helper programs into its own data folder and runs them as
separate processes:

| Program | Source | License |
| --- | --- | --- |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | official GitHub releases | Unlicense (public domain) |
| [FFmpeg](https://ffmpeg.org) static builds | [eugeneware/ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) release `b6.1.1` | GPL — see the license files published with each build |
| Ad-blocker filter lists ([EasyList](https://easylist.to), [EasyPrivacy](https://easylist.to), uBlock Origin filters …) | fetched by the browser's ad blocker from the lists published in the [@ghostery/adblocker](https://github.com/ghostery/adblocker) repository | GPLv3+ / CC BY-SA 3.0 (EasyList), see each list's header |

Because they are fetched by the user's machine and not redistributed by this project, they do not
change the license of StreamPull itself. FFmpeg's source code is available at
<https://ffmpeg.org/download.html>.

## Android app (`mobile/`, GPL-3.0)

The Android app is a separate work under the GPL-3.0 (see [mobile/LICENSE](mobile/LICENSE)); the rest of the
repository stays MIT. Its APKs bundle:

| Component | License |
| --- | --- |
| [youtubedl-android](https://github.com/yausername/youtubedl-android) (`library`, `ffmpeg`), maintained as [junkfood02/youtubedl-android](https://github.com/JunkFood02/youtubedl-android) | GPL-3.0 |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) (shipped inside the library, updated at runtime) | Unlicense |
| CPython (bundled by youtubedl-android) | PSF License |
| FFmpeg builds (bundled by youtubedl-android) | GPL / LGPL, see the library's notices |
| [Flutter](https://flutter.dev) and Dart packages | BSD-3-Clause |
| [IBM Plex Sans Arabic](https://github.com/IBM/plex) | SIL OFL 1.1 (`mobile/assets/fonts/OFL.txt`) |

## Bundled dependencies

| Package | License |
| --- | --- |
| [Electron](https://www.electronjs.org) | MIT |
| [React](https://react.dev), [React DOM](https://react.dev) | MIT |
| [Zustand](https://github.com/pmndrs/zustand) | MIT |
| [Framer Motion](https://www.framer.com/motion/) | MIT |
| [Tailwind CSS](https://tailwindcss.com) | MIT |
| [lucide-react](https://lucide.dev) | ISC |
| [@ghostery/adblocker](https://github.com/ghostery/adblocker), @ghostery/adblocker-electron — the ad-blocking engine | MPL-2.0 |
| [@fontsource/inter](https://fontsource.org/fonts/inter) — Inter | SIL Open Font License 1.1 |
| [@fontsource/ibm-plex-sans-arabic](https://fontsource.org/fonts/ibm-plex-sans-arabic) — IBM Plex Sans Arabic | SIL Open Font License 1.1 |

Build and test tooling (Vite, electron-vite, electron-builder, Vitest, TypeScript) is used only
during development and is not shipped.
