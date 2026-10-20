// The Dart side of the bridge to the native engine and download queue (Kotlin, see StreamPullChannel.kt).
// UI code only talks to the abstract [NativeApi], so tests and the desktop preview can swap in a fake.

import 'dart:async';

import 'package:flutter/services.dart';

import '../core/models.dart';
import '../core/ytdlp_args.dart';

/// Something the native side pushes to the UI.
sealed class NativeEvent {
  const NativeEvent();
}

class BinaryStateEvent extends NativeEvent {
  const BinaryStateEvent(this.state);
  final BinaryState state;
}

class QueueUpdateEvent extends NativeEvent {
  const QueueUpdateEvent(this.item);
  final DownloadItem item;
}

class QueueRemovedEvent extends NativeEvent {
  const QueueRemovedEvent(this.id);
  final String id;
}

/// A link was shared to the app; fetch it with [NativeApi.takePendingLink].
class LinkEvent extends NativeEvent {
  const LinkEvent();
}

abstract class NativeApi {
  Future<BinaryState> binaryState();
  Future<BinaryState> updateEngine();
  Future<String> appVersion();

  Future<Settings> getSettings();
  Future<Settings> setSettings(Map<String, dynamic> patch);

  /// Runs `yt-dlp -J --flat-playlist` on [url].
  Future<RawResult> runJson(String url, {required int timeoutMs, int? playlistEnd});

  Future<List<DownloadItem>> queueList();
  Future<List<DownloadItem>> queueAdd(List<Map<String, dynamic>> reqs);
  Future<void> queuePause(String id);
  Future<void> queueResume(String id);
  Future<void> queueCancel(String id);
  Future<void> queueRetry(String id);
  Future<void> queueRemove(String id);
  Future<void> queueClearFinished();

  Future<List<HistoryItem>> historyList();
  Future<void> historyRemove(String id, {required bool deleteFile});
  Future<void> historyClear();

  Future<bool> openFile(String id);
  Future<void> showInFolder();
  Future<void> openExternal(String url);

  /// The link shared to the app that the UI has not handled yet, if any.
  Future<String?> takePendingLink();

  Stream<NativeEvent> get events;
}

/// A download request in the form the native queue expects: the request plus the yt-dlp options computed here.
Map<String, dynamic> requestToNative(DownloadRequest r, Settings s) => {
      'url': r.url,
      'title': r.title,
      'thumbnail': r.thumbnail,
      'duration': r.duration,
      'uploader': r.uploader,
      'quality': r.quality,
      'expectedBytes': r.expectedBytes,
      'referer': r.referer,
      'cookieUrl': r.cookieUrl,
      'audio': isAudioQuality(r.quality),
      'args': buildExtraArgs(
        quality: r.quality,
        fileName: r.fileName,
        referer: r.referer,
        nameTemplate: s.nameTemplate,
        speedLimit: s.speedLimit,
      ),
    };

class ChannelNativeApi implements NativeApi {
  static const _method = MethodChannel('streampull/api');
  static const _events = EventChannel('streampull/events');

  Map<String, dynamic> _map(Object? v) => Map<String, dynamic>.from(v as Map);

  Future<Map<String, dynamic>> _callMap(String name, [Map<String, dynamic>? args]) async =>
      _map(await _method.invokeMethod<Object?>(name, args));

  Future<List<Map<String, dynamic>>> _callList(String name, [Map<String, dynamic>? args]) async {
    final v = await _method.invokeMethod<List<Object?>>(name, args);
    return (v ?? const []).map(_map).toList();
  }

  @override
  Future<BinaryState> binaryState() async => BinaryState.fromJson(await _callMap('binaryState'));

  @override
  Future<BinaryState> updateEngine() async => BinaryState.fromJson(await _callMap('updateEngine'));

  @override
  Future<String> appVersion() async => (await _method.invokeMethod<String>('appVersion')) ?? '0.0.0';

  @override
  Future<Settings> getSettings() async => Settings.fromJson(await _callMap('getSettings'));

  @override
  Future<Settings> setSettings(Map<String, dynamic> patch) async =>
      Settings.fromJson(await _callMap('setSettings', {'patch': patch}));

  @override
  Future<RawResult> runJson(String url, {required int timeoutMs, int? playlistEnd}) async {
    final r = await _callMap('runJson', {'url': url, 'timeoutMs': timeoutMs, 'playlistEnd': playlistEnd});
    if (r['ok'] == true) return RawResult.ok(_map(r['raw']));
    return RawResult.fail(ErrorCode.parse(r['error'] as String?), r['detail'] as String?);
  }

  @override
  Future<List<DownloadItem>> queueList() async => (await _callList('queueList')).map(DownloadItem.fromJson).toList();

  @override
  Future<List<DownloadItem>> queueAdd(List<Map<String, dynamic>> reqs) async =>
      (await _callList('queueAdd', {'reqs': reqs})).map(DownloadItem.fromJson).toList();

  @override
  Future<void> queuePause(String id) => _method.invokeMethod('queuePause', {'id': id});
  @override
  Future<void> queueResume(String id) => _method.invokeMethod('queueResume', {'id': id});
  @override
  Future<void> queueCancel(String id) => _method.invokeMethod('queueCancel', {'id': id});
  @override
  Future<void> queueRetry(String id) => _method.invokeMethod('queueRetry', {'id': id});
  @override
  Future<void> queueRemove(String id) => _method.invokeMethod('queueRemove', {'id': id});
  @override
  Future<void> queueClearFinished() => _method.invokeMethod('queueClearFinished');

  @override
  Future<List<HistoryItem>> historyList() async => (await _callList('historyList')).map(HistoryItem.fromJson).toList();

  @override
  Future<void> historyRemove(String id, {required bool deleteFile}) =>
      _method.invokeMethod('historyRemove', {'id': id, 'deleteFile': deleteFile});

  @override
  Future<void> historyClear() => _method.invokeMethod('historyClear');

  @override
  Future<bool> openFile(String id) async => (await _method.invokeMethod<bool>('openFile', {'id': id})) ?? false;

  @override
  Future<void> showInFolder() => _method.invokeMethod('showInFolder');

  @override
  Future<void> openExternal(String url) => _method.invokeMethod('openExternal', {'url': url});

  @override
  Future<String?> takePendingLink() async => _map(await _method.invokeMethod<Object?>('takePendingLink'))['url'] as String?;

  @override
  Stream<NativeEvent> get events => _events.receiveBroadcastStream().map((raw) {
        final m = _map(raw);
        final data = _map(m['data']);
        switch (m['type']) {
          case 'binaryState':
            return BinaryStateEvent(BinaryState.fromJson(data));
          case 'queueUpdate':
            return QueueUpdateEvent(DownloadItem.fromJson(data));
          case 'queueRemoved':
            return QueueRemovedEvent(data['id'] as String);
          default:
            return const LinkEvent();
        }
      });
}
