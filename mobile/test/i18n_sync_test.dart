import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:streampull/i18n/i18n.dart';

void main() {
  test('asset translations are the desktop app\'s (run tool/sync_i18n.dart if this fails)', () {
    for (final n in ['ar', 'en']) {
      final src = File('../src/renderer/src/i18n/$n.json');
      if (!src.existsSync()) continue; // built outside the full repository
      expect(File('assets/i18n/$n.json').readAsStringSync(), src.readAsStringSync(), reason: '$n.json is out of date');
    }
  });

  test('every key used by the app exists in both languages', () {
    final ar = jsonDecode(File('assets/i18n/ar.json').readAsStringSync()) as Map<String, dynamic>;
    final en = jsonDecode(File('assets/i18n/en.json').readAsStringSync()) as Map<String, dynamic>;
    expect(ar.keys.toSet(), en.keys.toSet());
  });

  test('placeholders are replaced and unknown keys fall back to the key', () {
    final i18n = I18n.fromJson(ar: '{"a":"مرحبا {n}"}', en: '{"a":"Hello {n}","b":"only english"}');
    expect(i18n.t('a', {'n': 3}), 'مرحبا 3');
    expect(i18n.t('b'), 'only english');
    expect(i18n.t('nope'), 'nope');
    i18n.lang = 'en';
    expect(i18n.t('a', {'n': 'x'}), 'Hello x');
  });
}
