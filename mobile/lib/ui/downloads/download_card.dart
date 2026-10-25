// One download in the queue: progress, status and the actions that fit its state.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/format.dart';
import '../../core/models.dart';
import '../../state/app_model.dart';
import '../theme.dart';
import '../widgets/basics.dart';

class DownloadCard extends StatelessWidget {
  const DownloadCard({super.key, required this.item});

  final DownloadItem item;

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    final s = item.status;
    final live = s == 'downloading' || s == 'processing';

    final (Color color, IconData icon) = switch (s) {
      'completed' => (c.ok, Icons.check_circle_rounded),
      'error' => (c.bad, Icons.error_rounded),
      'canceled' => (c.textDim, Icons.cancel_rounded),
      'paused' || 'queued' => (c.warn, Icons.schedule_rounded),
      _ => (c.brandLight, Icons.downloading_rounded),
    };

    Widget action(IconData i, String tip, VoidCallback onTap, {Color? tone}) =>
        IconButton(tooltip: tip, visualDensity: VisualDensity.compact, onPressed: onTap, icon: Icon(i, size: 21, color: tone));

    return AppCard(
      padding: const EdgeInsets.all(12),
      child: Column(children: [
        Row(children: [
          SizedBox(
            width: 104,
            child: Stack(alignment: Alignment.center, children: [
              MediaThumb(src: item.thumbnail, audio: item.isAudio, duration: live ? null : item.duration, radius: 12),
              if (live) Container(decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.45), shape: BoxShape.circle), padding: const EdgeInsets.all(4), child: ProgressRing(percent: item.percent, size: 40, busy: s == 'processing')),
            ]),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.3)),
              const SizedBox(height: 4),
              Row(children: [
                Icon(icon, size: 15, color: color),
                const SizedBox(width: 5),
                Flexible(child: Text(m.t('dl.status.$s'), style: TextStyle(color: color, fontSize: 12.5, fontWeight: FontWeight.w700))),
                const SizedBox(width: 8),
                Pill(qualityLabel(item.quality, m.t('media.best'))),
              ]),
              if (s == 'downloading')
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    [
                      if (item.totalBytes != null) '${formatBytes(item.downloadedBytes)} / ${formatBytes(item.totalBytes)}',
                      formatSpeed(item.speed),
                      if (item.eta != null) m.t('dl.left', {'t': formatDuration(item.eta)}),
                    ].where((x) => x != '—').join('  ·  '),
                    textDirection: TextDirection.ltr,
                    style: TextStyle(fontSize: 11.5, color: c.textDim),
                  ),
                ),
              if (s == 'error')
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(m.t('err.${(item.error ?? ErrorCode.unknown).wire}'), maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: c.bad)),
                ),
            ]),
          ),
        ]),
        if (live || s == 'paused' || s == 'queued')
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: s == 'processing' ? null : (item.percent / 100).clamp(0, 1),
                minHeight: 6,
                color: c.brandLight,
                backgroundColor: Colors.white.withValues(alpha: 0.1),
              ),
            ),
          ),
        Row(mainAxisAlignment: MainAxisAlignment.end, children: [
          if (s == 'downloading' || s == 'queued') action(Icons.pause_rounded, m.t('dl.pause'), () => m.pause(item.id)),
          if (s == 'paused') action(Icons.play_arrow_rounded, m.t('dl.resume'), () => m.resume(item.id)),
          if (s == 'error' || s == 'canceled') action(Icons.refresh_rounded, m.t('dl.retry'), () => m.retry(item.id)),
          if (s == 'completed') ...[
            action(Icons.play_circle_outline_rounded, m.t('dl.open'), () async {
              if (!await m.openFile(item.id) && context.mounted) m.toast(m.t('lib.missing'), 'error');
            }),
            action(Icons.folder_open_rounded, m.t('dl.folder'), m.showInFolder),
          ],
          action(Icons.link_rounded, m.t('dl.copyLink'), () async {
            await Clipboard.setData(ClipboardData(text: item.referer ?? item.url));
            m.toast(m.t('toast.linkCopied'), 'ok');
          }),
          if (live || s == 'queued' || s == 'paused') action(Icons.close_rounded, m.t('dl.cancel'), () => m.cancel(item.id), tone: c.bad),
          if (item.isFinished) action(Icons.delete_outline_rounded, m.t('dl.remove'), () => m.removeFromQueue(item.id), tone: c.bad),
        ]),
      ]),
    );
  }
}
