// Generates the Android screenshots used in the READMEs (docs/screenshots/android/*.png) by rendering the real
// screens with sample data. It only runs when asked to:
//
//   SCREENSHOTS=1 flutter test test/screenshots/screenshots_test.dart the environment variable SCREENSHOTS=1
//
// Output goes to ../docs/screenshots/android/ (screens per language, and a strip showing all six themes).

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:streampull/core/models.dart';
import 'package:streampull/core/themes.dart';
import 'package:streampull/i18n/i18n.dart';
import 'package:streampull/main.dart';
import 'package:streampull/state/app_model.dart';
import 'package:streampull/ui/widgets/basics.dart';

import '../support/fake_native_api.dart';

final enabled = Platform.environment['SCREENSHOTS'] == '1';
const outDir = '../docs/screenshots/android';
const phone = Size(390, 844);
const ratio = 3.0;

/// A colorful stand-in for a video thumbnail, different per title.
Widget fakeThumb(String src) {
  final hue = (src.hashCode.abs() % 360).toDouble();
  return DecoratedBox(
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [HSLColor.fromAHSL(1, hue, 0.55, 0.42).toColor(), HSLColor.fromAHSL(1, (hue + 50) % 360, 0.6, 0.22).toColor()],
      ),
    ),
  );
}

class Sample {
  Sample(this.ar);
  final bool ar;
  String pick(String en, String arText) => ar ? arText : en;

  late final media = MediaInfo(
    url: 'https://example.com/watch?v=aurora',
    title: pick('Northern lights over the fjord — 4K timelapse', 'الشفق القطبي فوق الفيوردات — تصوير بطيء 4K'),
    thumbnail: 'thumb-aurora',
    duration: 754,
    uploader: pick('Nordic Frames', 'إطارات الشمال'),
    site: 'Example',
    isPlaylist: false,
    entries: const [],
    options: const [
      QualityOption(key: 'best', kind: 'video', label: 'Best', sizeBytes: 612000000),
      QualityOption(key: '1080', kind: 'video', label: '1080p', sizeBytes: 318000000),
      QualityOption(key: '720', kind: 'video', label: '720p', sizeBytes: 164000000),
      QualityOption(key: '480', kind: 'video', label: '480p', sizeBytes: 91000000),
      QualityOption(key: 'mp3', kind: 'audio', label: 'MP3', sizeBytes: 17800000),
      QualityOption(key: 'm4a', kind: 'audio', label: 'M4A', sizeBytes: 11200000),
    ],
  );

  List<DownloadItem> get queue {
    final now = DateTime.now().millisecondsSinceEpoch;
    return [
      DownloadItem(
        id: 'd1', url: 'https://example.com/1', title: pick('Street food tour — the old market', 'جولة أكل الشارع في السوق القديم'),
        thumbnail: 'thumb-food', duration: 1260, uploader: pick('City Bites', 'لقمة المدينة'), quality: '1080', status: 'downloading',
        percent: 62, speed: 6.4e6, eta: 38, downloadedBytes: 198000000, totalBytes: 318000000, createdAt: now,
      ),
      DownloadItem(
        id: 'd2', url: 'https://example.com/2', title: pick('Relaxing piano for studying — 1 hour', 'بيانو هادئ للمذاكرة — ساعة كاملة'),
        thumbnail: 'thumb-piano', duration: 3600, uploader: pick('Quiet Keys', 'مفاتيح الهدوء'), quality: 'mp3', status: 'downloading',
        percent: 24, speed: 2.1e6, eta: 61, downloadedBytes: 21000000, totalBytes: 86000000, createdAt: now - 1,
      ),
      DownloadItem(
        id: 'd3', url: 'https://example.com/3', title: pick('Desert road trip, day three', 'رحلة الصحراء، اليوم الثالث'),
        thumbnail: 'thumb-desert', duration: 902, uploader: pick('Wanderlight', 'ضوء المسافر'), quality: '720', status: 'queued',
        percent: 0, downloadedBytes: 0, createdAt: now - 2,
      ),
      DownloadItem(
        id: 'd4', url: 'https://example.com/4', title: pick('Coffee brewing basics', 'أساسيات تحضير القهوة'),
        thumbnail: 'thumb-coffee', duration: 420, uploader: pick('Bean There', 'حبة بن'), quality: '720', status: 'paused',
        percent: 47, downloadedBytes: 38000000, totalBytes: 81000000, createdAt: now - 3,
      ),
    ];
  }

