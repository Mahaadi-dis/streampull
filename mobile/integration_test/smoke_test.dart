// End-to-end smoke test of the real app on a device or emulator (run by CI): the bundled engine starts, a link is
// analyzed and downloaded through the native queue, and the file shows up in the library.
//
// It needs a test video served on the device's localhost:8099 (CI does `adb reverse tcp:8099 tcp:8099` and serves a
// generated clip from the runner):
//
//   flutter test integration_test/smoke_test.dart -d <device>


import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:streampull/core/analyze.dart';
import 'package:streampull/core/models.dart';
import 'package:streampull/native/native_api.dart';

const clipUrl = 'http://127.0.0.1:8099/clip.mp4';

Future<T> eventually<T>(Future<T?> Function() probe, {required Duration timeout, required String what}) async {
  final end = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(end)) {
    final v = await probe();
    if (v != null) return v;
    await Future<void>.delayed(const Duration(seconds: 1));
  }
  fail('Timed out waiting for $what');
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

    // 2. settings round-trip through the native store
    final settings = await api.getSettings();
    final changed = await api.setSettings({'concurrency': settings.concurrency == 2 ? 3 : 2});
    expect(changed.concurrency, isNot(settings.concurrency));
    await api.setSettings({'concurrency': settings.concurrency});

    // 3. analyze (same Dart logic the app uses)
    final analyzed = await analyzeWith((url, o) => api.runJson(url, timeoutMs: o.timeoutMs, playlistEnd: o.playlistEnd), clipUrl);
    expect(analyzed.ok, isTrue, reason: '${analyzed.error} ${analyzed.detail}');
    expect(analyzed.info!.options, isNotEmpty);

    // 4. download through the native queue and wait for it to finish
    final added = await api.queueAdd([
      requestToNative(DownloadRequest(url: clipUrl, title: 'smoke clip'), settings),
    ]);
    expect(added, hasLength(1));
    final id = added.first.id;
    final item = await eventually(() async {
      final list = await api.queueList();
      final d = list.where((x) => x.id == id).firstOrNull;
      return d != null && d.isFinished ? d : null;
    }, timeout: const Duration(minutes: 3), what: 'the download');
    expect(item.status, 'completed', reason: '${item.error} ${item.errorDetail}');
    expect(item.filePath, contains('Download/StreamPull'));

    // 5. it is in the library and the file exists in the public Downloads folder
    final history = await api.historyList();
    final saved = history.where((h) => h.id == id).firstOrNull;
    expect(saved, isNotNull);
    expect(saved!.fileExists, isTrue);
    expect(saved.sizeBytes, greaterThan(1000));

    // 6. clean up
    await api.historyRemove(id, deleteFile: true);
    await api.queueRemove(id);
  });
}
