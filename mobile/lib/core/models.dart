import 'download_options.dart';

// Data types shared by the whole app. They mirror src/shared/types.ts of the desktop app; the JSON field names
// are the same ones the native (Kotlin) layer produces, so `fromJson` can read its messages directly.

/// Why something failed, as shown to the user. Same codes as the desktop app.
enum ErrorCode {
  invalidUrl('invalid_url'),
  unsupported('unsupported'),
  private('private'),
  loginRequired('login_required'),
  drm('drm'),
  network('network'),
  notReady('not_ready'),
  unknown('unknown');

  const ErrorCode(this.wire);

  /// The spelling used in JSON and in the translation keys (`err.<wire>`).
  final String wire;

  static ErrorCode parse(String? s) => values.firstWhere((e) => e.wire == s, orElse: () => unknown);
}

enum NameTemplate {
  title('title'),
  uploaderTitle('uploader-title'),
  titleId('title-id');

  const NameTemplate(this.wire);
  final String wire;

  static NameTemplate parse(String? s) => values.firstWhere((e) => e.wire == s, orElse: () => title);
}

class QualityOption {
  const QualityOption({required this.key, required this.kind, required this.label, this.sizeBytes});

  /// 'best' | '2160' | '1080' | ... | 'mp3' | 'm4a'
  final String key;

  /// 'video' or 'audio'
  final String kind;
  final String label;
  final int? sizeBytes;

  Map<String, dynamic> toJson() => {'key': key, 'kind': kind, 'label': label, 'sizeBytes': sizeBytes};
}

const defaultQualities = <QualityOption>[
  QualityOption(key: 'best', kind: 'video', label: 'Best'),
  QualityOption(key: '1080', kind: 'video', label: '1080p'),
  QualityOption(key: '720', kind: 'video', label: '720p'),
  QualityOption(key: '480', kind: 'video', label: '480p'),
  QualityOption(key: '360', kind: 'video', label: '360p'),
  QualityOption(key: 'mp3', kind: 'audio', label: 'MP3'),
  QualityOption(key: 'm4a', kind: 'audio', label: 'M4A'),
];

class PlaylistEntry {
  const PlaylistEntry({
    required this.id,
    required this.index,
    required this.title,
    required this.url,
    this.duration,
    this.thumbnail,
    this.liveStatus,
  });

  final String id;
  final int index;
  final String title;
  final String url;
  final double? duration;
  final String? thumbnail;

  /// 'live' or 'upcoming' for streams that can't be downloaded as files yet.
  final String? liveStatus;
}

class ChannelTab {
  const ChannelTab({required this.id, required this.url});

  /// 'videos' | 'shorts' | 'streams'
  final String id;
  final String url;

  @override
  bool operator ==(Object other) => other is ChannelTab && other.id == id && other.url == url;

  @override
  int get hashCode => Object.hash(id, url);

  @override
  String toString() => 'ChannelTab($id, $url)';
}

/// Present when the analyzed URL is a YouTube channel or a TikTok/Instagram account.
class ChannelInfo {
  const ChannelInfo({required this.tabs, required this.activeTab, this.truncated = false, this.kind = 'channel'});

  final List<ChannelTab> tabs;
  final String activeTab;
  final bool truncated;

  /// 'channel' (YouTube) or 'account' (TikTok / Instagram)
  final String kind;
}

class MediaInfo {
  const MediaInfo({
    required this.url,
    required this.title,
    this.thumbnail,
    this.duration,
    this.uploader,
    this.site,
    required this.isPlaylist,
    required this.entries,
    required this.options,
    this.cookieUrl,
    this.channel,
  });

  final String url;
  final String title;
  final String? thumbnail;
  final double? duration;
  final String? uploader;
  final String? site;
  final bool isPlaylist;
  final List<PlaylistEntry> entries;
  final List<QualityOption> options;
  final String? cookieUrl;
  final ChannelInfo? channel;

  MediaInfo copyWith({
    String? title,
    String? thumbnail,
    String? uploader,
    String? site,
    bool? isPlaylist,
    String? cookieUrl,
    ChannelInfo? channel,
  }) =>
      MediaInfo(
        url: url,
        title: title ?? this.title,
        thumbnail: thumbnail ?? this.thumbnail,
        duration: duration,
        uploader: uploader ?? this.uploader,
        site: site ?? this.site,
        isPlaylist: isPlaylist ?? this.isPlaylist,
        entries: entries,
        options: options,
        cookieUrl: cookieUrl ?? this.cookieUrl,
        channel: channel ?? this.channel,
      );
}

