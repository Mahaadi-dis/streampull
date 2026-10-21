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

    test('never adds cover or subtitle options to the wrong kind of download', () {
      const prefs = DownloadPrefs(subtitleMode: SubtitleMode.embed);
      expect(downloadOptionArgs('mp3', prefs), isNot(contains('--embed-subs')));
      expect(downloadOptionArgs('1080', prefs), isNot(contains('--embed-thumbnail')));
      expect(downloadOptionArgs('1080', prefs), isNot(contains('--embed-metadata')));
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

  group('subtitles', () {
    test('is off by default', () {
      expect(downloadOptionArgs('1080', defaults), isEmpty);
    });

    test('embeds into the video', () {
      expect(downloadOptionArgs('1080', const DownloadPrefs(subtitleMode: SubtitleMode.embed)),
          ['--write-subs', '--write-auto-subs', '--sub-langs', 'ar,en', '--embed-subs']);
    });

    test('saves a separate .srt file', () {
      expect(downloadOptionArgs('best', const DownloadPrefs(subtitleMode: SubtitleMode.file, subtitleLangs: 'fr')),
          ['--write-subs', '--write-auto-subs', '--sub-langs', 'fr', '--convert-subs', 'srt']);
    });

    test('cleans the language list', () {
      expect(cleanSubtitleLangs('AR, en;fr-CA  ar'), 'ar,en,fr-CA');
      expect(cleanSubtitleLangs('en --exec "x;y"'), 'en');
      expect(cleanSubtitleLangs('--exec'), isNull);
      expect(cleanSubtitleLangs(''), isNull);
    });

    test('falls back to the default languages when the list is unusable', () {
      final a = downloadOptionArgs('720', const DownloadPrefs(subtitleMode: SubtitleMode.file, subtitleLangs: '!!!'));
      expect(a[a.indexOf('--sub-langs') + 1], 'ar,en');
    });
  });

  group('clips', () {
    test('parses times', () {
      expect(parseClipTime('90'), 90);
      expect(parseClipTime('1:30'), 90);
      expect(parseClipTime('01:02:03'), 3723);
      expect(parseClipTime('1:30.5'), 90.5);
      expect(parseClipTime(' 0:05 '), 5);
    });

    test('rejects anything that is not a time', () {
      for (final t in ['', 'abc', '1:60', '-5', '1:2:3:4', '1:30 --exec', '1,5']) {
        expect(parseClipTime(t), isNull, reason: t);
      }
    });

    test('formats times', () {
      expect(formatClipTime(75), '1:15');
      expect(formatClipTime(5), '0:05');
      expect(formatClipTime(3725), '1:02:05');
    });

    test('validates a range against the video length', () {
      expect(validateClip(10, 20), const ClipRange(10, 20));
      expect(validateClip(10.4, 20.2), const ClipRange(10, 21));
      expect(validateClip(10, 200, 60), const ClipRange(10, 60));
      expect(validateClip(70, 80, 60), isNull);
      expect(validateClip(20, 10), isNull);
      expect(validateClip(5, 5), isNull);
      expect(validateClip(-1, 5), isNull);
      expect(validateClip(0, double.infinity), isNull);
    });

    test('cuts the section and keeps the cut accurate', () {
      expect(downloadOptionArgs('1080', defaults, const ClipRange(60, 150)), ['--download-sections', '*60-150', '--force-keyframes-at-cuts']);
    });

    test('works for audio too, next to the cover options', () {
      final a = downloadOptionArgs('mp3', defaults, const ClipRange(0, 30));
      expect(a, contains('--embed-thumbnail'));
      expect(a.sublist(a.length - 3), ['--download-sections', '*0-30', '--force-keyframes-at-cuts']);
    });

    test('makes a file-name suffix that is safe on Windows', () {
      expect(clipSuffix(const ClipRange(75, 3725)), ' [clip 1-15 to 1-02-05]');
      expect(clipSuffix(const ClipRange(0, 30)), isNot(matches(RegExp(r'[<>:"/\\|?*]'))));
    });
  });
}
