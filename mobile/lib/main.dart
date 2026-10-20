import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/themes.dart';
import 'i18n/i18n.dart';
import 'native/native_api.dart';
import 'state/app_model.dart';
import 'ui/app_shell.dart';
import 'ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    systemNavigationBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  final model = AppModel(ChannelNativeApi(), await I18n.load(rootBundle));
  await model.init();
  runApp(StreamPullApp(model: model));
}

class StreamPullApp extends StatelessWidget {
  const StreamPullApp({super.key, required this.model});

  final AppModel model;

  @override
  Widget build(BuildContext context) {
    return AppScope(
      model: model,
      child: ListenableBuilder(
        listenable: model,
        builder: (context, _) => MaterialApp(
          title: 'StreamPull',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(themeById(model.settings.theme)),
          locale: Locale(model.settings.lang),
          supportedLocales: const [Locale('ar'), Locale('en')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          home: const AppShell(),
        ),
      ),
    );
  }
}
