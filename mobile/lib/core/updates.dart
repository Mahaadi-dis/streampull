// "A newer version is available": asks GitHub for the latest release (the desktop app does the same). Nothing is
// downloaded or installed; the UI only links to the release page.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'version.dart';

const repo = 'Mahaadi-dis/streampull';
const repoUrl = 'https://github.com/$repo';
const releasesPage = '$repoUrl/releases';

class UpdateInfo {
  const UpdateInfo({required this.version, required this.current, required this.url});

  final String version;
  final String current;
  final String url;
}

/// The answer to "is there a newer version?", with the cases a person needs to tell apart.
sealed class UpdateCheck {
  const UpdateCheck();
}

class UpdateNewer extends UpdateCheck {
  const UpdateNewer(this.info);
  final UpdateInfo info;
}

/// The running version is the latest published release (or newer, e.g. a development build).
class UpdateLatest extends UpdateCheck {
  const UpdateLatest(this.version);
  final String version;
}

/// Offline, rate-limited, or an unreadable answer.
class UpdateError extends UpdateCheck {
  const UpdateError();
}

/// Interprets GitHub's "latest release" response (port of src/shared/release.ts). Pre-releases and drafts do not
/// count, and the link only ever points at this project's own releases.
UpdateCheck evaluateRelease(Object? json, String current) {
  if (json is! Map) return const UpdateError();
  final tag = json['tag_name'];
  if (tag is! String || tag.isEmpty) return const UpdateError();
  final version = tag.replaceFirst(RegExp(r'^v'), '');
  if (json['draft'] == true || json['prerelease'] == true || !isNewerVersion(tag, current)) return UpdateLatest(version);
  final html = json['html_url'];
  final url = html is String && html.startsWith('$repoUrl/') ? html : releasesPage;
  return UpdateNewer(UpdateInfo(version: version, current: current, url: url));
}

/// Asks GitHub. Never throws.
Future<UpdateCheck> checkLatest(String current) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 10);
  try {
    final req = await client.getUrl(Uri.parse('https://api.github.com/repos/$repo/releases/latest'));
    req.headers
      ..set('Accept', 'application/vnd.github+json')
      ..set('User-Agent', 'StreamPull-Android/$current');
    final res = await req.close().timeout(const Duration(seconds: 15));
    if (res.statusCode != 200) return const UpdateError();
    return evaluateRelease(jsonDecode(await res.transform(utf8.decoder).join()), current);
  } catch (_) {
    return const UpdateError();
  } finally {
    client.close(force: true);
  }
}

/// The background check: the newer release, or null when up to date, offline or anything fails (an update check must
/// never get in the way).
Future<UpdateInfo?> checkForUpdate(String current) async {
  final r = await checkLatest(current);
  return r is UpdateNewer ? r.info : null;
}
