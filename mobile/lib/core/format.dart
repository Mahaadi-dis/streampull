// Number and time formatting for the UI (port of src/renderer/src/lib/format.ts).

String formatBytes(num? n) {
  if (n == null || n <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  var i = 0;
  var v = n.toDouble();
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return '${v >= 100 || i == 0 ? v.toStringAsFixed(0) : v.toStringAsFixed(1)} ${units[i]}';
}

String formatSpeed(num? n) => n != null && n > 0 ? '${formatBytes(n)}/s' : '—';

String formatDuration(num? sec) {
  if (sec == null || sec <= 0) return '';
  final s = sec.floor();
  final h = s ~/ 3600;
  final m = (s % 3600) ~/ 60;
  final r = s % 60;
  final mm = h > 0 ? m.toString().padLeft(2, '0') : '$m';
  return '${h > 0 ? '$h:' : ''}$mm:${r.toString().padLeft(2, '0')}';
}

String qualityLabel(String key, String bestLabel) {
  if (key == 'best') return bestLabel;
  if (key == 'mp3') return 'MP3';
  if (key == 'm4a') return 'M4A';
  final h = int.tryParse(key) ?? 0;
  if (h >= 4320) return '8K · ${h}p';
  if (h >= 2160) return '4K · ${h}p';
  if (h >= 1440) return '2K · ${h}p';
  return '${h}p';
}

/// Arabic counted forms: 1 -> one, 2 -> two, 3-10 -> few, 11+ -> many.
String _arAgo(int n, String one, String two, String few, String many) {
  if (n == 1) return 'قبل $one';
  if (n == 2) return 'قبل $two';
  return 'قبل $n ${n <= 10 ? few : many}';
}

/// "5 minutes ago" style text for a timestamp, in Arabic or English.
String timeAgo(int tsMillis, String lang, {int? nowMillis}) {
  final diff = ((nowMillis ?? DateTime.now().millisecondsSinceEpoch) - tsMillis) ~/ 1000;
  final ar = lang == 'ar';
  String en(int n, String unit) => '$n $unit${n == 1 ? '' : 's'} ago';

  if (diff < 60) return ar ? 'الآن' : 'now';
  if (diff < 3600) {
    final n = diff ~/ 60;
    return ar ? _arAgo(n, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة') : en(n, 'minute');
  }
  if (diff < 86400) {
    final n = diff ~/ 3600;
    return ar ? _arAgo(n, 'ساعة', 'ساعتين', 'ساعات', 'ساعة') : en(n, 'hour');
  }
  final n = diff ~/ 86400;
  return ar ? _arAgo(n, 'يوم', 'يومين', 'أيام', 'يوماً') : en(n, 'day');
}
