// Social-media account (profile) URLs, plus which sites may reuse a browser login (port of src/shared/accounts.ts).

import 'channel.dart' show parseWebUri;

class ParsedAccountUrl {
  const ParsedAccountUrl({required this.platform, required this.base, required this.handle});

  /// 'tiktok' or 'instagram'
  final String platform;

  /// Profile root, e.g. https://www.tiktok.com/@name
  final String base;
  final String handle;

  @override
  bool operator ==(Object other) =>
      other is ParsedAccountUrl && other.platform == platform && other.base == base && other.handle == handle;

  @override
  int get hashCode => Object.hash(platform, base, handle);

  @override
  String toString() => 'ParsedAccountUrl($platform, $base, $handle)';
}

// First path segments on instagram.com that are not profiles.
const _igReserved = <String>{
  'p',
  'reel',
  'reels',
  'tv',
  'stories',
  'explore',
  'accounts',
  'direct',
  'about',
  'legal',
  'developers',
  'web',
  'api',
  'graphql',
  'oauth',
  'privacy',
  'press',
  'directory',
  'challenge',
  'emails',
  'session',
};

final _tiktokHost = RegExp(r'^(www\.|m\.)?tiktok\.com$');
final _tiktokHandle = RegExp(r'^@[\w.]{1,48}$');
final _instagramHost = RegExp(r'^(www\.)?instagram\.com$');
final _instagramHandle = RegExp(r'^[A-Za-z0-9._]{1,30}$');

ParsedAccountUrl? parseAccountUrl(String url) {
  final u = parseWebUri(url);
  if (u == null) return null;
  if (u.scheme != 'https' && u.scheme != 'http') return null;
  final host = u.host.toLowerCase();
  final parts = u.path.split('/').where((s) => s.isNotEmpty).toList();

  if (_tiktokHost.hasMatch(host)) {
    // /@name — but not /@name/video/123 (that's a single video)
    if (parts.length == 1 && _tiktokHandle.hasMatch(parts[0])) {
      return ParsedAccountUrl(platform: 'tiktok', base: 'https://www.tiktok.com/${parts[0]}', handle: parts[0].substring(1));
    }
    return null;
  }

  if (_instagramHost.hasMatch(host)) {
    if (parts.length == 1 && _instagramHandle.hasMatch(parts[0]) && !_igReserved.contains(parts[0].toLowerCase())) {
      return ParsedAccountUrl(platform: 'instagram', base: 'https://www.instagram.com/${parts[0]}/', handle: parts[0]);
    }
    return null;
  }
  return null;
}

final _loginHosts = RegExp(r'(^|\.)(instagram\.com|facebook\.com|fb\.watch|threads\.net|tiktok\.com|twitter\.com|x\.com)$');

/// Sites where content commonly needs a login, so a browser session would be reused automatically.
/// YouTube is deliberately excluded: using account cookies there can get the account rate-limited.
bool usesBrowserLogin(String url) {
  final u = parseWebUri(url);
  return u != null && _loginHosts.hasMatch(u.host.toLowerCase());
}
