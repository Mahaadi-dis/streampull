// A playlist, YouTube channel or social account: pick the items (and for channels the content tab) to download.

import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/models.dart';
import '../../state/app_model.dart';
import '../theme.dart';
import '../widgets/basics.dart';
import '../widgets/quality_picker.dart';

class PlaylistPicker extends StatefulWidget {
  const PlaylistPicker({super.key, required this.info});

  final MediaInfo info;

  @override
  State<PlaylistPicker> createState() => _PlaylistPickerState();
}

class _PlaylistPickerState extends State<PlaylistPicker> {
  final Set<String> _selected = {};
  final TextEditingController _search = TextEditingController();
  String _quality = '';
  String? _listKey;
  bool _busy = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  /// Streams that are on air (or scheduled) can't be downloaded as files yet.
  bool _downloadable(PlaylistEntry e) => e.liveStatus == null;

  /// A new list (another tab or playlist) starts with everything downloadable selected.
  void _resetFor(MediaInfo info) {
    final key = '${info.url}|${info.entries.length}|${info.channel?.activeTab}';
    if (key == _listKey) return;
    _listKey = key;
    _selected
      ..clear()
      ..addAll(info.entries.where(_downloadable).map((e) => e.id));
  }

  Future<void> _download(AppModel m, List<PlaylistEntry> entries) async {
    final picked = entries.where((e) => _selected.contains(e.id) && _downloadable(e)).toList();
    if (picked.isEmpty) return;
    setState(() => _busy = true);
    await m.enqueue([
      for (final e in picked)
        DownloadRequest(
          url: e.url,
          title: e.title,
          thumbnail: e.thumbnail,
          duration: e.duration,
          uploader: widget.info.uploader,
          quality: _quality.isEmpty ? m.settings.defaultQuality : _quality,
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
    final info = widget.info;
    _resetFor(info);
    final q = _quality.isEmpty ? m.settings.defaultQuality : _quality;
    final needle = _search.text.trim().toLowerCase();
    final shown = needle.isEmpty ? info.entries : info.entries.where((e) => e.title.toLowerCase().contains(needle)).toList();
    final ch = info.channel;
    final loading = m.loadingTab != null;
    final selectedCount = info.entries.where((e) => _selected.contains(e.id) && _downloadable(e)).length;

    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          if (info.thumbnail != null)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 12),
              child: ClipOval(child: SizedBox(width: 44, height: 44, child: Image.network(info.thumbnail!, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox.shrink()))),
            ),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(info.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              Text(
                ch?.kind == 'account' ? m.t('media.account') : (ch != null ? m.t('media.channel') : m.t('media.playlist')),
                style: TextStyle(color: c.textDim, fontSize: 12.5),
              ),
            ]),
          ),
          IconButton(onPressed: m.clearAnalysis, icon: const Icon(Icons.close_rounded)),
        ]),
        if (ch != null && ch.tabs.length > 1) ...[
          const SizedBox(height: 10),
          Wrap(spacing: 8, children: [
            for (final t in ch.tabs)
              ChoiceChip(
                label: Text(m.t('tab.${t.id}')),
                selected: ch.activeTab == t.id,
                onSelected: loading || ch.activeTab == t.id
                    ? null
                    : (_) async {
                        final err = await m.loadChannelTab(t);
                        if (err != null && context.mounted) m.toast(m.t('err.${err.wire}'), 'error');
                      },
              ),
          ]),
        ],
        if (loading) ...[
          const SizedBox(height: 12),
          Row(children: [
            SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: c.brandLight)),
            const SizedBox(width: 10),
            Text(m.t('media.tabLoading'), style: TextStyle(color: c.textDim)),
          ]),
        ],
        if (ch?.truncated == true)
          Padding(padding: const EdgeInsets.only(top: 8), child: Text(m.t('media.truncated', {'n': info.entries.length}), style: TextStyle(color: c.warn, fontSize: 12.5))),
        const SizedBox(height: 12),
        TextField(
          controller: _search,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(hintText: m.t('media.search'), prefixIcon: const Icon(Icons.search_rounded), isDense: true),
        ),
        const SizedBox(height: 8),
        Row(children: [
          Text(m.t('media.selected', {'n': selectedCount}), style: TextStyle(color: c.textDim, fontWeight: FontWeight.w600)),
          const Spacer(),
          TextButton(
            onPressed: () => setState(() => _selected
              ..clear()
              ..addAll(info.entries.where(_downloadable).map((e) => e.id))),
            child: Text(m.t('media.selectAll')),
          ),
          TextButton(onPressed: () => setState(_selected.clear), child: Text(m.t('media.selectNone'))),
        ]),
        if (shown.isEmpty && !loading)
          Padding(padding: const EdgeInsets.all(24), child: Center(child: Text(m.t('media.tabEmpty'), style: TextStyle(color: c.textDim)))),
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 420),
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: shown.length,
            itemBuilder: (_, i) {
              final e = shown[i];
              final ok = _downloadable(e);
              return CheckboxListTile(
                value: ok && _selected.contains(e.id),
                onChanged: ok ? (v) => setState(() => v == true ? _selected.add(e.id) : _selected.remove(e.id)) : null,
                dense: true,
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                secondary: SizedBox(width: 84, child: MediaThumb(src: e.thumbnail, duration: e.duration, radius: 8)),
                title: Text(e.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                subtitle: e.liveStatus != null
                    ? Text(e.liveStatus == 'live' ? m.t('media.live') : m.t('media.upcoming'), style: TextStyle(color: c.warn, fontSize: 12))
                    : (e.duration != null ? Text(formatDuration(e.duration), style: TextStyle(color: c.textDim, fontSize: 12)) : null),
              );
            },
          ),
        ),
        const Divider(height: 24),
        QualityPicker(options: defaultQualities, selected: q, onSelect: (k) => setState(() => _quality = k)),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: selectedCount == 0 || _busy || loading ? null : () => _download(m, info.entries),
            icon: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.download_rounded),
            label: Text(m.t('media.downloadSelected', {'n': selectedCount})),
          ),
        ),
      ]),
    );
  }
}