  List<HistoryItem> get history {
    final now = DateTime.now().millisecondsSinceEpoch;
    HistoryItem h(String id, String en, String arT, String thumb, String up, String upAr, String q, String kind, double dur, int size, int agoMin) => HistoryItem(
          id: id, url: 'https://example.com/$id', title: pick(en, arT), thumbnail: thumb, uploader: pick(up, upAr), duration: dur, quality: q, kind: kind,
          filePath: 'content://media/external/downloads/$id', sizeBytes: size, completedAt: now - agoMin * 60000,
        );
    return [
      h('h1', 'Mountain sunrise, slow motion', 'شروق الشمس على الجبل بالتصوير البطيء', 'thumb-sunrise', 'Nordic Frames', 'إطارات الشمال', '1080', 'video', 312, 142000000, 12),
      h('h2', 'Lo-fi beats to relax to', 'إيقاعات لو-فاي للاسترخاء', 'thumb-lofi', 'Quiet Keys', 'مفاتيح الهدوء', 'mp3', 'audio', 2710, 64000000, 95),
      h('h3', 'How a mechanical watch works', 'كيف تعمل الساعة الميكانيكية', 'thumb-watch', 'Gear Lab', 'مختبر التروس', '720', 'video', 845, 96000000, 60 * 5),
      h('h4', 'Ten minutes of calm ocean waves', 'عشر دقائق من أمواج البحر الهادئة', 'thumb-ocean', 'Wanderlight', 'ضوء المسافر', 'm4a', 'audio', 600, 9400000, 60 * 26),
      h('h5', 'Rooftop gardening for beginners', 'زراعة الأسطح للمبتدئين', 'thumb-garden', 'Green Thumb', 'اليد الخضراء', '1080', 'video', 1130, 221000000, 60 * 50),
    ];
  }
}

Future<ui.Image> shot(
  WidgetTester tester, {
  required String lang,
  required String theme,
  required int tab,
  bool analyzed = false,
  bool scrollToEnd = false,
  double scrollBy = 0,
  Future<void> Function(WidgetTester tester, AppModel model)? prepare,
  String? file,
}) async {
  final s = Sample(lang == 'ar');
  final api = FakeNativeApi()
    ..settings = Settings(lang: lang, theme: theme)
    ..queue = s.queue
    ..history = s.history;
  final model = AppModel(
    api,
    I18n.fromJson(ar: File('assets/i18n/ar.json').readAsStringSync(), en: File('assets/i18n/en.json').readAsStringSync()),
  );
  await tester.runAsync(model.init);
  model.tab = tab;
  if (analyzed) model.analysis = Analysis.done(s.media);

  final key = GlobalKey();
  tester.view
    ..physicalSize = phone * ratio
    ..devicePixelRatio = ratio
    ..padding = const FakeViewPadding(top: 24 * ratio)
    ..viewPadding = const FakeViewPadding(top: 24 * ratio);
  await tester.pumpWidget(RepaintBoundary(key: key, child: StreamPullApp(model: model)));
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 250));
  }

  if (scrollBy != 0) {
    await tester.drag(find.byType(ListView).first, Offset(0, scrollBy));
    for (var i = 0; i < 4; i++) {
      await tester.pump(const Duration(milliseconds: 250));
    }
  }
  if (prepare != null) {
    await prepare(tester, model);
    for (var i = 0; i < 3; i++) {
      await tester.pump(const Duration(milliseconds: 250));
    }
  }
  if (scrollToEnd) {
    await tester.drag(find.byType(ListView).first, const Offset(0, -6000));
    for (var i = 0; i < 4; i++) {
      await tester.pump(const Duration(milliseconds: 250));
    }
  }

  final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(key));
  final image = await tester.runAsync(() => boundary.toImage(pixelRatio: ratio));
  if (file != null) {
    final bytes = await tester.runAsync(() => image!.toByteData(format: ui.ImageByteFormat.png));
    File('$outDir/$file').writeAsBytesSync(bytes!.buffer.asUint8List());
  }
  await tester.pumpWidget(const SizedBox());
  model.dispose();
  return image!;
}

