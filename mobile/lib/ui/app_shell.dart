// The frame around the four screens: bottom navigation, update notice and toasts.

import 'package:flutter/material.dart';

import '../state/app_model.dart';
import 'downloads/downloads_page.dart';
import 'home/home_page.dart';
import 'library/library_page.dart';
import 'settings/settings_page.dart';
import 'widgets/banners.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final active = m.activeDownloads.length;

    const pages = <Widget>[HomePage(), DownloadsPage(), LibraryPage(), SettingsPage()];

    return Scaffold(
      body: Stack(children: [
        Column(children: [
          SafeArea(bottom: false, child: const UpdateCard()),
          Expanded(child: IndexedStack(index: m.tab, children: pages)),
        ]),
        const ToastLayer(),
      ]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: m.tab,
        onDestinationSelected: m.setTab,
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home_rounded), label: m.t('nav.home')),
          NavigationDestination(
            icon: Badge(isLabelVisible: active > 0, label: Text('$active'), child: const Icon(Icons.download_outlined)),
            selectedIcon: Badge(isLabelVisible: active > 0, label: Text('$active'), child: const Icon(Icons.download_rounded)),
            label: m.t('nav.downloads'),
          ),
          NavigationDestination(icon: const Icon(Icons.video_library_outlined), selectedIcon: const Icon(Icons.video_library_rounded), label: m.t('nav.library')),
          NavigationDestination(icon: const Icon(Icons.settings_outlined), selectedIcon: const Icon(Icons.settings_rounded), label: m.t('nav.settings')),
        ],
      ),
    );
  }
}
