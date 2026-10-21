// Pure helpers around yt-dlp (port of src/shared/ytdlpArgs.ts): which arguments a quality choice means, how to
// turn yt-dlp's JSON into what the UI shows, and how to read its errors.

import 'dart:math' as math;

import 'channel.dart';
import 'download_options.dart';
import 'models.dart';

bool isAudioQuality(String q) => q == 'mp3' || q == 'm4a';

/// Format-selection args for a chosen quality.
List<String> formatArgs(String quality, [String mp3Quality = 'best']) {
  if (quality == 'mp3') return ['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', mp3QualityArg(mp3Quality)];
  if (quality == 'm4a') return ['-f', 'ba[ext=m4a]/ba/b', '-x', '--audio-format', 'm4a'];
  final h = int.tryParse(quality);
  final filter = h != null && h > 0 ? '[height<=$h]' : '';
  return ['-f', 'bv*$filter+ba/b$filter/b', '-S', 'res,vcodec:h264,acodec:m4a', '--merge-output-format', 'mp4'];
}

String outputName(NameTemplate t) {
  switch (t) {
    case NameTemplate.uploaderTitle:
      return '%(uploader|)s - %(title).120B';
    case NameTemplate.titleId:
      return '%(title).120B [%(id)s]';
    case NameTemplate.title:
      return '%(title).150B';
  }
}

