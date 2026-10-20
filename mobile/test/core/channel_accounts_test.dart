// Ports of src/shared/channel.test.ts, accounts.test.ts, themes.test.ts and version.test.ts.
import 'package:streampull/core/accounts.dart';
import 'package:streampull/core/channel.dart';
import 'package:streampull/core/themes.dart';
import 'package:streampull/core/version.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('parseYoutubeChannelUrl', () {
    test('recognises handles, with and without a tab', () {
      expect(parseYoutubeChannelUrl('https://www.youtube.com/@Google'),
          const ParsedChannelUrl(base: 'https://www.youtube.com/@Google', tab: null));
      expect(parseYoutubeChannelUrl('https://youtube.com/@Google/shorts'),
          const ParsedChannelUrl(base: 'https://www.youtube.com/@Google', tab: 'shorts'));
      expect(parseYoutubeChannelUrl('https://m.youtube.com/@Google/streams/?x=1')?.tab, 'streams');
      expect(parseYoutubeChannelUrl('https://www.youtube.com/@Google/featured')?.tab, isNull);
      expect(parseYoutubeChannelUrl('https://www.youtube.com/@Google/featured'), isNotNull);
    });
    test('recognises /channel, /c and /user forms', () {
      expect(parseYoutubeChannelUrl('https://www.youtube.com/channel/UCK8sQmJBp8GCxrOtXWBpyEA/videos'),
          const ParsedChannelUrl(base: 'https://www.youtube.com/channel/UCK8sQmJBp8GCxrOtXWBpyEA', tab: 'videos'));
      expect(parseYoutubeChannelUrl('https://www.youtube.com/c/Google')?.base, 'https://www.youtube.com/c/Google');
      expect(parseYoutubeChannelUrl('https://www.youtube.com/user/google')?.base, 'https://www.youtube.com/user/google');
    });
    test('ignores videos, playlists, live redirects and other sites', () {
      for (final u in [
        'https://www.youtube.com/watch?v=abc',
        'https://www.youtube.com/playlist?list=PL1',
        'https://www.youtube.com/@Google/live',
        'https://www.youtube.com/shorts/abc',
        'https://vimeo.com/@x',
        'not a url',
      ]) {
        expect(parseYoutubeChannelUrl(u), isNull, reason: u);
      }
    });
    test('builds tab urls', () {
      expect(channelTabUrl('https://www.youtube.com/@Google', 'shorts'), 'https://www.youtube.com/@Google/shorts');
    });
  });

  group('parseAccountUrl', () {
    test('recognises TikTok profiles only', () {
      expect(parseAccountUrl('https://www.tiktok.com/@tiktok'),
          const ParsedAccountUrl(platform: 'tiktok', base: 'https://www.tiktok.com/@tiktok', handle: 'tiktok'));
      expect(parseAccountUrl('https://tiktok.com/@some.user_1/?lang=en')?.handle, 'some.user_1');
      expect(parseAccountUrl('https://www.tiktok.com/@tiktok/video/7694797676306615583'), isNull);
      expect(parseAccountUrl('https://www.tiktok.com/'), isNull);
    });
    test('recognises Instagram profiles, not posts or system pages', () {
      expect(parseAccountUrl('https://www.instagram.com/instagram/'),
          const ParsedAccountUrl(platform: 'instagram', base: 'https://www.instagram.com/instagram/', handle: 'instagram'));
      expect(parseAccountUrl('https://instagram.com/some.user?hl=en')?.handle, 'some.user');
      for (final u in [
        'https://www.instagram.com/p/ABC123/',
        'https://www.instagram.com/reel/ABC123/',
        'https://www.instagram.com/explore/',
        'https://www.instagram.com/stories/user/123/',
      ]) {
        expect(parseAccountUrl(u), isNull, reason: u);
      }
    });
    test('ignores everything else', () {
      expect(parseAccountUrl('https://www.youtube.com/@Google'), isNull);
      expect(parseAccountUrl('nope'), isNull);
    });
  });

  test('usesBrowserLogin opts in social sites only', () {
    expect(usesBrowserLogin('https://www.instagram.com/x/'), isTrue);
    expect(usesBrowserLogin('https://x.com/user/status/1'), isTrue);
    expect(usesBrowserLogin('https://www.tiktok.com/@a'), isTrue);
    expect(usesBrowserLogin('https://www.youtube.com/watch?v=a'), isFalse);
    expect(usesBrowserLogin('https://notinstagram.com/'), isFalse);
  });

  group('themes', () {
    test('has unique ids and a valid default', () {
      final ids = appThemes.map((t) => t.id).toList();
      expect(ids.toSet().length, ids.length);
      expect(isThemeId(defaultThemeId), isTrue);
    });
    test('keeps every channel within 0-255', () {
      for (final t in appThemes) {
        for (final c in t.all) {
          expect(c, hasLength(3), reason: t.id);
          expect(c.every((n) => n >= 0 && n <= 255), isTrue, reason: t.id);
        }
      }
    });
    test('falls back to the first theme for unknown ids', () {
      expect(themeById('nope').id, appThemes.first.id);
      expect(isThemeId('nope'), isFalse);
    });
    test('produces hex colors', () {
      expect(rgbToHex([13, 8, 24]), '#0d0818');
    });
  });

  group('isNewerVersion', () {
    test('compares major, minor and patch numerically', () {
      expect(isNewerVersion('0.3.0', '0.2.0'), isTrue);
      expect(isNewerVersion('v0.10.0', '0.9.5'), isTrue);
      expect(isNewerVersion('1.0.0', '0.99.99'), isTrue);
      expect(isNewerVersion('0.2.1', '0.2.0'), isTrue);
    });
    test('is false for the same or an older version', () {
      expect(isNewerVersion('0.2.0', '0.2.0'), isFalse);
      expect(isNewerVersion('0.1.9', '0.2.0'), isFalse);
    });
    test('treats a pre-release as older than its release', () {
      expect(isNewerVersion('1.0.0', '1.0.0-beta.1'), isTrue);
      expect(isNewerVersion('1.0.0-beta.1', '1.0.0'), isFalse);
    });
    test('ignores garbage', () {
      expect(isNewerVersion('latest', '0.2.0'), isFalse);
      expect(isNewerVersion('0.3.0', ''), isFalse);
    });
  });
}
