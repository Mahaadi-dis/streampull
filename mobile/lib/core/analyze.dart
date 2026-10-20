// Turns a pasted URL into something the UI can show: a single video, a playlist, a YouTube channel or a social
// account (port of src/shared/analyze.ts). Platform-neutral: the caller supplies `run`, which executes yt-dlp and
// returns its parsed `-J --flat-playlist` JSON.

import 'accounts.dart';
import 'channel.dart';
import 'models.dart';
import 'ytdlp_args.dart';

class RunOptions {
  const RunOptions({required this.timeoutMs, this.playlistEnd});

  final int timeoutMs;

  /// Passed as `--playlist-end`.
  final int? playlistEnd;
}

typedef RunJson = Future<RawResult> Function(String url, RunOptions opts);

const accountListCap = 300;

String? _str(Object? v) => v is String && v.trim().isNotEmpty ? v.trim() : null;

Future<AnalyzeResult> analyzeWith(RunJson run, String url) async {
  final channel = parseYoutubeChannelUrl(url);
  if (channel != null) return _analyzeChannel(run, channel, url);
  final account = parseAccountUrl(url);
  if (account != null) return _analyzeAccount(run, account, url);
  return _analyzeUrl(run, url);
}

Future<AnalyzeResult> _analyzeUrl(RunJson run, String url) async {
  final r = await run(url, const RunOptions(timeoutMs: 90000));
  return r.ok ? AnalyzeResult.ok(mapInfo(url, r.raw!)) : AnalyzeResult.fail(r.error!, r.detail);
}

/// A TikTok / Instagram profile: list its posts.
Future<AnalyzeResult> _analyzeAccount(RunJson run, ParsedAccountUrl acc, String originalUrl) async {
  final list = await run(acc.base, const RunOptions(timeoutMs: 300000, playlistEnd: accountListCap));
  if (!list.ok) return AnalyzeResult.fail(list.error!, list.detail);
  final info = mapInfo(acc.base, list.raw!);
  if (!info.isPlaylist) return _analyzeUrl(run, originalUrl);
  final name = '@${acc.handle}';
  return AnalyzeResult.ok(info.copyWith(
    title: name,
    uploader: name,
    site: acc.platform == 'tiktok' ? 'TikTok' : 'Instagram',
    isPlaylist: true,
    channel: ChannelInfo(
      kind: 'account',
      tabs: [ChannelTab(id: 'videos', url: acc.base)],
      activeTab: 'videos',
      truncated: info.entries.length >= accountListCap,
    ),
  ));
}

/// A YouTube channel: find its tabs, then list the requested one (Videos by default).
Future<AnalyzeResult> _analyzeChannel(RunJson run, ParsedChannelUrl ch, String originalUrl) async {
  final root = await run(ch.base, const RunOptions(timeoutMs: 60000, playlistEnd: channelRootProbe));
  if (!root.ok) return AnalyzeResult.fail(root.error!, root.detail);

  final tabs = channelTabsFromRoot(root.raw!, ch.base);
  final wanted = ch.tab != null && tabs.any((t) => t.id == ch.tab) ? ch.tab : null;
  final active = tabs.cast<ChannelTab?>().firstWhere((t) => t!.id == (wanted ?? 'videos'), orElse: () => null) ??
      (tabs.isEmpty ? null : tabs.first);
  if (active == null) return _analyzeUrl(run, originalUrl);

  final list = await run(active.url, const RunOptions(timeoutMs: 300000, playlistEnd: channelListCap));
  if (!list.ok) return AnalyzeResult.fail(list.error!, list.detail);

  final info = mapInfo(active.url, list.raw!);
  final name = _str(root.raw!['uploader']) ?? _str(root.raw!['channel']) ?? info.title;
  return AnalyzeResult.ok(info.copyWith(
    title: name,
    uploader: name,
    thumbnail: channelAvatar(root.raw!['thumbnails']) ?? info.thumbnail,
    site: 'Youtube',
    isPlaylist: true,
    channel: ChannelInfo(tabs: tabs, activeTab: active.id, truncated: info.entries.length >= channelListCap),
  ));
}
