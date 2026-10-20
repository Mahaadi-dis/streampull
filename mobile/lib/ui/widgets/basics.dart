// Small building blocks shared by the screens.

import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../theme.dart';

/// A rounded dark card with the app's thin border.
class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.tint});

  final Widget child;
  final EdgeInsetsGeometry padding;

  /// Optional accent color for the border/background (errors, update notices).
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: tint != null ? tint!.withValues(alpha: 0.12) : c.surface.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: tint != null ? tint!.withValues(alpha: 0.4) : c.line),
      ),
      child: child,
    );
  }
}

/// A small pill with text (and an optional icon).
class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, this.icon, this.color});

  final String text;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final fg = color ?? c.text;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: c.surface2.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: c.line),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 14, color: fg.withValues(alpha: 0.8)), const SizedBox(width: 5)],
        Flexible(child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: fg, fontWeight: FontWeight.w600))),
      ]),
    );
  }
}

/// A video/audio thumbnail with a duration badge, or a placeholder when there is none.
class MediaThumb extends StatelessWidget {
  /// Lets tests (and the README screenshot generator) draw thumbnails without a network.
  @visibleForTesting
  static Widget Function(String src)? debugImage;

  const MediaThumb({super.key, this.src, this.audio = false, this.duration, this.aspect = 16 / 9, this.radius = 14});

  final String? src;
  final bool audio;
  final double? duration;
  final double aspect;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final d = formatDuration(duration);
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: AspectRatio(
        aspectRatio: aspect,
        child: Stack(fit: StackFit.expand, children: [
          DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [c.surface3, c.surface2]))),
          if (src != null)
            (debugImage?.call(src!) ?? Image.network(src!, fit: BoxFit.cover, gaplessPlayback: true, errorBuilder: (_, _, _) => const SizedBox.shrink()))
          else
            Icon(audio ? Icons.music_note_rounded : Icons.movie_outlined, color: c.brandLight.withValues(alpha: 0.6), size: 28),
          if (audio && src != null) Positioned(top: 6, left: 6, child: Icon(Icons.music_note_rounded, size: 16, color: c.text)),
          if (d.isNotEmpty)
            Positioned(
              bottom: 5,
              right: 5,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.72), borderRadius: BorderRadius.circular(6)),
                child: Text(d, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
        ]),
      ),
    );
  }
}

/// Text painted with the brand gradient (the home headline).
class GradientText extends StatelessWidget {
  const GradientText(this.text, {super.key, required this.style, this.align = TextAlign.center});

  final String text;
  final TextStyle style;
  final TextAlign align;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ShaderMask(
      shaderCallback: (r) => LinearGradient(colors: [Colors.white, c.brandLight, c.accent2]).createShader(r),
      blendMode: BlendMode.srcIn,
      child: Text(text, textAlign: align, style: style.copyWith(color: Colors.white)),
    );
  }
}

/// A shimmering placeholder block while something loads.
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.height = 16, this.width, this.radius = 10});

  final double height;
  final double? width;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _ctl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat();

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AnimatedBuilder(
      animation: _ctl,
      builder: (_, _) => Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.radius),
          gradient: LinearGradient(
            begin: Alignment(-1 + 2 * _ctl.value, 0),
            end: Alignment(1 + 2 * _ctl.value, 0),
            colors: [c.surface2, c.surface3, c.surface2],
          ),
        ),
      ),
    );
  }
}

/// A circular progress indicator with the percentage in the middle.
class ProgressRing extends StatelessWidget {
  const ProgressRing({super.key, required this.percent, this.size = 44, this.busy = false});

  final double percent;
  final double size;

  /// Spin instead of showing a value (merging/processing).
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(alignment: Alignment.center, children: [
        CircularProgressIndicator(
          value: busy ? null : (percent / 100).clamp(0, 1),
          strokeWidth: 3.5,
          color: c.brandLight,
          backgroundColor: Colors.white.withValues(alpha: 0.12),
        ),
        if (!busy) Text('${percent.round()}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
      ]),
    );
  }
}
