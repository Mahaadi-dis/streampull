// Notices that float above the content: engine set-up, "update available" and toasts.

import 'package:flutter/material.dart';

import '../../state/app_model.dart';
import '../theme.dart';
import 'basics.dart';

/// Shown while the bundled yt-dlp is starting, and when it could not start.
class EngineBanner extends StatelessWidget {
  const EngineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    final b = m.binary;
    if (b.isReady) return const SizedBox.shrink();
    final error = b.phase == 'error';
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: AppCard(
        tint: error ? c.bad : c.brandLight,
        child: Row(children: [
          if (error) Icon(Icons.error_outline_rounded, color: c.bad) else SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: c.brandLight)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(error ? m.t('bin.error') : m.t('bin.checking'), style: const TextStyle(fontWeight: FontWeight.w700)),
              if (error && b.message != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(b.message!, textDirection: TextDirection.ltr, style: TextStyle(fontSize: 11.5, color: c.textDim)),
                ),
            ]),
          ),
          if (error) TextButton(onPressed: m.updateEngine, child: Text(m.t('bin.retry'))),
        ]),
      ),
    );
  }
}

/// "StreamPull x.y.z is available" with a button to the release page.
class UpdateCard extends StatelessWidget {
  const UpdateCard({super.key});

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final u = m.update;
    if (u == null) return const SizedBox.shrink();
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: AppCard(
        tint: c.brandLight,
        padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
        child: Row(children: [
          Icon(Icons.system_update_alt_rounded, color: c.brandLight),
          const SizedBox(width: 12),
          Expanded(child: Text(m.t('update.available', {'version': u.version}), style: const TextStyle(fontWeight: FontWeight.w700))),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(0, 36), padding: const EdgeInsets.symmetric(horizontal: 14)),
            onPressed: () => m.api.openExternal(u.url),
            child: Text(m.t('update.get')),
          ),
          IconButton(tooltip: m.t('update.dismiss'), onPressed: m.dismissUpdate, icon: const Icon(Icons.close_rounded, size: 20)),
        ]),
      ),
    );
  }
}

/// Short messages ("Added to downloads", "Link copied") above the bottom bar.
class ToastLayer extends StatelessWidget {
  const ToastLayer({super.key});

  @override
  Widget build(BuildContext context) {
    final m = AppScope.of(context);
    final c = context.colors;
    return IgnorePointer(
      child: Align(
        alignment: Alignment.bottomCenter,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 14, left: 16, right: 16),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            for (final t in m.toasts)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Material(
                  color: c.surface3,
                  elevation: 6,
                  borderRadius: BorderRadius.circular(14),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(t.tone == 'ok' ? Icons.check_circle_rounded : t.tone == 'error' ? Icons.error_rounded : Icons.info_rounded,
                          size: 18, color: t.tone == 'ok' ? c.ok : t.tone == 'error' ? c.bad : c.brandLight),
                      const SizedBox(width: 10),
                      Flexible(child: Text(t.text, style: const TextStyle(fontWeight: FontWeight.w600))),
                    ]),
                  ),
                ),
              ),
          ]),
        ),
      ),
    );
  }
}
