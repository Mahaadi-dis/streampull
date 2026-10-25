// Port of src/shared/downloadOptions.test.ts.
import 'package:flutter_test/flutter_test.dart';
import 'package:streampull/core/download_options.dart';
import 'package:streampull/core/ytdlp_args.dart';

void main() {
  const defaults = DownloadPrefs();

  group('audio options', () {
    test('embeds a square cover and tags by default', () {
      expect(downloadOptionArgs('mp3', defaults), ['--embed-thumbnail', '--convert-thumbnails', 'jpg', '--ppa', squareCoverPpa, '--embed-metadata']);
    });

    test('skips the crop when the cover should stay as it is', () {
      final a = downloadOptionArgs('m4a', const DownloadPrefs(squareCover: false));
      expect(a, contains('--embed-thumbnail'));
      expect(a, isNot(contains('--ppa')));
    });

    test('does nothing when the toggles are off', () {
      expect(downloadOptionArgs('mp3', const DownloadPrefs(embedCover: false, embedTags: false)), isEmpty);
    });

    test('never adds audio options to a video download', () {
      expect(downloadOptionArgs('1080', defaults), isEmpty);
      expect(downloadOptionArgs('best', defaults), isEmpty);
    });
  });

  group('mp3 bitrate', () {
    test('maps the setting to yt-dlp', () {
      expect(mp3QualityArg('best'), '0');
      expect(mp3QualityArg('320'), '320K');
      expect(mp3QualityArg('128'), '128K');
    });

    test('is used by formatArgs for mp3 only', () {
      expect(formatArgs('mp3'), ['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0']);
      expect(formatArgs('mp3', '192'), ['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '192K']);
      expect(formatArgs('m4a', '128'), ['-f', 'ba[ext=m4a]/ba/b', '-x', '--audio-format', 'm4a']);
    });
  });
}