/// What yt-dlp's `-J` produced, or why it failed.
class RawResult {
  const RawResult.ok(Map<String, dynamic> this.raw)
      : ok = true,
        error = null,
        detail = null;
  const RawResult.fail(ErrorCode this.error, [this.detail])
      : ok = false,
        raw = null;

  final bool ok;
  final Map<String, dynamic>? raw;
  final ErrorCode? error;
  final String? detail;
}

/// The result of analyzing a pasted link.
class AnalyzeResult {
  const AnalyzeResult.ok(MediaInfo this.info)
      : ok = true,
        error = null,
        detail = null;
  const AnalyzeResult.fail(ErrorCode this.error, [this.detail])
      : ok = false,
        info = null;

  final bool ok;
  final MediaInfo? info;
  final ErrorCode? error;
  final String? detail;
}

double? _toDouble(Object? v) => v is num ? v.toDouble() : null;
int? _toInt(Object? v) => v is num ? v.toInt() : null;
String? _toStr(Object? v) => v is String && v.isNotEmpty ? v : null;

/// What the user chose to download (sent to the native queue).
class DownloadRequest {
  const DownloadRequest({
    required this.url,
    required this.title,
    this.thumbnail,
    this.duration,
    this.uploader,
    this.quality = 'best',
    this.expectedBytes,
    this.referer,
    this.cookieUrl,
    this.fileName,
  });

  final String url;
  final String title;
  final String? thumbnail;
  final double? duration;
  final String? uploader;
  final String quality;
  final int? expectedBytes;
  final String? referer;
  final String? cookieUrl;
  final String? fileName;

}

class DownloadItem {
  const DownloadItem({
    required this.id,
    required this.url,
    required this.title,
    required this.quality,
    required this.status,
    required this.percent,
    required this.downloadedBytes,
    required this.createdAt,
    this.thumbnail,
    this.duration,
    this.uploader,
    this.referer,
    this.speed,
    this.eta,
    this.totalBytes,
    this.filePath,
    this.error,
    this.errorDetail,
  });

  final String id;
  final String url;
  final String title;
  final String? thumbnail;
  final double? duration;
  final String? uploader;
  final String quality;
  final String? referer;

  /// queued | downloading | processing | paused | completed | error | canceled
  final String status;
  final double percent;
  final double? speed;
  final double? eta;
  final int downloadedBytes;
  final int? totalBytes;
  final String? filePath;
  final ErrorCode? error;
  final String? errorDetail;
  final int createdAt;

  bool get isAudio => quality == 'mp3' || quality == 'm4a';
  bool get isActive => status == 'downloading' || status == 'processing' || status == 'queued';
  bool get isFinished => status == 'completed' || status == 'error' || status == 'canceled';

  factory DownloadItem.fromJson(Map<String, dynamic> j) => DownloadItem(
        id: j['id'] as String,
        url: j['url'] as String,
        title: (j['title'] as String?) ?? (j['url'] as String),
        thumbnail: _toStr(j['thumbnail']),
        duration: _toDouble(j['duration']),
        uploader: _toStr(j['uploader']),
        quality: (j['quality'] as String?) ?? 'best',
        referer: _toStr(j['referer']),
        status: (j['status'] as String?) ?? 'queued',
        percent: _toDouble(j['percent']) ?? 0,
        speed: _toDouble(j['speed']),
        eta: _toDouble(j['eta']),
        downloadedBytes: _toInt(j['downloadedBytes']) ?? 0,
        totalBytes: _toInt(j['totalBytes']),
        filePath: _toStr(j['filePath']),
        error: j['error'] == null ? null : ErrorCode.parse(j['error'] as String?),
        errorDetail: _toStr(j['errorDetail']),
        createdAt: _toInt(j['createdAt']) ?? 0,
      );
}

class HistoryItem {
  const HistoryItem({
    required this.id,
    required this.url,
    required this.title,
    required this.quality,
    required this.kind,
    required this.filePath,
    required this.completedAt,
    this.thumbnail,
    this.uploader,
    this.duration,
    this.sizeBytes,
    this.fileExists = true,
  });

  final String id;
  final String url;
  final String title;
  final String? thumbnail;
  final String? uploader;
  final double? duration;
  final String quality;

  /// 'video' or 'audio'
  final String kind;
  final String filePath;
  final int? sizeBytes;
  final int completedAt;
  final bool fileExists;

