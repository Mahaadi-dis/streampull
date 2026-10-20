// Translations. The strings are the desktop app's own `ar.json` / `en.json`, copied into assets/i18n by
// tool/sync_i18n.dart, so both apps always say the same thing.

import 'dart:convert';

import 'package:flutter/services.dart';

class I18n {
  I18n(this._dicts, this.lang);

  final Map<String, Map<String, String>> _dicts;

  /// 'ar' or 'en'
  String lang;

  bool get isRtl => lang == 'ar';

  /// Translate [key]; `{name}` placeholders are replaced from [vars]. Falls back to English, then to the key.
  String t(String key, [Map<String, Object?>? vars]) {
    var s = _dicts[lang]?[key] ?? _dicts['en']?[key] ?? key;
    vars?.forEach((k, v) => s = s.replaceAll('{$k}', '$v'));
    return s;
  }

  static Map<String, String> _decode(String json) =>
      (jsonDecode(json) as Map<String, dynamic>).map((k, v) => MapEntry(k, '$v'));

  static I18n fromJson({required String ar, required String en, String lang = 'ar'}) =>
      I18n({'ar': _decode(ar), 'en': _decode(en)}, lang);

  static Future<I18n> load(AssetBundle bundle, {String lang = 'ar'}) async => fromJson(
        ar: await bundle.loadString('assets/i18n/ar.json'),
        en: await bundle.loadString('assets/i18n/en.json'),
        lang: lang,
      );
}
