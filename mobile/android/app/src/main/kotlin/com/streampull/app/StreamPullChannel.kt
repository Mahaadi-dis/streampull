package com.streampull.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread

/**
 * The bridge between the Flutter UI and the native engine/queue. A MethodChannel carries the calls (their names
 * and arguments are mirrored by lib/native/native_api.dart) and an EventChannel pushes live updates (engine state,
 * queue changes, shared links) as `{type, data}` maps.
 */
class StreamPullChannel(private val context: Context, messenger: BinaryMessenger) :
    MethodChannel.MethodCallHandler, EventChannel.StreamHandler {

    private val main = Handler(Looper.getMainLooper())
    private val method = MethodChannel(messenger, "streampull/api")
    private val events = EventChannel(messenger, "streampull/events")

    @Volatile private var sink: EventChannel.EventSink? = null

    init {
        method.setMethodCallHandler(this)
        events.setStreamHandler(this)
        Engine.onState = { emit("binaryState", it) }
        DownloadQueue.emitUpdate = { emit("queueUpdate", it) }
        DownloadQueue.emitRemoved = { emit("queueRemoved", JSONObject().put("id", it)) }
        DownloadQueue.emitNetwork = { emit("network", JSONObject().put("allowed", it)) }
        ShareBus.listener = { emit("link", JSONObject()) }
    }

    /** The Flutter engine is going away: stop pushing events to it (downloads keep running natively). */
    fun dispose() {
        method.setMethodCallHandler(null)
        events.setStreamHandler(null)
        Engine.onState = null
        DownloadQueue.emitUpdate = {}
        DownloadQueue.emitRemoved = {}
        DownloadQueue.emitNetwork = {}
        ShareBus.listener = null
        sink = null
    }

    // ---- events --------------------------------------------------------------------------------

    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        sink = events
    }

    override fun onCancel(arguments: Any?) {
        sink = null
    }

    private fun emit(type: String, data: JSONObject) {
        val message = mapOf("type" to type, "data" to toMap(data))
        main.post { sink?.success(message) }
    }

    // ---- conversion ----------------------------------------------------------------------------

    private fun toValue(v: Any?): Any? = when (v) {
        null, JSONObject.NULL -> null
        is JSONObject -> toMap(v)
        is JSONArray -> (0 until v.length()).map { toValue(v.get(it)) }
        else -> v
    }

    private fun toMap(o: JSONObject): Map<String, Any?> = o.keys().asSequence().associateWith { toValue(o.get(it)) }

    private fun toList(list: List<JSONObject>): List<Map<String, Any?>> = list.map { toMap(it) }

    // ---- calls ---------------------------------------------------------------------------------

    /** Run a blocking call off the main thread and answer on the main thread. */
    private fun background(result: MethodChannel.Result, block: () -> Any?) {
        thread(isDaemon = true, name = "channel-call") {
            try {
                val v = block()
                main.post { result.success(v) }
            } catch (e: Throwable) {
                main.post { result.error("native", e.message ?: e.javaClass.simpleName, null) }
            }
        }
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        fun str(key: String): String? = call.argument<String>(key)
        fun id(): String? = str("id").also { if (it == null) result.error("args", "id is required", null) }

        when (call.method) {
            "binaryState" -> result.success(toMap(Engine.state))
            "appVersion" -> result.success(
                context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "0.0.0"
            )
            "updateEngine" -> background(result) { toMap(Engine.update()) }
            "getSettings" -> result.success(toMap(SettingsStore.toJson()))
            "setSettings" -> {
                val patch = call.argument<Map<String, Any?>>("patch") ?: emptyMap()
                val s = SettingsStore.patch(JSONObject(patch))
                DownloadQueue.settingsChanged()
                result.success(toMap(s))
            }
            "runJson" -> {
                val url = str("url") ?: return result.error("args", "url is required", null)
                val timeoutMs = (call.argument<Number>("timeoutMs") ?: 90_000).toLong()
                val end = call.argument<Number>("playlistEnd")?.toInt()
                background(result) { toMap(Engine.runJson(url, timeoutMs, end)) }
            }

            "queueList" -> result.success(toList(DownloadQueue.list()))
            "queueAdd" -> {
                val reqs = call.argument<List<Map<String, Any?>>>("reqs") ?: return result.error("args", "reqs is required", null)
                result.success(toList(DownloadQueue.add(reqs.map { JSONObject(it) })))
            }
            "queuePause" -> id()?.let { DownloadQueue.pause(it); result.success(null) }
            "queueResume" -> id()?.let { DownloadQueue.resume(it); result.success(null) }
            "queueCancel" -> id()?.let { DownloadQueue.cancel(it); result.success(null) }
            "queueRetry" -> id()?.let { DownloadQueue.retry(it); result.success(null) }
            "queueRemove" -> id()?.let { DownloadQueue.remove(it); result.success(null) }
            "queueClearFinished" -> {
                DownloadQueue.clearFinished()
                result.success(null)
            }

            "historyList" -> background(result) { toList(HistoryStore.list()) }
            "historyRemove" -> id()?.let {
                HistoryStore.remove(it, call.argument<Boolean>("deleteFile") == true)
                result.success(null)
            }
            "historyClear" -> {
                HistoryStore.clear()
                result.success(null)
            }

            "openFile" -> id()?.let { result.success(DownloadQueue.openFile(context, it)) }
            "showInFolder" -> {
                MediaSaver.showDownloads(context)
                result.success(null)
            }
            "openExternal" -> {
                val url = str("url") ?: return result.error("args", "url is required", null)
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                }
                result.success(null)
            }
            "downloadsAllowed" -> result.success(NetworkGuard.allowed())
            "allowMobileData" -> {
                NetworkGuard.allowMobileData()
                result.success(null)
            }
            "takePendingLink" -> result.success(mapOf("url" to ShareBus.take()?.url))
            else -> result.notImplemented()
        }
    }
}
