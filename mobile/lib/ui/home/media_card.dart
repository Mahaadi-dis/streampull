// The result of analyzing a single video: thumbnail, title, quality choices and the Download button.

import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/models.dart';
import '../../state/app_model.dart';
import '../theme.dart';
import '../widgets/basics.dart';
import '../widgets/quality_picker.dart';

class MediaCard extends StatefulWidget {
  const MediaCard({super.key, required this.info});

  final MediaInfo info;

  @override
  State<MediaCard> createState() => _MediaCardState();
}

class _MediaCardState extends State<MediaCard> {
  String? _quality;
  bool _busy = false;

  /// The user's pick, else their default quality if this video offers it, else the first option.
  String _effective(AppModel m) {
    final keys = widget.info.options.map((o) => o.key).toSet();
    if (_quality != null && keys.contains(_quality)) return _quality!;
    final d = m.settings.defaultQuality;
    if (keys.contains(d)) return d;
    return widget.info.options.isEmpty ? 'best' : widget.info.options.first.key;
  }

  Future<void> _download(AppModel m) async {
    final i = widget.info;
    final q = _effective(m);
    setState(() => _busy = true);
    await m.enqueue([
      DownloadRequest(
        url: i.url,
        title: i.title,
        thumbnail: i.thumbnail,
        duration: i.duration,
        uploader: i.uploader,
        quality: q,
        expectedBytes: i.options.where((o) => o.key == q).map((o) => o.sizeBytes).firstOrNull,
      ),
    ]);
    if (!mounted) return;
    setState(() => _busy = false);
    m.toast(m.t('media.added'), 'ok');
    m.clearAnalysis();
  }

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    final i = widget.info;
    final q = _effective(m);
    final size = i.options.where((o) => o.key == q).map((o) => o.sizeBytes).firstOrNull;
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Stack(children: [
          MediaThumb(src: i.thumbnail, duration: i.duration, radius: 16),
          PositionedDirectional(
            top: 6,
            end: 6,
            child: IconButton.filled(
              style: IconButton.styleFrom(backgroundColor: Colors.black.withValues(alpha: 0.55), minimumSize: const Size(34, 34)),
              onPressed: m.clearAnalysis,
              icon: const Icon(Icons.close_rounded, size: 18),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        Text(i.title, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, height: 1.35)),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 6, children: [
          if (i.site != null) Pill(i.site!, icon: Icons.public_rounded),
          if (i.uploader != null) Pill(i.uploader!, icon: Icons.person_outline_rounded),
        ]),
        QualityPicker(options: i.options, selected: q, onSelect: (k) => setState(() => _quality = k)),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: _busy ? null : () => _download(m),
              icon: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.download_rounded),
              label: Text(m.t('media.download')),
            ),
          ),
          if (size != null) ...[
            const SizedBox(width: 14),
            Text(m.t('media.size', {'size': formatBytes(size)}), style: TextStyle(color: c.textDim, fontWeight: FontWeight.w600)),
          ],
        ]),
      ]),
    );
  }
}
