import 'dart:async';

import 'package:streampull/core/models.dart';
import 'package:streampull/native/native_api.dart';

/// An in-memory stand-in for the Kotlin side, so the screens can be driven without a device.
class FakeNativeApi implements NativeApi {
  final events_ = StreamController<NativeEvent>.broadcast();
  Settings settings = const Settings();
  List<DownloadItem> queue = [];
  List<HistoryItem> history = [];

  @override
  Stream<NativeEvent> get events => events_.stream;
  @override
  Future<BinaryState> binaryState() async => const BinaryState('ready', version: '2026.01.01');
  @override
  Future<BinaryState> updateEngine() async => const BinaryState('ready', version: '2026.01.01');
  @override
  Future<String> appVersion() async => '0.4.0';
  @override
  Future<Settings> getSettings() async => settings;
  @override
  Future<Settings> setSettings(Map<String, dynamic> patch) async => settings;
  @override
  Future<RawResult> runJson(String url, {required int timeoutMs, int? playlistEnd}) async => const RawResult.fail(ErrorCode.network);
  @override
  Future<List<DownloadItem>> queueList() async => queue;
  @override
  Future<List<DownloadItem>> queueAdd(List<Map<String, dynamic>> reqs) async => [];
  @override
  Future<void> queuePause(String id) async {}
  @override
  Future<void> queueResume(String id) async {}
  @override
  Future<void> queueCancel(String id) async {}
  @override
  Future<void> queueRetry(String id) async {}
  @override
  Future<void> queueRemove(String id) async {}
  @override
  Future<void> queueClearFinished() async {}
  @override
  Future<List<HistoryItem>> historyList() async => history;
  @override
  Future<void> historyRemove(String id, {required bool deleteFile}) async {}
  @override
  Future<void> historyClear() async {}
  @override
  Future<bool> openFile(String id) async => true;
  @override
  Future<void> showInFolder() async {}
  @override
  Future<void> openExternal(String url) async {}
  @override
  Future<String?> takePendingLink() async => null;
}