/// Puts [images] side by side on a transparent background, [height] px tall.
Future<void> strip(WidgetTester tester, List<ui.Image> images, String file, {double gap = 36, double height = 1200}) async {
  final w = images.first.width * height / images.first.height;
  final width = (w * images.length + gap * (images.length - 1)).ceil();
  final bytes = await tester.runAsync(() async {
    final rec = ui.PictureRecorder();
    final canvas = Canvas(rec);
    for (var i = 0; i < images.length; i++) {
      final dst = Rect.fromLTWH(i * (w + gap), 0, w, height);
      final rr = RRect.fromRectAndRadius(dst, Radius.circular(height * 0.045));
      canvas.save();
      canvas.clipRRect(rr);
      canvas.drawImageRect(images[i], Rect.fromLTWH(0, 0, images[i].width.toDouble(), images[i].height.toDouble()), dst, Paint()..filterQuality = FilterQuality.high);
      canvas.restore();
      canvas.drawRRect(rr, Paint()..style = PaintingStyle.stroke..strokeWidth = 3..color = const Color(0x40FFFFFF));
    }
    final img = await rec.endRecording().toImage(width, height.toInt());
    return (await img.toByteData(format: ui.ImageByteFormat.png))!;
  });
  File('$outDir/$file').writeAsBytesSync(bytes!.buffer.asUint8List());
}

void main() {
  if (!enabled) {
    test('screenshots (skipped: run with with the environment variable SCREENSHOTS=1)', () {}, skip: true);
    return;
  }
  setUpAll(() async {
    Directory(outDir).createSync(recursive: true);
    // flutter test draws everything with a placeholder font unless the real ones are loaded.
    final plex = FontLoader('IBMPlexSansArabic');
    for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
      plex.addFont(Future.value(ByteData.sublistView(File('assets/fonts/IBMPlexSansArabic-$w.ttf').readAsBytesSync())));
    }
    await plex.load();
    final root = Platform.environment['FLUTTER_ROOT']!;
    final icons = FontLoader('MaterialIcons')
      ..addFont(Future.value(ByteData.sublistView(File('$root/bin/cache/artifacts/material_fonts/materialicons-regular.otf').readAsBytesSync())));
    await icons.load();
  });
  MediaThumb.debugImage = fakeThumb;

  for (final lang in ['ar', 'en']) {
    testWidgets('screens ($lang)', (tester) async {
      // 390 x 844 dp at 3x = 1170 x 2532 px
      await shot(tester, lang: lang, theme: 'violet', tab: 0, file: 'home-$lang.png');
      await shot(tester, lang: lang, theme: 'violet', tab: 0, analyzed: true, file: 'analyze-$lang.png');
      await shot(tester, lang: lang, theme: 'violet', tab: 1, file: 'downloads-$lang.png');
      await shot(tester, lang: lang, theme: 'violet', tab: 2, file: 'library-$lang.png');
      await shot(tester, lang: lang, theme: 'violet', tab: 3, file: 'settings-$lang.png');
      await shot(tester, lang: lang, theme: 'violet', tab: 3, scrollToEnd: true, file: 'about-$lang.png');
      // the audio / video extras in Settings, and the "cut a clip" fields on the media card
      await shot(
        tester,
        lang: lang,
        theme: 'violet',
        tab: 3,
        prepare: (t, m) async {
          await t.scrollUntilVisible(find.text(m.t('set.audio')), 300, scrollable: find.byType(Scrollable).first);
          await t.drag(find.byType(ListView).first, const Offset(0, 330));
        },
        file: 'extras-$lang.png',
      );
      await shot(
        tester,
        lang: lang,
        theme: 'violet',
        tab: 0,
        analyzed: true,
        scrollBy: -480,
        prepare: (t, m) async {
          await t.tap(find.text(m.t('media.clip')));
          await t.pump(const Duration(milliseconds: 300));
          final fields = find.byType(TextField);
          await t.enterText(fields.at(fields.evaluate().length - 2), '1:30');
          await t.enterText(fields.at(fields.evaluate().length - 1), '4:15');
        },
        file: 'clip-$lang.png',
      );
    });

    testWidgets('themes ($lang)', (tester) async {
      // the analyzed home screen shows the most of each theme's accent colors
      final images = <ui.Image>[];
      for (final t in appThemes) {
        images.add(await shot(tester, lang: lang, theme: t.id, tab: 0, analyzed: true));
      }
      await strip(tester, images, 'themes-$lang.png');
    });
  }

  tearDownAll(() => MediaThumb.debugImage = null);
}
