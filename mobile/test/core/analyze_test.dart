// Port of src/shared/analyze.test.ts.
import 'package:streampull/core/analyze.dart';
import 'package:streampull/core/models.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> video(String id) => {'id': id, 'title': id, 'url': 'https://www.youtube.com/watch?v=$id'};

/// Fake yt-dlp: answers by URL and records every call.
({RunJson run, List<({String url, int? end})> calls}) fake(Map<String, RawResult> map) {
  final calls = <({String url, int? end})>[];
  Future<RawResult> run(String url, RunOptions o) async {
    calls.add((url: url, end: o.playlistEnd));
    return map[url] ?? RawResult.fail(ErrorCode.unknown, 'unexpected $url');
  }

  return (run: run, calls: calls);
}

const base = 'https://www.youtube.com/@x';
final tabRoot = RawResult.ok({
  'title': 'X',
  'uploader': 'X Channel',
  'thumbnails': [
    {'id': 'avatar_uncropped', 'url': 'https://yt3.googleusercontent.com/a=s0'},
  ],
  'entries': [
    {'_type': 'playlist', 'webpage_url': '$base/videos'},
    {'_type': 'playlist', 'webpage_url': '$base/shorts'},
  ],
});

void main() {
  test('lists a single video', () async {
    final f = fake({'https://v.com/a': RawResult.ok({'title': 'A', 'formats': []})});
    final r = await analyzeWith(f.run, 'https://v.com/a');
    expect(r.ok, isTrue);
    expect(r.info!.title, 'A');
    expect(r.info!.channel, isNull);
  });

  test('probes a YouTube channel root, then lists the chosen tab', () async {
    final f = fake({
      base: tabRoot,
      '$base/shorts': RawResult.ok({
        '_type': 'playlist',
        'entries': [video('s1'), video('s2')],
      }),
    });
    final r = await analyzeWith(f.run, '$base/shorts');
    expect(r.ok, isTrue);
    final info = r.info!;
    expect(info.title, 'X Channel');
    expect(info.channel?.activeTab, 'shorts');
    expect(info.channel?.tabs.map((t) => t.id).toList(), ['videos', 'shorts']);
    expect(info.entries, hasLength(2));
    expect(info.thumbnail, 'https://yt3.googleusercontent.com/a=s176-c');
    expect(f.calls.map((c) => c.url).toList(), [base, '$base/shorts']);
    expect(f.calls[0].end, 8); // cheap probe
  });

  test('falls back to Videos when the requested tab does not exist', () async {
    final f = fake({
      base: RawResult.ok({
        'title': 'X',
        'entries': [
          {'_type': 'playlist', 'webpage_url': '$base/videos'},
        ],
      }),
      '$base/videos': RawResult.ok({
        '_type': 'playlist',
        'entries': [video('a')],
      }),
    });
    final r = await analyzeWith(f.run, '$base/streams');
    expect(r.info?.channel?.activeTab, 'videos');
  });

  test('lists a TikTok account as an "account"', () async {
    const tt = 'https://www.tiktok.com/@name';
    final f = fake({
      tt: RawResult.ok({
        '_type': 'playlist',
        'entries': [
          {'id': '1', 'title': 'one', 'url': '$tt/video/1'},
        ],
      }),
    });
    final r = await analyzeWith(f.run, tt);
    expect(r.info?.channel?.kind, 'account');
    expect(r.info?.title, '@name');
    expect(r.info?.site, 'TikTok');
  });

  test('passes errors through', () async {
    const ig = 'https://www.instagram.com/someone/';
    final f = fake({ig: const RawResult.fail(ErrorCode.loginRequired, 'x')});
    final r = await analyzeWith(f.run, ig);
    expect(r.ok, isFalse);
    expect(r.error, ErrorCode.loginRequired);
  });
}
