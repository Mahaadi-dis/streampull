import 'package:flutter/material.dart';

import '../../core/models.dart';
import '../../core/themes.dart';
import '../../core/updates.dart';
import '../../state/app_model.dart';
import '../theme.dart';
import '../widgets/basics.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    final s = m.settings;
    const qualities = ['best', '2160', '1440', '1080', '720', '480', '360', 'mp3', 'm4a'];
    const speeds = ['', '500K', '1M', '2M', '5M', '10M'];

    return SafeArea(
      bottom: false,
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 32), children: [
        Text(m.t('set.title'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 14),

        _Section(m.t('set.appearance'), [
          Text(m.t('set.theme'), style: const TextStyle(fontWeight: FontWeight.w700)),
          Text(m.t('set.themeHint'), style: TextStyle(color: c.textDim, fontSize: 12.5)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.35,
            children: [for (final t in appThemes) _ThemeTile(def: t, selected: s.theme == t.id, label: m.t('theme.${t.id}'), onTap: () => m.updateSettings({'theme': t.id}))],
          ),
        ]),

        _Section(m.t('set.general'), [
          _Row(
            m.t('set.language'),
            trailing: SegmentedButton<String>(
              showSelectedIcon: false,
              segments: const [ButtonSegment(value: 'ar', label: Text('العربية')), ButtonSegment(value: 'en', label: Text('English'))],
              selected: {s.lang},
              onSelectionChanged: (v) => m.updateSettings({'lang': v.first}),
            ),
          ),
          _Row(m.t('set.folder'), hint: 'Downloads/StreamPull', trailing: OutlinedButton.icon(onPressed: m.showInFolder, icon: const Icon(Icons.folder_open_rounded, size: 18), label: Text(m.t('set.openFolder')))),
          _Row(m.t('set.notifications'), trailing: Switch(value: s.notifications, onChanged: (v) => m.updateSettings({'notifications': v}))),
          _Row(m.t('set.checkUpdates'), hint: m.t('set.checkUpdatesHint'), trailing: Switch(value: s.checkUpdates, onChanged: (v) => m.updateSettings({'checkUpdates': v}))),
        ]),

        _Section(m.t('set.downloads'), [
          _Row(m.t('set.concurrency'), trailing: Text('${s.concurrency}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
          Slider(value: s.concurrency.toDouble(), min: 1, max: 8, divisions: 7, onChanged: (v) => m.updateSettings({'concurrency': v.round()})),
          _Row(
            m.t('set.defaultQuality'),
            trailing: DropdownButton<String>(
              value: qualities.contains(s.defaultQuality) ? s.defaultQuality : 'best',
              underline: const SizedBox.shrink(),
              items: [for (final q in qualities) DropdownMenuItem(value: q, child: Text(q == 'best' ? m.t('media.best') : (q == 'mp3' || q == 'm4a' ? q.toUpperCase() : '${q}p')))],
              onChanged: (v) => v == null ? null : m.updateSettings({'defaultQuality': v}),
            ),
          ),
          _Row(
            m.t('set.nameTemplate'),
            trailing: DropdownButton<NameTemplate>(
              value: s.nameTemplate,
              underline: const SizedBox.shrink(),
              items: [for (final n in NameTemplate.values) DropdownMenuItem(value: n, child: Text(m.t('set.name.${n.wire}')))],
              onChanged: (v) => v == null ? null : m.updateSettings({'nameTemplate': v.wire}),
            ),
          ),
          const SizedBox(height: 4),
          Text(m.t('set.speedLimit'), style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final v in speeds)
              ChoiceChip(label: Text(v.isEmpty ? m.t('set.unlimited') : '$v/s'), selected: s.speedLimit == v, onSelected: (_) => m.updateSettings({'speedLimit': v})),
          ]),
        ]),

        _Section(m.t('set.engine'), [
          _Row(
            m.t('set.engineVersion'),
            hint: m.t('set.engineHint'),
            trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
              Pill(m.binary.isReady ? (m.binary.version ?? '—') : '—'),
              const SizedBox(height: 6),
              OutlinedButton.icon(
                onPressed: m.binary.phase == 'checking' ? null : m.updateEngine,
                icon: m.binary.phase == 'checking' ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.refresh_rounded, size: 18),
                label: Text(m.binary.phase == 'checking' ? m.t('set.updating') : m.t('set.update')),
              ),
            ]),
          ),
          if (m.binary.phase == 'error' && m.binary.message != null) Text(m.binary.message!, textDirection: TextDirection.ltr, style: TextStyle(color: c.bad, fontSize: 12)),
        ]),

        const _AboutSection(),

        AppCard(
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.info_outline_rounded, color: c.brandLight, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(m.t('set.about'), style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(m.t('set.disclaimer'), style: TextStyle(color: c.textDim, fontSize: 12.5, height: 1.5)),
              ]),
            ),
          ]),
        ),
      ]),
    );
  }
}

