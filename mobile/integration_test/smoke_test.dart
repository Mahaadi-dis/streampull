// End-to-end smoke test of the real app on a device or emulator (run by CI): the bundled engine starts, a link is
// analyzed and downloaded through the native queue, the optional audio features work (MP3 with a square cover and a
// chosen bitrate), and the file shows up in the library.
//
// It needs a test site on the device's localhost:8099 (CI does `adb reverse tcp:8099 tcp:8099` and serves a generated
// clip, a cover image and a page that points at both, see tool/ci_smoke.sh):
//
//   flutter test integration_test/smoke_test.dart -d <device>

import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:streampull/core/analyze.dart';
import 'package:streampull/core/models.dart';
import 'package:streampull/native/native_api.dart';

const clipUrl = 'http://127.0.0.1:8099/clip.mp4';
const pageUrl = 'http://127.0.0.1:8099/page.html';

Future<T> eventually<T>(Future<T?> Function() probe, {required Duration timeout, required String what}) async {
  final end = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(end)) {
    final v = await probe();
    if (v != null) return v;
    await Future<void>.delayed(const Duration(seconds: 1));
  }
  fail('Timed out waiting for $what');
}

/// Downloads [req] and returns the finished item.
Future<DownloadItem> download(NativeApi api, Settings settings, DownloadRequest req) async {
  final added = await api.queueAdd([requestToNative(req, settings)]);
  expect(added, hasLength(1));
  final id = added.first.id;
  final item = await eventually(() async {
    final d = (await api.queueList()).where((x) => x.id == id).firstOrNull;
    return d != null && d.isFinished ? d : null;
  }, timeout: const Duration(minutes: 3), what: 'the download of ${req.title}');
  expect(item.status, 'completed', reason: '${item.error} ${item.errorDetail}');
  return item;
}

/// The bytes of a file this app saved to Downloads/StreamPull.
Uint8List readSaved(DownloadItem item) {
  final path = '/storage/emulated/0/${item.filePath}';
  return File(path).readAsBytesSync();
}

