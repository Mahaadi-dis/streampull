// Port of src/shared/ytdlpArgs.test.ts: the Dart logic must behave exactly like the desktop app's TypeScript.
import 'package:streampull/core/channel.dart';
import 'package:streampull/core/models.dart';
import 'package:streampull/core/ytdlp_args.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('formatArgs', () {
    test('caps height and merges to mp4', () {
      final a = formatArgs('720');
      expect(a[1], 'bv*[height<=720]+ba/b[height<=720]/b');
      expect(a, contains('mp4'));
    });
    test('best has no height filter', () {
      expect(formatArgs('best')[1], 'bv*+ba/b/b');
    });
    test('extracts audio for mp3 and m4a', () {
      expect(formatArgs('mp3'), containsAll(['-x', 'mp3']));
      expect(formatArgs('m4a'), containsAll(['-x', 'm4a']));
    });
  });

  group('buildExtraArgs', () {
    test('combines format, output name, rate limit and referer', () {
      final a = buildExtraArgs(
        quality: '720',
        fileName: 'My: Clip',
        referer: 'https://site/page',
        nameTemplate: NameTemplate.title,
        speedLimit: '2M',
      );
      expect(a[a.indexOf('-o') + 1], 'My Clip.%(ext)s');
      expect(a.sublist(a.indexOf('--limit-rate'), a.indexOf('--limit-rate') + 2), ['--limit-rate', '2M']);
      expect(a.sublist(a.length - 2), ['--referer', 'https://site/page']);
      expect(a[1], 'bv*[height<=720]+ba/b[height<=720]/b');
    });
    test('uses the template when no literal name is given and skips empty options', () {
      final a = buildExtraArgs(quality: 'mp3', nameTemplate: NameTemplate.uploaderTitle);
      expect(a[a.indexOf('-o') + 1], '%(uploader|)s - %(title).120B.%(ext)s');
      expect(a, isNot(contains('--limit-rate')));
      expect(a, isNot(contains('--referer')));
    });
    test('escapes percent signs in literal names', () {
      expect(outputNameFor('100% sure', NameTemplate.title), '100%% sure');
    });
  });

  group('misc', () {
    test('classifies errors', () {
      expect(classifyError('ERROR: Unsupported URL: x'), ErrorCode.unsupported);
      expect(classifyError('ERROR: Private video. Sign in'), ErrorCode.private);
      expect(classifyError('getaddrinfo failed'), ErrorCode.network);
      expect(
        classifyError('ERROR: [instagram:user] instagram: Unable to extract data; please report this issue'),
        ErrorCode.loginRequired,
      );
      expect(classifyError('boom'), ErrorCode.unknown);
    });
    test('validates urls', () {
      expect(isValidUrl('https://a.com/x'), isTrue);
      expect(isValidUrl('file:///c:/x'), isFalse);
      expect(isValidUrl('nope'), isFalse);
    });
    test('detects a single video inside a playlist url', () {
      expect(wantsSingle('https://www.youtube.com/watch?v=abc&list=PL1'), isTrue);
      expect(wantsSingle('https://www.youtube.com/playlist?list=PL1'), isFalse);
    });
    test('picks the most useful stderr line', () {
      expect(lastErrorLine('a\nERROR: bad thing\nWARNING: later'), 'ERROR: bad thing');
      expect(lastErrorLine('only line'), 'only line');
      expect(lastErrorLine(''), isNull);
    });
    test('sanitizes file names', () {
      expect(sanitizeFileName('a<b>:c"d/e\\f|g?h*  i. '), 'a b c d e f g h i');
      expect(sanitizeFileName('x' * 400).length, 150);
    });
  });

  group('buildQualityOptions', () {
    test('builds a ladder with sizes', () {
      final o = buildQualityOptions([
        {'height': 1080, 'vcodec': 'avc1', 'acodec': 'none', 'filesize': 100},
        {'height': 720, 'vcodec': 'avc1', 'acodec': 'none', 'filesize': 60},
        {'vcodec': 'none', 'acodec': 'mp4a', 'filesize': 10},
      ]);
      expect(o.map((x) => x.key).toList(), ['best', '1080', '720', 'mp3', 'm4a']);
      expect(o[1].sizeBytes, 110);
    });
    test('does not add audio twice for muxed formats', () {
      final o = buildQualityOptions([
        {'height': 360, 'vcodec': 'avc1', 'acodec': 'mp4a', 'filesize': 50},
        {'vcodec': 'none', 'acodec': 'mp4a', 'filesize': 10},
      ]);
      expect(o.firstWhere((x) => x.key == '360').sizeBytes, 50);
    });
    test('falls back when there are no formats', () {
      expect(buildQualityOptions(null).length, greaterThan(3));
    });
  });

  group('mapInfo', () {
    test('maps a playlist', () {
      final i = mapInfo('https://x/p', {
        '_type': 'playlist',
        'title': 'P',
        'entries': [
          {'id': 'a', 'title': 'A', 'url': 'https://x/a'},
          null,
          {'id': 'b', 'url': 'bad'},
        ],
      });
      expect(i.isPlaylist, isTrue);
      expect(i.entries, hasLength(1));
    });
    test('maps a single video', () {
      final i = mapInfo('https://x/v', {
        'title': 'V',
        'duration': 12,
        'uploader': 'U',
        'extractor_key': 'Youtube',
        'thumbnails': [
          {'url': 'https://t/1'},
          {'url': 'https://t/2'},
        ],
        'formats': [],
      });
      expect(i.isPlaylist, isFalse);
      expect(i.duration, 12.0);
      expect(i.thumbnail, 'https://t/2');
      expect(i.site, 'Youtube');
    });
    test('flags live and upcoming entries', () {
      final i = mapInfo('https://x/p', {
        '_type': 'playlist',
        'title': 'C',
        'entries': [
          {'id': 'a', 'title': 'A', 'url': 'https://x/a', 'live_status': 'is_live'},
          {'id': 'b', 'title': 'B', 'url': 'https://x/b', 'live_status': 'is_upcoming'},
          {'id': 'c', 'title': 'C', 'url': 'https://x/c', 'live_status': 'was_live'},
        ],
      });
      expect(i.entries.map((e) => e.liveStatus).toList(), ['live', 'upcoming', null]);
    });
  });

  group('channels', () {
    test('finds the tabs a channel has from the root listing', () {
      const base = 'https://www.youtube.com/@x';
      final tabs = channelTabsFromRoot({
        'entries': [
          {'_type': 'playlist', 'webpage_url': '$base/videos'},
          {'_type': 'playlist', 'webpage_url': '$base/streams'},
          {'_type': 'playlist', 'webpage_url': '$base/shorts'},
          {'_type': 'playlist', 'webpage_url': '$base/playlists'},
        ],
      }, base);
      expect(tabs.map((t) => t.id).toList(), ['videos', 'shorts', 'streams']); // display order
      expect(tabs[1].url, '$base/shorts');
    });
    test('treats a root that lists videos directly as a videos-only channel', () {
      const base = 'https://www.youtube.com/@solo';
      expect(
        channelTabsFromRoot({
          'entries': [
            {'_type': 'url', 'url': 'https://www.youtube.com/watch?v=a'},
          ],
        }, base),
        [const ChannelTab(id: 'videos', url: '$base/videos')],
      );
    });
    test('picks a square avatar and shrinks it', () {
      expect(
        channelAvatar([
          {'id': 'banner_uncropped', 'url': 'https://x/banner=s0'},
          {'id': 'avatar_uncropped', 'url': 'https://yt3.googleusercontent.com/abc=s0'},
        ]),
        'https://yt3.googleusercontent.com/abc=s176-c',
      );
      expect(channelAvatar(null), isNull);
    });
  });
}
