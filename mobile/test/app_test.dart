import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:streampull/core/models.dart';
import 'package:streampull/i18n/i18n.dart';
import 'package:streampull/main.dart';
import 'support/fake_native_api.dart';
import 'package:streampull/state/app_model.dart';

Future<AppModel> boot(WidgetTester tester, {String lang = 'en'}) async {
  final api = FakeNativeApi()..settings = Settings(lang: lang);
  final model = AppModel(
    api,
    I18n.fromJson(
      ar: File('assets/i18n/ar.json').readAsStringSync(),
      en: File('assets/i18n/en.json').readAsStringSync(),
    ),
  );
  await tester.runAsync(model.init);
  await tester.pumpWidget(StreamPullApp(model: model));
  await tester.pump();
  addTearDown(() {
    model.dispose();
    api.events_.close();
  });
  return model;
}

void main() {
  testWidgets('shows the four sections and switches between them', (tester) async {
    final model = await boot(tester);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text(model.t('nav.home')), findsWidgets);

    await tester.tap(find.text(model.t('nav.settings')).last);
    await tester.pumpAndSettle();
    expect(model.tab, 3);

    await tester.tap(find.text(model.t('nav.library')).last);
    await tester.pumpAndSettle();
    expect(model.tab, 2);

    await tester.tap(find.text(model.t('nav.downloads')).last);
    await tester.pumpAndSettle();
    expect(model.tab, 1);
  });

  testWidgets('renders right-to-left in Arabic', (tester) async {
    await boot(tester, lang: 'ar');
    final context = tester.element(find.byType(NavigationBar));
    expect(Directionality.of(context), TextDirection.rtl);
  });

  testWidgets('has the link field on the home screen', (tester) async {
    await boot(tester);
    expect(find.byType(TextField), findsOneWidget);
  });
}
