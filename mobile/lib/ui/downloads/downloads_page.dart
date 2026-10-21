import 'package:flutter/material.dart';

import '../../state/app_model.dart';
import '../theme.dart';
import '../widgets/basics.dart';
import 'download_card.dart';

class DownloadsPage extends StatelessWidget {
  const DownloadsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    // Newest first, like the desktop app.
    final list = m.downloadList.reversed.toList();
    return SafeArea(
      bottom: false,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
          child: Row(children: [
            Expanded(child: Text(m.t('dl.title'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800))),
            if (list.any((d) => d.isFinished)) TextButton.icon(onPressed: m.clearFinished, icon: const Icon(Icons.cleaning_services_rounded, size: 18), label: Text(m.t('dl.clearFinished'))),
          ]),
        ),
        if (m.settings.wifiOnly && !m.downloadsAllowed && list.any((d) => d.status == 'queued'))
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: AppCard(
              tint: c.warn,
              child: Row(children: [
                Icon(Icons.wifi_off_rounded, color: c.warn, size: 20),
                const SizedBox(width: 10),
                Expanded(child: Text(m.t('dl.waitingWifi'), style: const TextStyle(fontSize: 13, height: 1.4))),
                TextButton(onPressed: m.allowMobileData, child: Text(m.t('dl.useMobileData'))),
              ]),
            ),
          ),
        Expanded(
          child: list.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.download_done_rounded, size: 56, color: c.brandLight.withValues(alpha: 0.6)),
                      const SizedBox(height: 12),
                      Text(m.t('dl.empty'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text(m.t('dl.emptyHint'), textAlign: TextAlign.center, style: TextStyle(color: c.textDim)),
                    ]),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => DownloadCard(item: list[i]),
                ),
        ),
      ]),
    );
  }
}
