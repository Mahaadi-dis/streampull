// "A newer version is available": asks GitHub for the latest release (the desktop app does the same). Nothing is
// downloaded or installed; the UI only links to the release page.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'version.dart';

const _repo = 'Mahaadi-dis/streampull';
const releasesPage = 'https://github.com/$_repo/releases';

class UpdateInfo {
  const UpdateInfo({required this.version, required this.current, required this.url});

  final String version;
  final String current;
  final String url;
}

/// The newer release, or null when up to date, offline or anything fails (an update check must never get in the way).
Future<UpdateInfo?> checkForUpdate(String current) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 10);
  try {
    final req = await client.getUrl(Uri.parse('https://api.github.com/repos/$_repo/releases/latest'));
    req.headers
      ..set('Accept', 'application/vnd.github+json')
      ..set('User-Agent', 'StreamPull-Android/$current');
    final res = await req.close().timeout(const Duration(seconds: 15));
    if (res.statusCode != 200) return null;
    final json = jsonDecode(await res.transform(utf8.decoder).join()) as Map<String, dynamic>;
    if (json['draft'] == true || json['prerelease'] == true) return null;
    final tag = (json['tag_name'] as String?) ?? '';
    if (!isNewerVersion(tag, current)) return null;
    final html = json['html_url'];
    // Only ever link to this project's own releases, whatever the response says.
    final url = html is String && html.startsWith('https://github.com/$_repo/') ? html : releasesPage;
    return UpdateInfo(version: tag.replaceFirst(RegExp(r'^v'), ''), current: current, url: url);
  } catch (_) {
    return null;
  } finally {
    client.close(force: true);
  }
}
