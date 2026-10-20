// Color themes (port of src/shared/themes.ts). Every theme is a dark palette. Colors are plain [r, g, b] lists so this
// file stays free of Flutter; the UI turns them into `Color`s.

class AppThemeDef {
  const AppThemeDef({
    required this.id,
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.surface3,
    required this.brand,
    required this.brandLight,
    required this.brandDeep,
    required this.accent2,
    required this.t50,
    required this.t100,
    required this.t200,
    required this.t300,
  });

  final String id;

  /// page background
  final List<int> bg;
  final List<int> surface;
  final List<int> surface2;
  final List<int> surface3;
  final List<int> brand;
  final List<int> brandLight;
  final List<int> brandDeep;

  /// secondary accent used in gradients
  final List<int> accent2;

  /// tinted text scale
  final List<int> t50;
  final List<int> t100;
  final List<int> t200;
  final List<int> t300;

  List<List<int>> get all => [bg, surface, surface2, surface3, brand, brandLight, brandDeep, accent2, t50, t100, t200, t300];
}

const appThemes = <AppThemeDef>[
  AppThemeDef(
    id: 'violet',
    bg: [13, 8, 24],
    surface: [21, 14, 39],
    surface2: [29, 20, 56],
    surface3: [39, 27, 74],
    brand: [139, 92, 246],
    brandLight: [167, 139, 250],
    brandDeep: [124, 58, 237],
    accent2: [192, 132, 252],
    t50: [245, 243, 255],
    t100: [237, 233, 254],
    t200: [221, 214, 254],
    t300: [196, 181, 253],
  ),
  AppThemeDef(
    id: 'ocean',
    bg: [6, 12, 24],
    surface: [10, 20, 38],
    surface2: [15, 29, 56],
    surface3: [22, 41, 78],
    brand: [59, 130, 246],
    brandLight: [96, 165, 250],
    brandDeep: [37, 99, 235],
    accent2: [34, 211, 238],
    t50: [239, 246, 255],
    t100: [219, 234, 254],
    t200: [191, 219, 254],
    t300: [147, 197, 253],
  ),
  AppThemeDef(
    id: 'emerald',
    bg: [5, 16, 13],
    surface: [9, 26, 21],
    surface2: [14, 38, 31],
    surface3: [20, 54, 44],
    brand: [16, 185, 129],
    brandLight: [52, 211, 153],
    brandDeep: [5, 150, 105],
    accent2: [45, 212, 191],
    t50: [236, 253, 245],
    t100: [209, 250, 229],
    t200: [167, 243, 208],
    t300: [110, 231, 183],
  ),
  AppThemeDef(
    id: 'rose',
    bg: [22, 8, 14],
    surface: [36, 14, 24],
    surface2: [54, 20, 36],
    surface3: [76, 29, 52],
    brand: [244, 63, 94],
    brandLight: [251, 113, 133],
    brandDeep: [225, 29, 72],
    accent2: [244, 114, 182],
    t50: [255, 241, 242],
    t100: [255, 228, 230],
    t200: [254, 205, 211],
    t300: [253, 164, 175],
  ),
  AppThemeDef(
    id: 'sunset',
    bg: [20, 12, 6],
    surface: [33, 20, 10],
    surface2: [49, 30, 14],
    surface3: [69, 42, 19],
    brand: [249, 115, 22],
    brandLight: [251, 146, 60],
    brandDeep: [234, 88, 12],
    accent2: [251, 191, 36],
    t50: [255, 247, 237],
    t100: [255, 237, 213],
    t200: [254, 215, 170],
    t300: [253, 186, 116],
  ),
  AppThemeDef(
    id: 'midnight',
    bg: [0, 0, 0],
    surface: [10, 8, 16],
    surface2: [18, 14, 28],
    surface3: [28, 22, 44],
    brand: [139, 92, 246],
    brandLight: [167, 139, 250],
    brandDeep: [124, 58, 237],
    accent2: [192, 132, 252],
    t50: [245, 243, 255],
    t100: [237, 233, 254],
    t200: [221, 214, 254],
    t300: [196, 181, 253],
  ),
];

const defaultThemeId = 'violet';

bool isThemeId(Object? v) => appThemes.any((t) => t.id == v);

AppThemeDef themeById(Object? id) => appThemes.firstWhere((t) => t.id == id, orElse: () => appThemes.first);

String rgbToHex(List<int> c) => '#${c.map((n) => n.toRadixString(16).padLeft(2, '0')).join()}';