/// Version, "check for updates", developer and source links.
class _AboutSection extends StatefulWidget {
  const _AboutSection();

  @override
  State<_AboutSection> createState() => _AboutSectionState();
}

class _AboutSectionState extends State<_AboutSection> {
  bool _checking = false;
  UpdateCheck? _result;

  Future<void> _run(AppModel m) async {
    setState(() => _checking = true);
    final r = await m.checkUpdateNow();
    if (!mounted) return;
    setState(() {
      _checking = false;
      _result = r;
    });
  }

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final result = _result;
    final message = switch (result) {
      null => null,
      UpdateLatest() => m.t('about.latest'),
      UpdateNewer(:final info) => m.t('about.newer', {'version': info.version}),
      UpdateError() => m.t('about.error'),
    };

    return _Section(m.t('about.title'), [
      _Row(
        m.t('about.version'),
        hint: message,
        trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
          Pill(m.appVersion.isEmpty ? '—' : 'v${m.appVersion}'),
          const SizedBox(height: 6),
          OutlinedButton.icon(
            onPressed: _checking ? null : () => _run(m),
            icon: _checking ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.refresh_rounded, size: 18),
            label: Text(_checking ? m.t('about.checking') : m.t('about.check')),
          ),
          if (result is UpdateNewer)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: FilledButton.icon(
                onPressed: () => m.api.openExternal(result.info.url),
                icon: const Icon(Icons.download_rounded, size: 18),
                label: Text(m.t('about.get')),
              ),
            ),
        ]),
      ),
      _Row(
        m.t('about.source'),
        trailing: OutlinedButton.icon(
          onPressed: () => m.api.openExternal(repoUrl),
          icon: const Icon(Icons.open_in_new_rounded, size: 16),
          label: const Text(repo, textDirection: TextDirection.ltr),
        ),
      ),
      _Row(m.t('about.license'), trailing: const Pill('GPL-3.0')),
    ]);
  }
}

class _Section extends StatelessWidget {
  const _Section(this.title, this.children);

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.fromLTRB(6, 0, 6, 8), child: Text(title, style: TextStyle(color: c.brandLight, fontWeight: FontWeight.w800, fontSize: 14))),
        AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children)),
      ]),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, {this.hint, required this.trailing});

  final String label;
  final String? hint;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
            if (hint != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(hint!, style: TextStyle(color: c.textDim, fontSize: 12, height: 1.4))),
          ]),
        ),
        const SizedBox(width: 10),
        trailing,
      ]),
    );
  }
}

class _ThemeTile extends StatelessWidget {
  const _ThemeTile({required this.def, required this.selected, required this.label, required this.onTap});

  final AppThemeDef def;
  final bool selected;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: rgb(def.bg),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: selected ? rgb(def.brandLight) : rgb(def.brandLight, 0.2), width: selected ? 2 : 1),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(color: rgb(def.surface), borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.all(6),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(height: 6, width: 38, decoration: BoxDecoration(gradient: LinearGradient(colors: [rgb(def.brandDeep), rgb(def.accent2)]), borderRadius: BorderRadius.circular(3))),
                const Spacer(),
                Container(height: 12, decoration: BoxDecoration(color: rgb(def.surface3), borderRadius: BorderRadius.circular(5))),
              ]),
            ),
          ),
          const SizedBox(height: 6),
          Row(children: [
            Container(width: 9, height: 9, decoration: BoxDecoration(color: rgb(def.brand), shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Expanded(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: rgb(def.t50)))),
            if (selected) Icon(Icons.check_circle_rounded, size: 14, color: rgb(def.brandLight)),
          ]),
        ]),
      ),
    );
  }
}