  factory HistoryItem.fromJson(Map<String, dynamic> j) => HistoryItem(
        id: j['id'] as String,
        url: j['url'] as String,
        title: (j['title'] as String?) ?? (j['url'] as String),
        thumbnail: _toStr(j['thumbnail']),
        uploader: _toStr(j['uploader']),
        duration: _toDouble(j['duration']),
        quality: (j['quality'] as String?) ?? 'best',
        kind: (j['kind'] as String?) ?? 'video',
        filePath: (j['filePath'] as String?) ?? '',
        sizeBytes: _toInt(j['sizeBytes']),
        completedAt: _toInt(j['completedAt']) ?? 0,
        fileExists: j['fileExists'] as bool? ?? true,
      );
}

/// State of the bundled yt-dlp + FFmpeg engine.
class BinaryState {
  const BinaryState(this.phase, {this.version, this.message});

  /// checking | ready | error
  final String phase;
  final String? version;
  final String? message;

  bool get isReady => phase == 'ready';

  factory BinaryState.fromJson(Map<String, dynamic> j) =>
      BinaryState((j['phase'] as String?) ?? 'checking', version: _toStr(j['version']), message: _toStr(j['message']));
}

class Settings {
  const Settings({
    this.concurrency = 3,
    this.lang = 'ar',
    this.theme = 'violet',
    this.defaultQuality = 'best',
    this.nameTemplate = NameTemplate.title,
    this.speedLimit = '',
    this.notifications = true,
    this.checkUpdates = true,
    this.prefs = const DownloadPrefs(),
    this.wifiOnly = false,
  });

  final int concurrency;
  final String lang;
  final String theme;
  final String defaultQuality;
  final NameTemplate nameTemplate;

  /// '' = unlimited, otherwise a yt-dlp rate like "2M".
  final String speedLimit;
  final bool notifications;
  final bool checkUpdates;

  /// Cover art, tags and MP3 bitrate.
  final DownloadPrefs prefs;

  /// Only download on Wi-Fi (or another unmetered connection).
  final bool wifiOnly;

  factory Settings.fromJson(Map<String, dynamic> j) => Settings(
        concurrency: _toInt(j['concurrency']) ?? 3,
        lang: j['lang'] == 'en' ? 'en' : 'ar',
        theme: (j['theme'] as String?) ?? 'violet',
        defaultQuality: (j['defaultQuality'] as String?) ?? 'best',
        nameTemplate: NameTemplate.parse(j['nameTemplate'] as String?),
        speedLimit: (j['speedLimit'] as String?) ?? '',
        notifications: j['notifications'] as bool? ?? true,
        checkUpdates: j['checkUpdates'] as bool? ?? true,
        prefs: DownloadPrefs(
          embedCover: j['embedCover'] as bool? ?? true,
          squareCover: j['squareCover'] as bool? ?? true,
          embedTags: j['embedTags'] as bool? ?? true,
          mp3Quality: isMp3Quality(j['mp3Quality']) ? j['mp3Quality'] as String : 'best',
        ),
        wifiOnly: j['wifiOnly'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {
        'concurrency': concurrency,
        'lang': lang,
        'theme': theme,
        'defaultQuality': defaultQuality,
        'nameTemplate': nameTemplate.wire,
        'speedLimit': speedLimit,
        'notifications': notifications,
        'checkUpdates': checkUpdates,
        'embedCover': prefs.embedCover,
        'squareCover': prefs.squareCover,
        'embedTags': prefs.embedTags,
        'mp3Quality': prefs.mp3Quality,
        'wifiOnly': wifiOnly,
      };

  Settings copyWith({
    int? concurrency,
    String? lang,
    String? theme,
    String? defaultQuality,
    NameTemplate? nameTemplate,
    String? speedLimit,
    bool? notifications,
    bool? checkUpdates,
    DownloadPrefs? prefs,
    bool? wifiOnly,
  }) =>
      Settings(
        concurrency: concurrency ?? this.concurrency,
        lang: lang ?? this.lang,
        theme: theme ?? this.theme,
        defaultQuality: defaultQuality ?? this.defaultQuality,
        nameTemplate: nameTemplate ?? this.nameTemplate,
        speedLimit: speedLimit ?? this.speedLimit,
        notifications: notifications ?? this.notifications,
        checkUpdates: checkUpdates ?? this.checkUpdates,
        prefs: prefs ?? this.prefs,
        wifiOnly: wifiOnly ?? this.wifiOnly,
      );
}
