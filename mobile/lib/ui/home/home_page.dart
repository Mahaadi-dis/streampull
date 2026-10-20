// Home: paste a link, analyze it, choose what to download; plus what is downloading now and the latest downloads.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/models.dart';
import '../../state/app_model.dart';
import '../downloads/download_card.dart';
import '../theme.dart';
import '../widgets/banners.dart';
import '../widgets/basics.dart';
import 'media_card.dart';
import 'playlist_picker.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController _url = TextEditingController();
  int _seenLinkSeq = 0;

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  Future<void> _paste() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final text = data?.text?.trim();
    if (text != null && text.isNotEmpty) setState(() => _url.text = text);
  }

  void _analyze(AppModel m) {
    FocusScope.of(context).unfocus();
    if (_url.text.trim().isNotEmpty) m.analyze(_url.text);
  }

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;

    // A link shared from another app fills the box (it is analyzed by the model).
    if (m.sharedLinkSeq != _seenLinkSeq) {
      _seenLinkSeq = m.sharedLinkSeq;
      if (m.sharedLink != null) _url.text = m.sharedLink!;
    }

    final loading = m.analysis.status == AnalysisStatus.loading;
    final active = m.activeDownloads;
    final recent = m.history.take(4).toList();

    return SafeArea(
      bottom: false,
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 24), children: [
        Center(child: Pill(m.t('home.hint'), icon: Icons.auto_awesome_rounded, color: c.brandLight)),
        const SizedBox(height: 18),
        GradientText(m.t('home.title'), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, height: 1.25)),
        const SizedBox(height: 8),
        Text(m.t('home.subtitle'), textAlign: TextAlign.center, style: TextStyle(color: c.textDim, fontSize: 14.5, height: 1.5)),
        const SizedBox(height: 18),
        const EngineBanner(),
        AppCard(
          padding: const EdgeInsets.all(10),
          child: Column(children: [
            TextField(
              controller: _url,
              keyboardType: TextInputType.url,
              textInputAction: TextInputAction.go,
              textDirection: TextDirection.ltr,
              onSubmitted: (_) => _analyze(m),
              decoration: InputDecoration(
                hintText: m.t('home.placeholder'),
                prefixIcon: Icon(Icons.link_rounded, color: c.brandLight),
                suffixIcon: IconButton(tooltip: m.t('home.paste'), onPressed: _paste, icon: const Icon(Icons.content_paste_rounded)),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
              ),
            ),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: loading ? null : () => _analyze(m),
                icon: loading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.search_rounded),
                label: Text(loading ? m.t('home.analyzing') : m.t('home.analyze')),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 16),
        _Analysis(m: m),
        if (active.isNotEmpty) ...[
          _SectionTitle(m.t('home.active'), action: m.t('home.viewAll'), onAction: () => m.setTab(1)),
          for (final d in active.take(3)) Padding(padding: const EdgeInsets.only(bottom: 10), child: DownloadCard(item: d)),
        ],
        _SectionTitle(m.t('home.recent'), action: recent.isEmpty ? null : m.t('home.viewAll'), onAction: () => m.setTab(2)),
        if (recent.isEmpty)
          AppCard(child: Center(child: Padding(padding: const EdgeInsets.all(14), child: Text(m.t('home.recentEmpty'), textAlign: TextAlign.center, style: TextStyle(color: c.textDim)))))
        else
          for (final h in recent) Padding(padding: const EdgeInsets.only(bottom: 10), child: _RecentTile(item: h)),
      ]),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text, {this.action, this.onAction});

  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 14, bottom: 10),
        child: Row(children: [
          Expanded(child: Text(text, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800))),
          if (action != null) TextButton(onPressed: onAction, child: Text(action!)),
        ]),
      );
}

class _Analysis extends StatelessWidget {
  const _Analysis({required this.m});

  final AppModel m;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final a = m.analysis;
    switch (a.status) {
      case AnalysisStatus.idle:
        return const SizedBox.shrink();
      case AnalysisStatus.loading:
        return AppCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
            Skeleton(height: 170, radius: 16),
            SizedBox(height: 14),
            Skeleton(height: 18),
            SizedBox(height: 10),
            Skeleton(height: 18, width: 180),
          ]),
        );
      case AnalysisStatus.error:
        return AppCard(
          tint: c.bad,
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.error_outline_rounded, color: c.bad),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(m.t('err.${a.error!.wire}'), style: const TextStyle(fontWeight: FontWeight.w700, height: 1.4)),
                if (a.detail != null && (a.error == ErrorCode.unknown || a.error == ErrorCode.network))
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text(a.detail!, textDirection: TextDirection.ltr, style: TextStyle(fontSize: 11.5, color: c.textDim))),
              ]),
            ),
            IconButton(onPressed: m.clearAnalysis, icon: const Icon(Icons.close_rounded)),
          ]),
        );
      case AnalysisStatus.done:
        final info = a.info!;
        return info.isPlaylist ? PlaylistPicker(info: info) : MediaCard(info: info);
    }
  }
}

/// A finished download in the "recent" list: tap to open the file.
class _RecentTile extends StatelessWidget {
  const _RecentTile({required this.item});

  final HistoryItem item;

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    return AppCard(
      padding: const EdgeInsets.all(10),
      child: Row(children: [
        SizedBox(width: 92, child: MediaThumb(src: item.thumbnail, audio: item.kind == 'audio', duration: item.duration, radius: 10)),
        const SizedBox(width: 12),
        Expanded(child: Text(item.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
        IconButton(
          tooltip: m.t('lib.open'),
          onPressed: () async {
            if (!await m.api.openFile(item.id) && context.mounted) m.toast(m.t('lib.missing'), 'error');
          },
          icon: Icon(Icons.play_circle_fill_rounded, color: c.brandLight, size: 30),
        ),
      ]),
    );
  }
}
