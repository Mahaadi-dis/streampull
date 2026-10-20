// Choose a quality: video resolutions and audio-only formats, each with its estimated size.

import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/models.dart';
import '../../state/app_model.dart';
import '../theme.dart';

class QualityPicker extends StatelessWidget {
  const QualityPicker({super.key, required this.options, required this.selected, required this.onSelect});

  final List<QualityOption> options;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    final video = options.where((o) => o.kind == 'video').toList();
    final audio = options.where((o) => o.kind == 'audio').toList();

    Widget group(IconData icon, String title, List<QualityOption> list) {
      if (list.isEmpty) return const SizedBox.shrink();
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.only(top: 10, bottom: 8),
          child: Row(children: [
            Icon(icon, size: 16, color: c.brandLight),
            const SizedBox(width: 6),
            Text(title, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: c.brandLight)),
          ]),
        ),
        Wrap(spacing: 8, runSpacing: 8, children: [for (final o in list) _chip(context, m, o)]),
      ]);
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      group(Icons.movie_outlined, m.t('media.video'), video),
      group(Icons.music_note_rounded, m.t('media.audio'), audio),
    ]);
  }

  Widget _chip(BuildContext context, AppModel m, QualityOption o) {
    final c = context.colors;
    final on = o.key == selected;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => onSelect(o.key),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: on ? c.brand.withValues(alpha: 0.3) : c.surface2.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: on ? c.brandLight : c.line, width: on ? 1.4 : 1),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(qualityLabel(o.key, m.t('media.best')), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          if (o.sizeBytes != null) Text(formatBytes(o.sizeBytes), style: TextStyle(fontSize: 11, color: c.textDim)),
        ]),
      ),
    );
  }
}
