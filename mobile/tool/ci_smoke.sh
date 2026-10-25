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

# GitHub shows at most 10 error annotations per step, so everything goes into a few multi-line ones.
annotate() {
  local title="$1" text="$2"
  text="${text//'%'/'%25'}"
  text="${text//$'\r'/}"
  text="${text//$'\n'/'%0A'}"
  echo "::error title=${title}::${text:0:3800}"
}

annotate_failure() {
  local name="$1" log="$2" code="$3"
  annotate "$name failed (exit $code)" "$(grep -E "Expected|Actual|Which is|Timed out|Engine failed|Exception|Error|FAILED|failed|WIFI_STEP" "$log" | head -15)"
  annotate "$name logcat" "$(adb logcat -d | grep -iE "streampull|StreamPullNet|youtubedl|yt-dlp|Traceback" | grep -viE "chatty|vold|AppsFilter|WindowManager|ProfileInstaller|InputManager" | tail -25 | cut -c1-230)"
}

log="$work/test.log"
flutter test integration_test/smoke_test.dart -d emulator-5554 --no-pub 2>&1 | tee "$log"
code=${PIPESTATUS[0]}
if [ "$code" -ne 0 ]; then
  annotate_failure "smoke" "$log" "$code"
  exit "$code"
fi

# "Wi-Fi only": the test writes its WIFI_STEP markers into a file in the app's cache (printed output only reaches us
# when the test is over) and we flip the emulator's Wi-Fi in response.
wifi_log="$work/wifi.log"
host_log="$work/host.log"
: > "$host_log"
steps() { adb shell run-as com.streampull.app cat cache/wifi_step 2>/dev/null | tr -d '\r'; }
adb shell run-as com.streampull.app rm -f cache/wifi_step >/dev/null 2>&1
flutter test integration_test/wifi_test.dart -d emulator-5554 --no-pub > "$wifi_log" 2>&1 &
wifi_pid=$!
for step in offline online offline2 online2; do
  until steps | grep -qx "$step" || ! kill -0 "$wifi_pid" 2>/dev/null; do sleep 1; done
  steps | grep -qx "$step" || break
  case "$step" in
    offline*) adb shell svc wifi disable ;;
    online*) adb shell svc wifi enable ;;
  esac
  echo "wifi: $step" | tee -a "$host_log"
  sleep 4
  { adb shell dumpsys connectivity | grep -E "Active default network|Transports:" | head -4; adb shell settings get global wifi_on; adb logcat -d -s StreamPullNet:I | tail -3; } 2>&1 | tee -a "$host_log"
done
wait "$wifi_pid"
wcode=$?
cat "$wifi_log"
if [ "$wcode" -ne 0 ]; then
  annotate_failure "wifi" "$wifi_log" "$wcode"
  annotate "wifi: what the script did" "steps seen: $(steps | tr '\n' ' ')
$(cat "$host_log")"
  annotate "wifi: network guard log" "$(adb logcat -d -s StreamPullNet:I | tail -20 | cut -c1-200)"
  exit "$wcode"
fi
exit 0
