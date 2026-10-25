// "Wi-Fi only" on a real (emulated) connection change. It cannot switch the network itself, so it prints
// `WIFI_STEP <name>` markers and tool/ci_smoke.sh reacts to them with `adb shell svc wifi disable|enable`:
//
//   offline  -> Wi-Fi is switched off, only mobile data (or nothing) is left
//   online   -> Wi-Fi is switched back on
//   offline2 / online2 -> the same again, for the "use mobile data now" button
//
//   flutter test integration_test/wifi_test.dart -d <device>   (with the test site from tool/ci_smoke.sh)

// ignore_for_file: avoid_print

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:streampull/core/models.dart';
import 'package:streampull/native/native_api.dart';

/// Tells the host script (tool/ci_smoke.sh) what the test is waiting for. The host reads this file with
/// `adb shell run-as`; printed output cannot be used for that because it only reaches the host when the test is over.
void mark(String step) {
  print('WIFI_STEP $step');
  File('${Directory.systemTemp.path}/wifi_step').writeAsStringSync('$step\n', mode: FileMode.append, flush: true);
}

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

Future<bool> waitAllowed(NativeApi api, bool wanted, String what) =>
    eventually(() async => await api.downloadsAllowed() == wanted ? true : null, timeout: const Duration(seconds: 120), what: what);

Future<DownloadItem> add(NativeApi api, Settings s, String title) async {
  final added = await api.queueAdd([requestToNative(DownloadRequest(url: clipUrl, title: title), s)]);
  return added.first;
}

Future<DownloadItem?> find(NativeApi api, String id) async => (await api.queueList()).where((x) => x.id == id).firstOrNull;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final api = ChannelNativeApi();

  testWidgets('downloads wait for Wi-Fi, resume when it is back, and can be allowed once on mobile data', (tester) async {
    await eventually(() async {
      final s = await api.binaryState();
      if (s.phase == 'error') fail('Engine failed: ${s.message}');
      return s.isReady ? s : null;
    }, timeout: const Duration(minutes: 5), what: 'the engine');

    final settings = await api.setSettings({'wifiOnly': true});
    expect(settings.wifiOnly, isTrue);
    expect(await api.downloadsAllowed(), isTrue, reason: 'Wi-Fi is on, so downloads are allowed');

    // Wi-Fi goes away: downloads are not allowed, and a new one just waits
    mark('offline');
    await waitAllowed(api, false, 'downloads to be blocked after Wi-Fi was switched off');
    final waiting = await add(api, settings, 'wifi wait test');
    await Future<void>.delayed(const Duration(seconds: 10));
    final stillWaiting = await find(api, waiting.id);
    expect(stillWaiting?.status, 'queued', reason: 'the download must wait while there is no Wi-Fi (was ${stillWaiting?.status})');

    // Wi-Fi comes back: the waiting download runs and completes
    mark('online');
    await waitAllowed(api, true, 'downloads to be allowed again after Wi-Fi came back');
    final done = await eventually(() async {
      final d = await find(api, waiting.id);
      return d != null && d.isFinished ? d : null;
    }, timeout: const Duration(minutes: 3), what: 'the waiting download to finish');
    expect(done.status, 'completed', reason: '${done.error} ${done.errorDetail}');

    // Wi-Fi goes away again: "use mobile data now" lets it through
    mark('offline2');
    await waitAllowed(api, false, 'downloads to be blocked again');
    final once = await add(api, settings, 'mobile data once test');
    await Future<void>.delayed(const Duration(seconds: 6));
    expect((await find(api, once.id))?.status, 'queued');
    await api.allowMobileData();
    expect(await api.downloadsAllowed(), isTrue, reason: 'allowed once');
    final onceDone = await eventually(() async {
      final d = await find(api, once.id);
      return d != null && d.isFinished ? d : null;
    }, timeout: const Duration(minutes: 3), what: 'the download over mobile data');
    expect(onceDone.status, 'completed', reason: '${onceDone.error} ${onceDone.errorDetail}');

    // back to normal
    mark('online2');
    await waitAllowed(api, true, 'downloads to be allowed after the final Wi-Fi reconnect');
    for (final id in [waiting.id, once.id]) {
      await api.historyRemove(id, deleteFile: true);
      await api.queueRemove(id);
    }
    await api.setSettings({'wifiOnly': false});
  });
}
