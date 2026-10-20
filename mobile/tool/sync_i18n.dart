// Copies the desktop app's translation files into this app's assets so both apps always say the same thing.
//
//   dart run tool/sync_i18n.dart
//
// test/i18n_sync_test.dart fails when the copies are out of date.
import 'dart:io';

void main() {
  const names = ['ar', 'en'];
  for (final n in names) {
    final src = File('../src/renderer/src/i18n/$n.json');
    if (!src.existsSync()) {
      stderr.writeln('Cannot find ${src.path} (run this from the mobile/ folder of the repository).');
      exit(1);
    }
    src.copySync('assets/i18n/$n.json');
    stdout.writeln('copied $n.json');
  }
}
