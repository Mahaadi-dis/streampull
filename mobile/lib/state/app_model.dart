// The app's state and actions (what the desktop app keeps in its Zustand store). Plain ChangeNotifier: the UI
// rebuilds through [AppScope], so there are no third-party state packages to keep up to date.

import 'dart:async';

import 'package:flutter/widgets.dart';

import '../core/analyze.dart';
import '../core/models.dart';
import '../core/updates.dart';
import '../core/ytdlp_args.dart';
import '../i18n/i18n.dart';
import '../native/native_api.dart';

enum AnalysisStatus { idle, loading, done, error }

class Analysis {
  const Analysis.idle()
      : status = AnalysisStatus.idle,
        url = null,
        info = null,
        error = null,
        detail = null;
  const Analysis.loading(String this.url)
      : status = AnalysisStatus.loading,
        info = null,
        error = null,
        detail = null;
  const Analysis.done(MediaInfo this.info)
      : status = AnalysisStatus.done,
        url = null,
        error = null,
        detail = null;
  const Analysis.error(ErrorCode this.error, [this.detail])
      : status = AnalysisStatus.error,
        url = null,
        info = null;

  final AnalysisStatus status;
  final String? url;
  final MediaInfo? info;
  final ErrorCode? error;
  final String? detail;
}

class Toast {
  const Toast(this.id, this.text, this.tone);

  final int id;
  final String text;

  /// 'ok' | 'error' | 'info'
  final String tone;
}

class AppModel extends ChangeNotifier {
  AppModel(this.api, this.i18n);

  final NativeApi api;
  final I18n i18n;

  Settings settings = const Settings();
  BinaryState binary = const BinaryState('checking');

  /// Queue items in the order they were added.
  final Map<String, DownloadItem> downloads = {};
  List<HistoryItem> history = [];

  Analysis analysis = const Analysis.idle();

  /// The channel tab currently being fetched.
  String? loadingTab;

  /// Selected bottom-navigation index: 0 home, 1 downloads, 2 library, 3 settings.
  int tab = 0;

  final List<Toast> toasts = [];
  UpdateInfo? update;
  String appVersion = '';

  /// Bumped when a link is shared in, so the Home input can show it.
  String? sharedLink;
  int sharedLinkSeq = 0;

  StreamSubscription<NativeEvent>? _sub;
  Timer? _updateTimer;
  int _toastSeq = 1;
  int _analysisSeq = 0;
  String _dismissedUpdate = '';
  bool _disposed = false;

  String t(String key, [Map<String, Object?>? vars]) => i18n.t(key, vars);

  List<DownloadItem> get downloadList => downloads.values.toList();
  List<DownloadItem> get activeDownloads => downloads.values.where((d) => d.isActive).toList();

  // ---- start-up ------------------------------------------------------------------------------

