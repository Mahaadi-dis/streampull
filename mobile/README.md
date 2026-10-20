# StreamPull for Android

The Android version of StreamPull, built with [Flutter](https://flutter.dev). It does the same job as the desktop
app: paste a link, pick a quality, download — with a queue, notifications that keep working in the background, a
library of what you downloaded, Arabic/English (RTL) and the same six color themes. You can also **share a link from
any app** (YouTube, TikTok, Instagram, your browser …) to StreamPull.

> Version 1 has no in-app browser yet (the desktop app does). That is the next step.

## License

This folder is licensed under **GPL-3.0** (see [LICENSE](LICENSE)) because it links against
[`youtubedl-android`](https://github.com/yausername/youtubedl-android), which is GPL-3.0. The rest of the repository
is MIT.

## How it is put together

| Part | Where | Job |
| --- | --- | --- |
| UI | `lib/ui`, `lib/state` | Flutter screens: Home, Downloads, Library, Settings |
| Logic | `lib/core` | Ports of the desktop app's TypeScript (`src/shared`): quality ladder, yt-dlp arguments, channel/account handling, themes. Tested with the same vectors |
| Bridge | `lib/native`, `android/.../StreamPullChannel.kt` | A `MethodChannel` for calls and an `EventChannel` for live updates |
| Engine + queue | `android/.../Engine.kt`, `DownloadQueue.kt` | Bundled yt-dlp + FFmpeg (`youtubedl-android`), the download queue, the foreground service and notifications. Lives in native code so downloads survive the UI being closed |
| Saving | `android/.../MediaSaver.kt` | Files go to **Downloads/StreamPull** through MediaStore (no storage permission needed) |

Translations are the desktop app's own `ar.json` / `en.json`, copied into `assets/i18n` by
`dart run tool/sync_i18n.dart` (a test fails when the copies are stale).

## Requirements

Android 10 (API 29) or newer. Pick the APK that matches your phone's CPU — almost every phone from the last
years is **arm64-v8a**.

## Build

You need the Flutter SDK, **JDK 21** and the **Android SDK** (platform 36). On Windows, build from a path without
non-ASCII characters (Java tools mishandle them) — a directory junction works.

```bash
cd mobile
flutter pub get
flutter test                                   # pure-Dart logic + widget tests
flutter build apk --release --split-per-abi    # one APK per CPU type
```

APKs end up in `build/app/outputs/flutter-apk/`.

## Signing releases (maintainers)

Updates only install over an existing copy when every release is signed with the **same key**. The release workflow
reads the key from four GitHub repository secrets: `SP_KEYSTORE_BASE64` (the keystore, base64), `SP_KEYSTORE_PASSWORD`,
`SP_KEY_ALIAS`, `SP_KEY_PASSWORD`. Without them the APKs are signed with a temporary debug key (fine for trying the
app, but not updatable). Keep the key private and backed up; never commit it.
