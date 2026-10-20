// YouTube channel URLs and their content tabs (port of src/shared/channel.ts).

import 'models.dart';

const channelTabIds = <String>['videos', 'shorts', 'streams'];

class ParsedChannelUrl {
  const ParsedChannelUrl({required this.base, required this.tab});

  /// Channel root, e.g. https://www.youtube.com/@name
  final String base;

  /// The tab named in the URL, if any.
  final String? tab;

  @override
  bool operator ==(Object other) => other is ParsedChannelUrl && other.base == base && other.tab == tab;

  @override
  int get hashCode => Object.hash(base, tab);

  @override
  String toString() => 'ParsedChannelUrl($base, $tab)';
}

// Path segments that can follow a channel handle. `live` is deliberately absent: /@name/live is a redirect to the
// *current* live video, not a list.
const _knownSegments = <String>{
  'videos',
  'shorts',
  'streams',
  'featured',
  'playlists',
  'podcasts',
  'releases',
  'community',
  'about',
};

final _youtubeHost = RegExp(r'^(www\.|m\.)?youtube\.com$', caseSensitive: false);

/// A URL with a scheme and a host, or null (Dart's `Uri.parse` accepts relative strings, `new URL` does not).
Uri? parseWebUri(String url) {
  final u = Uri.tryParse(url.trim());
  if (u == null || !u.hasScheme || u.host.isEmpty) return null;
  return u;
}

ParsedChannelUrl? parseYoutubeChannelUrl(String url) {
  final u = parseWebUri(url);
  if (u == null) return null;
  if (u.scheme != 'https' && u.scheme != 'http') return null;
  if (!_youtubeHost.hasMatch(u.host)) return null;

  final parts = u.path.split('/').where((s) => s.isNotEmpty).toList();
  var consumed = 0;
  if (parts.isNotEmpty && parts[0].startsWith('@') && parts[0].length > 1) {
    consumed = 1;
  } else if (parts.length >= 2 && const ['channel', 'c', 'user'].contains(parts[0])) {
    consumed = 2;
  } else {
    return null;
  }

  final rest = parts.sublist(consumed);
  if (rest.length > 1) return null;
  final seg = rest.isEmpty ? null : rest[0].toLowerCase();
  if (seg != null && !_knownSegments.contains(seg)) return null;

  final tab = seg != null && channelTabIds.contains(seg) ? seg : null;
  return ParsedChannelUrl(base: 'https://www.youtube.com/${parts.sublist(0, consumed).join('/')}', tab: tab);
}

String channelTabUrl(String base, String tab) => '$base/$tab';

/// Which of Videos / Shorts / Live-streams a channel has, from yt-dlp's root listing.
/// Multi-tab channels return the tabs as nested playlists; single-tab channels return videos directly.
List<ChannelTab> channelTabsFromRoot(Map<String, dynamic> raw, String base) {
  final entries = raw['entries'] is List ? raw['entries'] as List : const [];
  final found = <String>{};
  final tabRe = RegExp(r'/(videos|shorts|streams)/?$');
  for (final e in entries) {
    if (e is! Map || e['_type'] != 'playlist') continue;
    final u = '${e['webpage_url'] ?? e['url'] ?? ''}';
    final m = tabRe.firstMatch(u);
    if (m != null) found.add(m.group(1)!);
  }
  if (found.isEmpty) found.add('videos'); // single-tab channel
  return [
    for (final id in channelTabIds)
      if (found.contains(id)) ChannelTab(id: id, url: channelTabUrl(base, id)),
  ];
}

/// Square avatar URL from a channel's thumbnail list (the original is huge: `=s0`).
String? channelAvatar(Object? thumbnails) {
  if (thumbnails is! List) return null;
  for (final t in thumbnails) {
    if (t is! Map) continue;
    final id = '${t['id'] ?? ''}';
    final url = t['url'];
    if (RegExp('avatar', caseSensitive: false).hasMatch(id) && url is String && url.isNotEmpty) {
      return url.replaceFirst(RegExp(r'=s\d+[^/]*$'), '=s176-c');
    }
  }
  return null;
}
