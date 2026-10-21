// The result of analyzing a single video: thumbnail, title, quality choices and the Download button.

import 'package:flutter/material.dart';

import '../../core/download_options.dart';
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

  // Optional: only a part of the video. Blank "from" = the start, blank "to" = the end (when the length is known).
  bool _clipOpen = false;
  final _from = TextEditingController();
  final _to = TextEditingController();

  @override
  void dispose() {
    _from.dispose();
    _to.dispose();
    super.dispose();
  }

  double? get _startSec => _from.text.trim().isEmpty ? 0 : parseClipTime(_from.text);
  double? get _endSec => _to.text.trim().isEmpty ? widget.info.duration : parseClipTime(_to.text);

  ClipRange? get _clip => _clipOpen ? validateClip(_startSec, _endSec, widget.info.duration) : null;
  bool get _clipBad => _clipOpen && _clip == null;

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
    if (_clipBad) return;
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
        clip: _clip,
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
    final fullSize = i.options.where((o) => o.key == q).map((o) => o.sizeBytes).firstOrNull;
    final clip = _clip;
    final size = fullSize != null && clip != null && i.duration != null && i.duration! > 0 ? (fullSize * (clip.end - clip.start) / i.duration!).round() : fullSize;
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
        if (m.settings.clipEnabled) ...[
          const SizedBox(height: 4),
          TextButton.icon(
            onPressed: () => setState(() => _clipOpen = !_clipOpen),
            style: TextButton.styleFrom(foregroundColor: _clipOpen ? c.brandLight : c.textDim, padding: EdgeInsets.zero, alignment: AlignmentDirectional.centerStart),
            icon: const Icon(Icons.content_cut_rounded, size: 18),
            label: Text(m.t('media.clip')),
          ),
          if (_clipOpen)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(children: [
                Expanded(child: _TimeField(controller: _from, label: m.t('media.clipFrom'), hint: '0:00', invalid: _startSec == null, onChanged: () => setState(() {}))),
                const SizedBox(width: 12),
                Expanded(child: _TimeField(controller: _to, label: m.t('media.clipTo'), hint: i.duration != null ? formatClipTime(i.duration!) : '1:30', invalid: _endSec == null, onChanged: () => setState(() {}))),
              ]),
            ),
          if (_clipBad) Padding(padding: const EdgeInsets.only(top: 6), child: Text(m.t('media.clipInvalid'), style: TextStyle(color: c.bad, fontSize: 12))),
        ],
        const SizedBox(height: 16),
        Row(children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: _busy || _clipBad ? null : () => _download(m),
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

class _TimeField extends StatelessWidget {
  const _TimeField({required this.controller, required this.label, required this.hint, required this.invalid, required this.onChanged});

  final TextEditingController controller;
  final String label;
  final String hint;
  final bool invalid;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        keyboardType: TextInputType.datetime,
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.center,
        onChanged: (_) => onChanged(),
        decoration: InputDecoration(labelText: label, hintText: hint, isDense: true, errorText: invalid ? '' : null, errorStyle: const TextStyle(height: 0)),
      );
}
