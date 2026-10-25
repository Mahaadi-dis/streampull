#!/usr/bin/env bash
# Runs the end-to-end smoke tests on an already-booted emulator (see .github/workflows/ci.yml):
#   - serves a generated test clip, a cover image and a page pointing at both on the runner's port 8099 and forwards
#     it into the emulator
#   - runs integration_test/smoke_test.dart (engine, analyze, download, MP3 cover and bitrate)
#   - runs integration_test/wifi_test.dart, switching the emulator's Wi-Fi off and on when the test asks for it
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
trap 'kill $server 2>/dev/null; adb shell svc wifi enable >/dev/null 2>&1' EXIT
adb reverse tcp:8099 tcp:8099

annotate_failure() {
  local name="$1" log="$2" code="$3"
  # one annotation per interesting line so the reason is visible without opening the log
  grep -E "Expected|Actual|Which is|Timed out|Engine failed|Exception|Error|FAILED|failed|WIFI_STEP" "$log" | head -15 | while IFS= read -r line; do
    echo "::error::$name: ${line//$'\r'/}"
  done
  echo "::error::$name failed (exit $code)"
  adb logcat -d | grep -iE "streampull|StreamPullNet|youtubedl|yt-dlp|Traceback|Error" | grep -viE "chatty|vold" | tail -30 | while IFS= read -r line; do
    echo "::error::logcat: ${line//$'\r'/}"
  done
}

log="$work/test.log"
flutter test integration_test/smoke_test.dart -d emulator-5554 --no-pub 2>&1 | tee "$log"
code=${PIPESTATUS[0]}
if [ "$code" -ne 0 ]; then
  annotate_failure "smoke" "$log" "$code"
  exit "$code"
fi

# "Wi-Fi only": the test prints WIFI_STEP markers and we flip the emulator's Wi-Fi in response. The markers are read from
# logcat: the output of flutter test is not flushed until the test ends, so it cannot be used to react in time.
wifi_log="$work/wifi.log"
marks="$work/marks.log"
adb logcat -c
adb logcat -v brief "flutter:I" "*:S" > "$marks" 2>&1 &
logcat_pid=$!
flutter test integration_test/wifi_test.dart -d emulator-5554 --no-pub > "$wifi_log" 2>&1 &
wifi_pid=$!
for step in offline online offline2 online2; do
  until grep -q "WIFI_STEP $step" "$marks" || ! kill -0 "$wifi_pid" 2>/dev/null; do sleep 1; done
  grep -q "WIFI_STEP $step" "$marks" || break
  case "$step" in
    offline*) adb shell svc wifi disable ;;
    online*) adb shell svc wifi enable ;;
  esac
  echo "wifi: $step"
  sleep 3
  adb shell dumpsys connectivity | grep -E "Active default network|Transports:" | head -4
done
wait "$wifi_pid"
wcode=$?
kill "$logcat_pid" 2>/dev/null
cat "$wifi_log"
if [ "$wcode" -ne 0 ]; then
  annotate_failure "wifi" "$wifi_log" "$wcode"
  grep -E "WIFI_STEP" "$marks" | head -5 | while IFS= read -r line; do echo "::error::wifi marker: ${line%$''}"; done
  exit "$wcode"
fi
exit 0