int indexOfAscii(Uint8List bytes, String needle, [int from = 0]) {
  final n = needle.codeUnits;
  for (var i = from; i <= bytes.length - n.length; i++) {
    var ok = true;
    for (var j = 0; j < n.length; j++) {
      if (bytes[i + j] != n[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

/// Width and height of the first JPEG in [bytes] at or after [from], or null.
({int w, int h})? jpegSize(Uint8List bytes, int from) {
  var i = from;
  while (i < bytes.length - 3 && !(bytes[i] == 0xFF && bytes[i + 1] == 0xD8)) {
    i++;
  }
  i += 2;
  while (i < bytes.length - 9) {
    if (bytes[i] != 0xFF) {
      i++;
      continue;
    }
    final marker = bytes[i + 1];
    if (marker >= 0xC0 && marker <= 0xC3) {
      return (h: (bytes[i + 5] << 8) | bytes[i + 6], w: (bytes[i + 7] << 8) | bytes[i + 8]);
    }
    final len = (bytes[i + 2] << 8) | bytes[i + 3];
    i += 2 + len;
  }
  return null;
}

/// Bitrate (kbps) of the first MPEG-1 Layer III frame after the ID3 tag, or null.
int? mp3Bitrate(Uint8List bytes) {
  if (bytes.length < 10 || bytes[0] != 0x49 || bytes[1] != 0x44 || bytes[2] != 0x33) return null; // "ID3"
  final tagSize = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
  var i = 10 + tagSize;
  while (i < bytes.length - 4) {
    if (bytes[i] == 0xFF && (bytes[i + 1] & 0xE0) == 0xE0) {
      const table = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
      return table[bytes[i + 2] >> 4];
    }
    i++;
  }
  return null;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final api = ChannelNativeApi();

  testWidgets('engine starts, a link is analyzed and downloaded, the file is in the library', (tester) async {
    // 1. the bundled yt-dlp + FFmpeg unpack and start
    final engine = await eventually(() async {
      final s = await api.binaryState();
      if (s.phase == 'error') fail('Engine failed: ${s.message}');
      return s.isReady ? s : null;
    }, timeout: const Duration(minutes: 5), what: 'the engine');
    expect(engine.version, isNotEmpty);

    // 2. settings round-trip through the native store (old and new keys)
    final settings = await api.getSettings();
    final changed = await api.setSettings({'concurrency': settings.concurrency == 2 ? 3 : 2});
    expect(changed.concurrency, isNot(settings.concurrency));
    await api.setSettings({'concurrency': settings.concurrency});
    final tuned = await api.setSettings({'mp3Quality': '128'});
    expect(tuned.prefs.mp3Quality, '128');
    // invalid values are ignored, not stored
    final bad = await api.setSettings({'mp3Quality': '999'});
    expect(bad.prefs.mp3Quality, '128');

    // 3. "Wi-Fi only" can be switched; the emulator's connection is unmetered, so downloads stay allowed
    final wifi = await api.setSettings({'wifiOnly': true});
    expect(wifi.wifiOnly, isTrue);
    expect(await api.downloadsAllowed(), isTrue);
    await api.setSettings({'wifiOnly': false});

    // 4. analyze (same Dart logic the app uses)
    final analyzed = await analyzeWith((url, o) => api.runJson(url, timeoutMs: o.timeoutMs, playlistEnd: o.playlistEnd), clipUrl);
    expect(analyzed.ok, isTrue, reason: '${analyzed.error} ${analyzed.detail}');
    expect(analyzed.info!.options, isNotEmpty);

    // 5. download through the native queue and wait for it to finish
    final current = await api.getSettings();
    final item = await download(api, current, const DownloadRequest(url: clipUrl, title: 'smoke clip'));
    expect(item.filePath, contains('Download/StreamPull'));

    // 6. it is in the library and the file exists in the public Downloads folder
    final history = await api.historyList();
    final saved = history.where((h) => h.id == item.id).firstOrNull;
    expect(saved, isNotNull);
    expect(saved!.fileExists, isTrue);
    expect(saved.sizeBytes, greaterThan(1000));
    await api.historyRemove(item.id, deleteFile: true);
    await api.queueRemove(item.id);

    // 7. MP3 at a chosen bitrate with the page's image as a square cover
    final mp3Settings = await api.setSettings({'mp3Quality': '128', 'embedCover': true, 'squareCover': true, 'embedTags': true});
    final mp3 = await download(api, mp3Settings, const DownloadRequest(url: pageUrl, title: 'cover test', quality: 'mp3'));
    final mp3Bytes = readSaved(mp3);
    expect(mp3Bytes.length, greaterThan(1000));
    expect(mp3Bitrate(mp3Bytes), 128, reason: 'the MP3 bitrate setting');
    final apic = indexOfAscii(mp3Bytes, 'APIC');
    expect(apic, greaterThan(0), reason: 'the MP3 has no embedded cover');
    final size = jpegSize(mp3Bytes, apic);
    expect(size, isNotNull, reason: 'the cover is not a JPEG');
    expect(size!.w, size.h, reason: 'the cover should be cropped to a square (was ${size.w}x${size.h})');
    expect(indexOfAscii(mp3Bytes, 'TIT2'), greaterThan(0), reason: 'the MP3 has no title tag');
    await api.historyRemove(mp3.id, deleteFile: true);
    await api.queueRemove(mp3.id);

    // 8. the same MP3 with the cover switched off has none
    final noCover = await api.setSettings({'embedCover': false});
    final plain = await download(api, noCover, const DownloadRequest(url: pageUrl, title: 'no cover test', quality: 'mp3'));
    expect(indexOfAscii(readSaved(plain), 'APIC'), -1, reason: 'cover art was added although it is turned off');
    await api.historyRemove(plain.id, deleteFile: true);
    await api.queueRemove(plain.id);
    await api.setSettings({'embedCover': true});

  });
}
