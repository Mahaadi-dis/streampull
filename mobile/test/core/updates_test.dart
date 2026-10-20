// Port of src/shared/release.test.ts.
import 'package:flutter_test/flutter_test.dart';
import 'package:streampull/core/updates.dart';

void main() {
  group('evaluateRelease', () {
    test('reports a newer release with a link to this project', () {
      final r = evaluateRelease({'tag_name': 'v0.5.0', 'html_url': '$repoUrl/releases/tag/v0.5.0'}, '0.4.0');
      expect(r, isA<UpdateNewer>());
      final info = (r as UpdateNewer).info;
      expect(info.version, '0.5.0');
      expect(info.current, '0.4.0');
      expect(info.url, '$repoUrl/releases/tag/v0.5.0');
    });

    test('says latest when the versions match or the app is ahead', () {
      expect((evaluateRelease({'tag_name': 'v0.4.0'}, '0.4.0') as UpdateLatest).version, '0.4.0');
      expect((evaluateRelease({'tag_name': 'v0.3.3'}, '0.4.0') as UpdateLatest).version, '0.3.3');
    });

    test('ignores drafts and pre-releases', () {
      expect(evaluateRelease({'tag_name': 'v9.0.0', 'prerelease': true}, '0.4.0'), isA<UpdateLatest>());
      expect(evaluateRelease({'tag_name': 'v9.0.0', 'draft': true}, '0.4.0'), isA<UpdateLatest>());
    });

    test('never links outside this project', () {
      final r = evaluateRelease({'tag_name': 'v0.5.0', 'html_url': 'https://evil.example/download'}, '0.4.0');
      expect((r as UpdateNewer).info.url, releasesPage);
    });

    test('is an error when the answer is not a release', () {
      expect(evaluateRelease(null, '0.4.0'), isA<UpdateError>());
      expect(evaluateRelease('nope', '0.4.0'), isA<UpdateError>());
      expect(evaluateRelease({'message': 'API rate limit exceeded'}, '0.4.0'), isA<UpdateError>());
      expect(evaluateRelease({'tag_name': 42}, '0.4.0'), isA<UpdateError>());
    });
  });
}
