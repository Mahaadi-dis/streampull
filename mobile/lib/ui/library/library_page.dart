// Library: everything that was downloaded, searchable and filterable by video / audio.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/format.dart';
import '../../core/models.dart';
import '../../state/app_model.dart';
import '../theme.dart';
import '../widgets/basics.dart';

class LibraryPage extends StatefulWidget {
  const LibraryPage({super.key});

  @override
  State<LibraryPage> createState() => _LibraryPageState();
}

class _LibraryPageState extends State<LibraryPage> {
  final TextEditingController _q = TextEditingController();
  String _filter = 'all';
  bool _confirmClear = false;

  @override
  void initState() {
    super.initState();
    // The files may have been removed outside the app since the last look.
    WidgetsBinding.instance.addPostFrameCallback((_) => AppScope.of(context).refreshHistory());
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    final needle = _q.text.trim().toLowerCase();
    final shown = m.history.where((h) => (_filter == 'all' || h.kind == _filter) && (needle.isEmpty || h.title.toLowerCase().contains(needle))).toList();

    return SafeArea(
      bottom: false,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(m.t('lib.title'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                Text(m.t('lib.count', {'n': m.history.length}), style: TextStyle(color: c.textDim)),
              ]),
            ),
            if (m.history.isNotEmpty)
              TextButton.icon(
                style: _confirmClear ? TextButton.styleFrom(foregroundColor: c.bad) : null,
                onPressed: () async {
                  if (!_confirmClear) {
                    setState(() => _confirmClear = true);
                    return;
                  }
                  setState(() => _confirmClear = false);
                  await m.clearHistory();
                },
                icon: const Icon(Icons.delete_sweep_rounded, size: 18),
                label: Text(_confirmClear ? m.t('lib.confirmClear') : m.t('lib.clear')),
              ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: TextField(
            controller: _q,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(hintText: m.t('lib.search'), prefixIcon: const Icon(Icons.search_rounded), isDense: true),
          ),
        ),
        SizedBox(
          height: 48,
          child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6), children: [
            for (final f in const ['all', 'video', 'audio'])
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 8),
                child: ChoiceChip(label: Text(m.t('lib.$f')), selected: _filter == f, onSelected: (_) => setState(() => _filter = f)),
              ),
          ]),
        ),
        Expanded(
          child: shown.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.video_library_outlined, size: 54, color: c.brandLight.withValues(alpha: 0.6)),
                      const SizedBox(height: 12),
                      Text(m.history.isEmpty ? m.t('lib.empty') : m.t('lib.noResults'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                      if (m.history.isEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text(m.t('lib.emptyHint'), textAlign: TextAlign.center, style: TextStyle(color: c.textDim))),
                    ]),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: shown.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _LibraryCard(item: shown[i]),
                ),
        ),
      ]),
    );
  }
}

class _LibraryCard extends StatelessWidget {
  const _LibraryCard({required this.item});

  final HistoryItem item;

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    final h = item;

    Widget action(IconData i, String tip, VoidCallback onTap, {Color? tone}) =>
        IconButton(tooltip: tip, visualDensity: VisualDensity.compact, onPressed: onTap, icon: Icon(i, size: 21, color: tone));

    return AppCard(
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          SizedBox(
            width: 120,
            child: GestureDetector(
              onTap: () async {
                if (!await m.api.openFile(h.id) && context.mounted) m.toast(m.t('lib.missing'), 'error');
              },
              child: Stack(alignment: Alignment.center, children: [
                MediaThumb(src: h.thumbnail, audio: h.kind == 'audio', duration: h.duration, radius: 12),
                Container(
                  decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.45), shape: BoxShape.circle),
                  padding: const EdgeInsets.all(6),
                  child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 22),
                ),
              ]),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(h.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.3)),
              const SizedBox(height: 6),
              Wrap(spacing: 6, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                Pill(qualityLabel(h.quality, m.t('media.best'))),
                Text(formatBytes(h.sizeBytes), textDirection: TextDirection.ltr, style: TextStyle(fontSize: 12, color: c.textDim)),
                Text(timeAgo(h.completedAt, m.settings.lang), style: TextStyle(fontSize: 12, color: c.textDim)),
              ]),
              if (!h.fileExists)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(children: [Icon(Icons.warning_amber_rounded, size: 15, color: c.warn), const SizedBox(width: 4), Text(m.t('lib.missing'), style: TextStyle(color: c.warn, fontSize: 12))]),
                ),
            ]),
          ),
        ]),
        const SizedBox(height: 4),
        Row(children: [
          action(Icons.refresh_rounded, m.t('lib.redownload'), () async {
            await m.enqueue([DownloadRequest(url: h.url, title: h.title, thumbnail: h.thumbnail, duration: h.duration, uploader: h.uploader, quality: h.quality)]);
            m.toast(m.t('media.added'), 'ok');
          }),
          action(Icons.link_rounded, m.t('dl.copyLink'), () async {
            await Clipboard.setData(ClipboardData(text: h.url));
            m.toast(m.t('toast.linkCopied'), 'ok');
          }),
          action(Icons.folder_open_rounded, m.t('lib.folder'), m.showInFolder),
          action(Icons.delete_outline_rounded, m.t('lib.remove'), () => m.removeHistory(h.id, deleteFile: false), tone: c.bad),
          // Takes what is left of the row, so a long label shrinks instead of overflowing on narrow phones.
          Expanded(
            child: h.fileExists
                ? Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: TextButton(
                      style: TextButton.styleFrom(foregroundColor: c.textDim, textStyle: const TextStyle(fontFamily: fontFamily, fontSize: 12, fontWeight: FontWeight.w600)),
                      onPressed: () => m.removeHistory(h.id, deleteFile: true),
                      child: Text(m.t('lib.removeFile'), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ]),
      ]),
    );
  }
}