  Future<void> init() async {
    settings = await api.getSettings();
    i18n.lang = settings.lang;
    binary = await api.binaryState();
    for (final d in await api.queueList()) {
      downloads[d.id] = d;
    }
    history = await api.historyList();
    appVersion = await api.appVersion();
    _sub = api.events.listen(_onEvent);
    notifyListeners();
    unawaited(_takeLink());
    unawaited(_checkUpdate());
    _updateTimer = Timer.periodic(const Duration(hours: 6), (_) => unawaited(_checkUpdate()));
  }

  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _sub?.cancel();
    _updateTimer?.cancel();
    super.dispose();
  }

  void _onEvent(NativeEvent e) {
    switch (e) {
      case BinaryStateEvent():
        binary = e.state;
      case QueueUpdateEvent():
        final prev = downloads[e.item.id];
        downloads[e.item.id] = e.item;
        if (e.item.status == 'completed' && prev?.status != 'completed') unawaited(refreshHistory());
      case QueueRemovedEvent():
        downloads.remove(e.id);
      case LinkEvent():
        unawaited(_takeLink());
        return;
    }
    notifyListeners();
  }

  Future<void> _takeLink() async {
    final url = await api.takePendingLink();
    if (url == null) return;
    tab = 0;
    sharedLink = url;
    sharedLinkSeq++;
    notifyListeners();
    await analyze(url);
  }

  Future<void> _checkUpdate() async {
    if (!settings.checkUpdates || appVersion.isEmpty) {
      if (update != null) {
        update = null;
        notifyListeners();
      }
      return;
    }
    final u = await checkForUpdate(appVersion);
    update = u != null && u.version != _dismissedUpdate ? u : null;
    notifyListeners();
  }

  /// The About page's button: always asks GitHub, whatever the start-up check setting is.
  Future<UpdateCheck> checkUpdateNow() async {
    if (appVersion.isEmpty) return const UpdateError();
    return checkLatest(appVersion);
  }

  void dismissUpdate() {
    _dismissedUpdate = update?.version ?? '';
    update = null;
    notifyListeners();
  }

  // ---- navigation / feedback -----------------------------------------------------------------

  void setTab(int i) {
    tab = i;
    notifyListeners();
  }

  void toast(String text, [String tone = 'info']) {
    final id = _toastSeq++;
    toasts.add(Toast(id, text, tone));
    notifyListeners();
    Timer(const Duration(milliseconds: 3200), () {
      toasts.removeWhere((t) => t.id == id);
      notifyListeners();
    });
  }

  // ---- settings ------------------------------------------------------------------------------

  Future<void> updateSettings(Map<String, dynamic> patch) async {
    settings = await api.setSettings(patch);
    i18n.lang = settings.lang;
    notifyListeners();
    if (patch.containsKey('checkUpdates')) unawaited(_checkUpdate());
  }

  Future<void> updateEngine() async {
    binary = const BinaryState('checking');
    notifyListeners();
    binary = await api.updateEngine();
    notifyListeners();
  }

  // ---- analyzing -----------------------------------------------------------------------------

  Future<void> analyze(String input) async {
    final url = input.trim();
    final seq = ++_analysisSeq;
    if (!isValidUrl(url)) {
      analysis = const Analysis.error(ErrorCode.invalidUrl);
      notifyListeners();
      return;
    }
    analysis = Analysis.loading(url);
    loadingTab = null;
    notifyListeners();
    final r = await analyzeWith(_run, url);
    if (seq != _analysisSeq) return; // the user analyzed something else meanwhile
    analysis = r.ok ? Analysis.done(r.info!) : Analysis.error(r.error!, r.detail);
    notifyListeners();
  }

  Future<RawResult> _run(String url, RunOptions o) => api.runJson(url, timeoutMs: o.timeoutMs, playlistEnd: o.playlistEnd);

  void clearAnalysis() {
    _analysisSeq++;
    analysis = const Analysis.idle();
    loadingTab = null;
    notifyListeners();
  }

  /// Switch the open channel to another tab. Returns an error code, or null on success.
  Future<ErrorCode?> loadChannelTab(ChannelTab tab) async {
    final a = analysis;
    if (a.status != AnalysisStatus.done || a.info!.channel == null || loadingTab != null) return null;
    loadingTab = tab.id;
    notifyListeners();
    final r = await analyzeWith(_run, tab.url);
    final still = analysis;
    if (still.status == AnalysisStatus.done && still.info!.channel != null && still.info!.title == a.info!.title && r.ok) {
      analysis = Analysis.done(r.info!);
    }
    loadingTab = null;
    notifyListeners();
    return r.ok ? null : r.error;
  }

  // ---- downloads -----------------------------------------------------------------------------

  Future<void> enqueue(List<DownloadRequest> reqs) async {
    final added = await api.queueAdd(reqs.map((r) => requestToNative(r, settings)).toList());
    for (final d in added) {
      downloads[d.id] = d;
    }
    notifyListeners();
  }

  Future<void> pause(String id) => api.queuePause(id);
  Future<void> resume(String id) => api.queueResume(id);
  Future<void> cancel(String id) => api.queueCancel(id);
  Future<void> retry(String id) => api.queueRetry(id);
  Future<void> removeFromQueue(String id) => api.queueRemove(id);
  Future<void> clearFinished() => api.queueClearFinished();
  Future<bool> openFile(String id) => api.openFile(id);
  Future<void> showInFolder() => api.showInFolder();

  // ---- library -------------------------------------------------------------------------------

  Future<void> refreshHistory() async {
    history = await api.historyList();
    notifyListeners();
  }

  Future<void> removeHistory(String id, {required bool deleteFile}) async {
    await api.historyRemove(id, deleteFile: deleteFile);
    await refreshHistory();
  }

  Future<void> clearHistory() async {
    await api.historyClear();
    await refreshHistory();
  }
}

/// Gives the widget tree access to the [AppModel] and rebuilds dependents when it changes.
class AppScope extends InheritedNotifier<AppModel> {
  const AppScope({super.key, required AppModel model, required super.child}) : super(notifier: model);

  static AppModel of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope is missing above this widget');
    return scope!.notifier!;
  }
}
