// "Is there a newer release?" (port of src/shared/version.ts).

({List<int> nums, bool pre})? _parse(String v) {
  final t = v.trim();
  final m = RegExp(r'^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$').firstMatch(t);
  if (m == null) return null;
  return (
    nums: [int.parse(m.group(1)!), int.parse(m.group(2)!), int.parse(m.group(3)!)],
    pre: RegExp(r'^v?\d+\.\d+\.\d+-').hasMatch(t),
  );
}

/// True when [latest] is a newer release than [current]. Unparseable versions are never "newer".
bool isNewerVersion(String latest, String current) {
  final a = _parse(latest);
  final b = _parse(current);
  if (a == null || b == null) return false;
  for (var i = 0; i < 3; i++) {
    if (a.nums[i] != b.nums[i]) return a.nums[i] > b.nums[i];
  }
  return !a.pre && b.pre; // 1.0.0 is newer than 1.0.0-beta
}
