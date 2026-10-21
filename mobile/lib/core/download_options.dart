// Optional download features (cover art, tags, MP3 bitrate, subtitles, clip cutting) as pure yt-dlp argument logic.
// Port of src/shared/downloadOptions.ts, tested with the same vectors.

enum SubtitleMode {
  off('off'),
  embed('embed'),
  file('file');

  const SubtitleMode(this.wire);
  final String wire;

  static SubtitleMode parse(String? s) => values.firstWhere((e) => e.wire == s, orElse: () => off);
}

const mp3Qualities = ['best', '320', '192', '128'];
const defaultSubtitleLangs = 'ar,en';

bool isMp3Quality(Object? v) => mp3Qualities.contains(v);

/// A part of the video to keep, in seconds.
class ClipRange {
  const ClipRange(this.start, this.end);

  final int start;
  final int end;

  @override
  bool operator ==(Object other) => other is ClipRange && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(start, end);

  @override
  String toString() => 'ClipRange($start, $end)';

  Map<String, dynamic> toJson() => {'start': start, 'end': end};

  static ClipRange? fromJson(Object? j) {
    if (j is! Map) return null;
    final s = j['start'];
    final e = j['end'];
    return s is num && e is num ? ClipRange(s.toInt(), e.toInt()) : null;
  }
}

/// The settings that change what yt-dlp is asked to do.
class DownloadPrefs {
  const DownloadPrefs({
    this.embedCover = true,
    this.squareCover = true,
    this.embedTags = true,
    this.mp3Quality = 'best',
    this.subtitleMode = SubtitleMode.off,
    this.subtitleLangs = defaultSubtitleLangs,
  });

  final bool embedCover;
  final bool squareCover;
  final bool embedTags;
  final String mp3Quality;
  final SubtitleMode subtitleMode;
  final String subtitleLangs;
}

/// yt-dlp's `--ppa` that crops the cover to a centered square before it is embedded.
const squareCoverPpa = "ThumbnailsConvertor+FFmpeg_o:-c:v mjpeg -vf crop=\"'if(gt(ih,iw),iw,ih)':'if(gt(iw,ih),ih,iw)'\"";

bool _isAudio(String q) => q == 'mp3' || q == 'm4a';

/// `--audio-quality` value: 0 is the best variable bitrate, otherwise a fixed bitrate.
String mp3QualityArg(String q) => q == 'best' ? '0' : '${q}K';

/// Normalize "AR, en;fr-CA" → "ar,en,fr-CA". Null when nothing usable is left. Only letters, digits, "-" and "_"
/// survive, so the value can never smuggle yt-dlp options.
String? cleanSubtitleLangs(String input) {
  final re = RegExp(r'^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})*$');
  final codes = input
      .split(RegExp(r'[\s,;]+'))
      .map((c) => c.trim())
      .where(re.hasMatch)
      .map((c) {
    final parts = c.split(RegExp(r'[-_]'));
    return [parts.first.toLowerCase(), ...parts.skip(1)].join('-');
  });
  final unique = <String>{...codes}.take(8).toList();
  return unique.isEmpty ? null : unique.join(',');
}

/// Parse "90", "1:30", "01:02:03" or "1:30.5" into seconds. Null when it isn't a time.
double? parseClipTime(String text) {
  final t = text.trim();
  if (!RegExp(r'^\d+(\.\d+)?$|^(\d+:)?[0-5]?\d:[0-5]?\d(\.\d+)?$').hasMatch(t)) return null;
  return t.split(':').map(double.parse).fold<double>(0, (acc, p) => acc * 60 + p);
}

/// 75 → "1:15", 3725 → "1:02:05".
String formatClipTime(num seconds) {
  final s = seconds < 0 ? 0 : seconds.round();
  final h = s ~/ 3600;
  final m = (s % 3600) ~/ 60;
  final sec = s % 60;
  String two(int n) => n.toString().padLeft(2, '0');
  return h > 0 ? '$h:${two(m)}:${two(sec)}' : '$m:${two(sec)}';
}

/// A usable clip: whole seconds, start before end, inside the video when its length is known. Null otherwise.
ClipRange? validateClip(num? start, num? end, [num? duration]) {
  if (start == null || end == null || !start.isFinite || !end.isFinite) return null;
  final s = start.floor();
  final e = end.ceil();
  if (s < 0 || e <= s) return null;
  final known = duration != null && duration > 0;
  if (known && s >= duration) return null;
  return ClipRange(s, known ? (e < duration.ceil() ? e : duration.ceil()) : e);
}

/// A file-name suffix so two clips of the same video don't overwrite each other: " [clip 1-15 to 2-40]".
String clipSuffix(ClipRange clip) {
  String f(int n) => formatClipTime(n).replaceAll(':', '-');
  return ' [clip ${f(clip.start)} to ${f(clip.end)}]';
}

/// The extra yt-dlp arguments for the optional features, for one download.
List<String> downloadOptionArgs(String quality, DownloadPrefs prefs, [ClipRange? clip]) {
  final args = <String>[];
  if (_isAudio(quality)) {
    if (prefs.embedCover) {
      args.addAll(['--embed-thumbnail', '--convert-thumbnails', 'jpg']);
      if (prefs.squareCover) args.addAll(['--ppa', squareCoverPpa]);
    }
    if (prefs.embedTags) args.add('--embed-metadata');
  } else if (prefs.subtitleMode != SubtitleMode.off) {
    final langs = cleanSubtitleLangs(prefs.subtitleLangs) ?? defaultSubtitleLangs;
    args.addAll(['--write-subs', '--write-auto-subs', '--sub-langs', langs]);
    args.addAll(prefs.subtitleMode == SubtitleMode.embed ? ['--embed-subs'] : ['--convert-subs', 'srt']);
  }
  if (clip != null) args.addAll(['--download-sections', '*${clip.start}-${clip.end}', '--force-keyframes-at-cuts']);
  return args;
}
