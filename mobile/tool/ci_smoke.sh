#!/usr/bin/env bash
# Runs the end-to-end smoke test on an already-booted emulator (see .github/workflows/ci.yml):
#   - serves a generated test clip on the runner's port 8099 and forwards it into the emulator
#   - runs integration_test/smoke_test.dart on the device
# Failures are printed as GitHub `::error` annotations because job logs need a login to read.
set -u
cd "$(dirname "$0")/.."

work="$(mktemp -d)"
ffmpeg -loglevel error -f lavfi -i "testsrc=duration=10:size=640x360:rate=25" -f lavfi -i "sine=frequency=440:duration=10" \
  -c:v libx264 -preset ultrafast -c:a aac -shortest -movflags +faststart "$work/clip.mp4" || { echo "::error::could not generate the test clip"; exit 1; }
ffmpeg -loglevel error -f lavfi -i "testsrc2=size=640x360:duration=1" -frames:v 1 "$work/cover.png" || { echo "::error::could not generate the cover image"; exit 1; }
cat > "$work/page.html" <<HTML
<!doctype html><html><head><meta charset="utf-8"><title>Test Song</title>
<meta property="og:title" content="Test Song">
<meta property="og:image" content="http://127.0.0.1:8099/cover.png">
<meta property="og:video" content="http://127.0.0.1:8099/clip.mp4">
</head><body><video src="http://127.0.0.1:8099/clip.mp4" controls></video></body></html>
HTML
python3 tool/test_server.py "$work" 8099 &
server=$!
trap 'kill $server 2>/dev/null' EXIT
adb reverse tcp:8099 tcp:8099

log="$work/test.log"
flutter test integration_test/smoke_test.dart -d emulator-5554 --no-pub 2>&1 | tee "$log"
code=${PIPESTATUS[0]}

if [ "$code" -ne 0 ]; then
  # one annotation per interesting line so the reason is visible without opening the log
  grep -E "Expected|Actual|Which is|Timed out|Engine failed|Exception|Error|FAILED|failed" "$log" | head -15 | while IFS= read -r line; do
    echo "::error::smoke: ${line//$'\r'/}"
  done
  echo "::error::Android smoke test failed (exit $code)"
  adb logcat -d | grep -iE "streampull|youtubedl|yt-dlp|Traceback|Error" | grep -viE "chatty|vold" | tail -25 | while IFS= read -r line; do
    echo "::error::logcat: ${line//$'\r'/}"
  done
fi
exit "$code"