/// Safe literal file name (no extension) for an output template.
String sanitizeFileName(String name) {
  final cleaned = name
      .replaceAll(RegExp(r'[\u0000-\u001f<>:"/\\|?*]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim()
      .replaceFirst(RegExp(r'[. ]+$'), '');
  return cleaned.length > 150 ? cleaned.substring(0, 150) : cleaned;
}

/// Output template: a literal sanitized name when given, else the configured template.
String outputNameFor(String? fileName, NameTemplate t) {
  final clean = fileName != null && fileName.isNotEmpty ? sanitizeFileName(fileName) : '';
  return clean.isNotEmpty ? clean.replaceAll('%', '%%') : outputName(t);
}

/// The per-download yt-dlp options that don't depend on the platform (quality, output name, speed limit, referer).
/// The native layer adds its own paths (output folder, ffmpeg, cookies) around these.
List<String> buildExtraArgs({
  required String quality,
  String? fileName,
  String? referer,
  required NameTemplate nameTemplate,
  String speedLimit = '',
  DownloadPrefs prefs = const DownloadPrefs(),
  ClipRange? clip,
}) {
  final name = '${outputNameFor(fileName, nameTemplate)}${clip == null ? '' : clipSuffix(clip)}';
  final args = [...formatArgs(quality, prefs.mp3Quality), ...downloadOptionArgs(quality, prefs, clip), '-o', '$name.%(ext)s'];
  if (speedLimit.isNotEmpty) args.addAll(['--limit-rate', speedLimit]);
  if (referer != null && referer.isNotEmpty) args.addAll(['--referer', referer]);
  return args;
}

/// Maps yt-dlp's stderr to the UI's error codes.
ErrorCode classifyError(String text) {
  final t = text.toLowerCase();
  if (t.contains('unsupported url')) return ErrorCode.unsupported;
  if (t.contains('drm')) return ErrorCode.drm;
  // Social sites that need a signed-in session.
  if (RegExp(r'(instagram|facebook|tiktok)').hasMatch(t) &&
      RegExp(r'(unable to extract|login|log in|--cookies|empty media|not available)').hasMatch(t)) {
    return ErrorCode.loginRequired;
  }
  if (RegExp(
    r'private video|sign in|log ?in|members-only|members only|confirm your age|age-restricted|'
    r'not available in your country|video unavailable|this video is not available',
  ).hasMatch(t)) {
    return ErrorCode.private;
  }
  if (RegExp(
    r'getaddrinfo|temporary failure|timed out|timeout|connection (reset|refused|aborted)|urlopen error|'
    r'network is unreachable|unable to download (webpage|json)',
  ).hasMatch(t)) {
    return ErrorCode.network;
  }
  return ErrorCode.unknown;
}

/// Most useful line of yt-dlp's stderr for showing the user.
String? lastErrorLine(String stderr) {
  final lines = stderr.split(RegExp(r'\r?\n')).map((l) => l.trim()).where((l) => l.isNotEmpty).toList();
  if (lines.isEmpty) return null;
  for (final l in lines.reversed) {
    if (l.startsWith('ERROR')) return l;
  }
  return lines.last;
}

bool isValidUrl(String s) {
  final u = parseWebUri(s);
  return u != null && (u.scheme == 'http' || u.scheme == 'https');
}

/// For video URLs that also carry a ?list= param, treat as a single video.
bool wantsSingle(String url) => RegExp(r'[?&]v=').hasMatch(url) && RegExp(r'[?&]list=').hasMatch(url);

// ---------------------------------------------------------------------------------------------------------------

num _fsize(Map f) => (f['filesize'] as num?) ?? (f['filesize_approx'] as num?) ?? 0;

bool _has(Object? codec) => codec is String && codec.isNotEmpty && codec != 'none';

/// Build the quality ladder (with size estimates) from yt-dlp's format list.
List<QualityOption> buildQualityOptions(List<dynamic>? formats) {
  final fm = (formats ?? const []).whereType<Map>().toList();
  final video = fm.where((f) => _has(f['vcodec']) && f['height'] is num && (f['height'] as num) != 0).toList();
  final audio = fm.where((f) => _has(f['acodec']) && !_has(f['vcodec'])).toList();
  final bestAudio = audio.fold<num>(0, (m, f) => math.max(m, _fsize(f)));

  if (video.isEmpty && audio.isEmpty) return defaultQualities;

  final heights = video.map((f) => (f['height'] as num).toInt()).toSet().toList()..sort((a, b) => b.compareTo(a));

  int? sizeFor(int h) {
    final v = video.where((f) => (f['height'] as num).toInt() == h).fold<num>(0, (m, f) => math.max(m, _fsize(f)));
    // muxed formats already include audio
    final muxed = video.any((f) => (f['height'] as num).toInt() == h && _has(f['acodec']));
    final total = v + (muxed ? 0 : bestAudio);
    return total > 0 ? total.toInt() : null;
  }

  final opts = <QualityOption>[];
  if (heights.isNotEmpty) {
    opts.add(QualityOption(key: 'best', kind: 'video', label: 'Best', sizeBytes: sizeFor(heights.first)));
    for (final h in heights) {
      if (h < 144) continue;
      opts.add(QualityOption(key: '$h', kind: 'video', label: '${h}p', sizeBytes: sizeFor(h)));
    }
  } else {
    opts.add(const QualityOption(key: 'best', kind: 'video', label: 'Best'));
  }
  final aSize = bestAudio > 0 ? bestAudio.toInt() : null;
  opts.add(QualityOption(key: 'mp3', kind: 'audio', label: 'MP3', sizeBytes: aSize));
  opts.add(QualityOption(key: 'm4a', kind: 'audio', label: 'M4A', sizeBytes: aSize));
  return opts;
}

bool _isHttp(Object? s) => s is String && RegExp(r'^https?://', caseSensitive: false).hasMatch(s);

/// JavaScript's `a || b` for strings: an empty string counts as missing.
String? _or(Object? a, Object? b) {
  if (a is String && a.isNotEmpty) return a;
  if (b is String && b.isNotEmpty) return b;
  return null;
}

String? _thumb(Map e) {
  final t = e['thumbnail'];
  if (t is String) return t;
  final list = e['thumbnails'];
  if (list is List) {
    for (final x in list.reversed) {
      if (x is Map && x['url'] is String && (x['url'] as String).isNotEmpty) return x['url'] as String;
    }
  }
  return null;
}

double? _dur(Object? v) => v is num ? v.toDouble() : null;

/// Turn yt-dlp's `-J --flat-playlist` JSON into what the UI shows.
MediaInfo mapInfo(String url, Map<String, dynamic> r) {
  final entriesRaw = r['entries'];
  if (r['_type'] == 'playlist' || entriesRaw is List) {
    final entries = <PlaylistEntry>[];
    final list = entriesRaw is List ? entriesRaw : const [];
    for (var i = 0; i < list.length; i++) {
      final e = list[i];
      if (e is! Map) continue;
      final u = _isHttp(e['url']) ? e['url'] as String : (_isHttp(e['webpage_url']) ? e['webpage_url'] as String : null);
      if (u == null) continue;
      final status = e['live_status'];
      entries.add(PlaylistEntry(
        id: (e['id'] as String?) ?? '${i + 1}',
        index: i + 1,
        title: _or(e['title'], e['id']) ?? '#${i + 1}',
        url: u,
        duration: _dur(e['duration']),
        thumbnail: _thumb(e),
        liveStatus: status == 'is_live' ? 'live' : (status == 'is_upcoming' ? 'upcoming' : null),
      ));
    }
    return MediaInfo(
      url: url,
      title: _or(r['title'], null) ?? url,
      thumbnail: _thumb(r) ?? (entries.isNotEmpty ? entries.first.thumbnail : null),
      uploader: _or(r['uploader'], r['channel']),
      site: r['extractor_key'] as String?,
      isPlaylist: true,
      entries: entries,
      options: defaultQualities,
    );
  }
  return MediaInfo(
    url: _isHttp(r['webpage_url']) ? r['webpage_url'] as String : url,
    title: _or(r['title'], null) ?? url,
    thumbnail: _thumb(r),
    duration: _dur(r['duration']),
    uploader: _or(r['uploader'], r['channel']),
    site: r['extractor_key'] as String?,
    isPlaylist: false,
    entries: const [],
    options: buildQualityOptions(r['formats'] is List ? r['formats'] as List : null),
  );
}

// YouTube channels ----------------------------------------------------------------------------------------------

/// How many tab entries to ask for when probing a channel root (each tab is limited to this many items too).
const channelRootProbe = 8;

/// Upper bound for one tab listing, so a huge channel can't stall or exhaust memory.
const channelListCap = 3000;
