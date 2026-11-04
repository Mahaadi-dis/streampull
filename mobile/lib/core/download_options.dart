// Optional audio features (cover art, tags, MP3 bitrate) as pure yt-dlp argument logic.
// Port of src/shared/downloadOptions.ts, tested with the same vectors.

const mp3Qualities = ['best', '320', '192', '128'];

bool isMp3Quality(Object? v) => mp3Qualities.contains(v);

/// The settings that change what yt-dlp is asked to do.
class DownloadPrefs {
  const DownloadPrefs({
    this.embedCover = true,
    this.squareCover = true,
    this.embedTags = true,
    this.mp3Quality = 'best',
  });

  final bool embedCover;
  final bool squareCover;
  final bool embedTags;
  final String mp3Quality;
}

/// yt-dlp's `--ppa` that crops the cover to a centered square before it is embedded.
const squareCoverPpa = "ThumbnailsConvertor+FFmpeg_o:-vf crop=\"'if(gt(ih,iw),iw,ih)':'if(gt(iw,ih),ih,iw)'\"";

/// Thumbnail conversion rules used together with the crop. yt-dlp skips a conversion whose source and target format are
/// the same (YouTube's jpg thumbnails with "jpg" as the target), and then the crop would never run. Here every format
/// is converted to a different one, so the crop always runs: png→jpg, jpg→png, webp→png.
const squareCoverFormats = 'png>jpg/jpg>png/webp>png';

bool _isAudio(String q) => q == 'mp3' || q == 'm4a';

/// `--audio-quality` value: 0 is the best variable bitrate, otherwise a fixed bitrate.
String mp3QualityArg(String q) => q == 'best' ? '0' : '${q}K';

/// The extra yt-dlp arguments for the optional features, for one download.
List<String> downloadOptionArgs(String quality, DownloadPrefs prefs) {
  final args = <String>[];
  if (_isAudio(quality)) {
    if (prefs.embedCover) {
      args.addAll(['--embed-thumbnail', '--convert-thumbnails', prefs.squareCover ? squareCoverFormats : 'jpg']);
      if (prefs.squareCover) args.addAll(['--ppa', squareCoverPpa]);
    }
    if (prefs.embedTags) args.add('--embed-metadata');
  }
  return args;
}
