// Material 3 theme built from one of the desktop app's six dark color themes.

import 'package:flutter/material.dart';

import '../core/themes.dart';

Color rgb(List<int> c, [double opacity = 1]) => Color.fromRGBO(c[0], c[1], c[2], opacity);

/// The app's own palette (on top of Material's [ColorScheme]).
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.surface3,
    required this.brand,
    required this.brandLight,
    required this.brandDeep,
    required this.accent2,
    required this.text,
    required this.textDim,
    required this.line,
    required this.ok,
    required this.warn,
    required this.bad,
  });

  factory AppColors.from(AppThemeDef d) => AppColors(
        bg: rgb(d.bg),
        surface: rgb(d.surface),
        surface2: rgb(d.surface2),
        surface3: rgb(d.surface3),
        brand: rgb(d.brand),
        brandLight: rgb(d.brandLight),
        brandDeep: rgb(d.brandDeep),
        accent2: rgb(d.accent2),
        text: rgb(d.t50),
        textDim: rgb(d.t300, 0.62),
        line: rgb(d.brandLight, 0.16),
        ok: const Color(0xFF34D399),
        warn: const Color(0xFFFBBF24),
        bad: const Color(0xFFF87171),
      );

  final Color bg;
  final Color surface;
  final Color surface2;
  final Color surface3;
  final Color brand;
  final Color brandLight;
  final Color brandDeep;
  final Color accent2;
  final Color text;
  final Color textDim;
  final Color line;
  final Color ok;
  final Color warn;
  final Color bad;

  LinearGradient get brandGradient =>
      LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [brandDeep, brand, accent2]);

  @override
  AppColors copyWith() => this;

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) => other is AppColors ? (t < 0.5 ? this : other) : this;
}

extension AppColorsContext on BuildContext {
  AppColors get colors => Theme.of(this).extension<AppColors>()!;
}

const fontFamily = 'IBMPlexSansArabic';

ThemeData buildTheme(AppThemeDef d) {
  final c = AppColors.from(d);
  final scheme = ColorScheme.dark(
    primary: c.brand,
    onPrimary: Colors.white,
    primaryContainer: c.brandDeep,
    onPrimaryContainer: Colors.white,
    secondary: c.accent2,
    onSecondary: Colors.black,
    surface: c.surface,
    onSurface: c.text,
    surfaceContainerHighest: c.surface2,
    error: c.bad,
    outline: c.line,
    outlineVariant: c.line,
  );
  final base = ThemeData(brightness: Brightness.dark, useMaterial3: true, colorScheme: scheme, fontFamily: fontFamily);
  return base.copyWith(
    scaffoldBackgroundColor: c.bg,
    canvasColor: c.bg,
    extensions: [c],
    textTheme: base.textTheme.apply(bodyColor: c.text, displayColor: c.text),
    dividerColor: c.line,
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(fontFamily: fontFamily, fontSize: 22, fontWeight: FontWeight.w800, color: c.text),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: c.surface,
      indicatorColor: c.brand.withValues(alpha: 0.28),
      surfaceTintColor: Colors.transparent,
      height: 68,
      labelTextStyle: WidgetStateProperty.resolveWith((s) => TextStyle(
            fontFamily: fontFamily,
            fontSize: 12,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
            color: s.contains(WidgetState.selected) ? c.text : c.textDim,
          )),
      iconTheme: WidgetStateProperty.resolveWith(
          (s) => IconThemeData(color: s.contains(WidgetState.selected) ? c.brandLight : c.textDim)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.surface2.withValues(alpha: 0.6),
      hintStyle: TextStyle(color: c.textDim),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: c.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: c.line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: c.brandLight)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: c.brandDeep,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontFamily: fontFamily, fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: c.text,
        side: BorderSide(color: c.line),
        minimumSize: const Size(0, 44),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontFamily: fontFamily, fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: c.brandLight)),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.all(Colors.white),
      trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.brand : c.surface3),
      trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: c.surface2.withValues(alpha: 0.7),
      selectedColor: c.brand.withValues(alpha: 0.32),
      side: BorderSide(color: c.line),
      labelStyle: TextStyle(fontFamily: fontFamily, color: c.text, fontSize: 13, fontWeight: FontWeight.w600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    snackBarTheme: SnackBarThemeData(backgroundColor: c.surface3, contentTextStyle: TextStyle(color: c.text, fontFamily: fontFamily)),
  );
}
