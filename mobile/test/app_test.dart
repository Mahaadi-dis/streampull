import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:streampull/core/models.dart';
import 'package:streampull/i18n/i18n.dart';
import 'package:streampull/main.dart';
import 'package:streampull/native/native_api.dart';
import 'package:streampull/state/app_model.dart';

/// An in-memory stand-in for the Kotlin side, so the screens can be driven without a device.
class FakeNativeApi implements NativeApi {
  final events_ = StreamController<NativeEvent>.broadcast();
  Settings settings = const Settings();

  @override
  Stream<NativeEvent> get events => events_.stream;
  @override
  Future<BinaryState> binaryState() async => const BinaryState('ready', version: '2026.01.01');
  @override
  Future<BinaryState> updateEngine() async => const BinaryState('ready', version: '2026.01.01');
  @override
  Future<String> appVersion() async => '0.4.0';
  @override
  Future<Settings> getSettings() async => settings;
  @override
  Future<Settings> setSettings(Map<String, dynamic> patch) async => settings;
  @override
  Future<RawResult> runJson(String url, {required int timeoutMs, int? playlistEnd}) async => const RawResult.fail(ErrorCode.network);
  @override
  Future<List<DownloadItem>> queueList() async => [];
  @override
  Future<List<DownloadItem>> queueAdd(List<Map<String, dynamic>> reqs) async => [];
  @override
  Future<void> queuePause(String id) async {}
  @override
  Future<void> queueResume(String id) async {}
  @override
  Future<void> queueCancel(String id) async {}
  @override
  Future<void> queueRetry(String id) async {}
  @override
  Future<void> queueRemove(String id) async {}
  @override
  Future<void> queueClearFinished() async {}
  @override
  Future<List<HistoryItem>> historyList() async => [];
  @override
  Future<void> historyRemove(String id, {required bool deleteFile}) async {}
  @override
  Future<void> historyClear() async {}
  @override
  Future<bool> openFile(String id) async => true;
  @override
  Future<void> showInFolder() async {}
  @override
  Future<void> openExternal(String url) async {}
  @override
  Future<String?> takePendingLink() async => null;
}

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
