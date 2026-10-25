package com.streampull.app

import android.content.Context
import android.net.Uri
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLException
import com.yausername.youtubedl_android.YoutubeDLRequest
import org.json.JSONObject
import java.io.File
import java.util.UUID
import kotlin.math.max
import kotlin.math.min

/**
 * The download queue (same behaviour as src/main/services/queue.ts on desktop): parallel downloads,
 * pause / resume / cancel / retry, live progress. It lives in native code so it keeps working when the
 * UI is in the background (a foreground service keeps the process alive).
 */
object DownloadQueue {
    private lateinit var app: Context
    private val lock = Any()
    private val items = LinkedHashMap<String, QueueItem>()
    private val running = HashMap<String, Thread>()
    private val stopping = HashMap<String, String>() // id -> "pause" | "cancel" | "requeue"
    private val lastEmit = HashMap<String, Long>()
    private var lastServiceUpdate = 0L

    @Volatile var emitUpdate: (JSONObject) -> Unit = {}
    @Volatile var emitRemoved: (String) -> Unit = {}
    @Volatile var emitNetwork: (Boolean) -> Unit = {}

    fun init(ctx: Context) {
        app = ctx.applicationContext
        NetworkGuard.onChange = { networkChanged() }
        NetworkGuard.init(app)
    }

    // ---- queries -------------------------------------------------------------------------------

    fun list(): List<JSONObject> = synchronized(lock) { items.values.map { it.toJson() } }

    // ---- commands ------------------------------------------------------------------------------

    fun add(reqs: List<JSONObject>): List<JSONObject> {
        val added = ArrayList<QueueItem>()
        for (r in reqs.take(500)) {
            val url = r.optString("url")
            if (!url.startsWith("http://") && !url.startsWith("https://")) continue
            added.add(QueueItem.fromRequest(UUID.randomUUID().toString(), r))
        }
        synchronized(lock) { added.forEach { items[it.id] = it } }
        added.forEach { emit(it, force = true) }
        pump()
        return added.map { it.toJson() }
    }

    fun pause(id: String) {
        val item = get(id) ?: return
        synchronized(lock) {
            if (running.containsKey(id)) {
                stopping[id] = "pause"
                YoutubeDL.destroyProcessById(id)
            } else if (item.status == "queued") {
                item.status = "paused"
                emit(item, true)
            }
        }
        syncService()
    }

    fun resume(id: String) {
        val item = get(id) ?: return
        if (item.status == "paused") {
            item.status = "queued"
            emit(item, true)
            pump()
        }
    }

    fun cancel(id: String) {
        val item = get(id) ?: return
        synchronized(lock) {
            if (running.containsKey(id)) {
                stopping[id] = "cancel"
                YoutubeDL.destroyProcessById(id)
            } else if (item.status == "queued" || item.status == "paused") {
                item.status = "canceled"
                tempDir(id).deleteRecursively()
                emit(item, true)
            }
        }
        syncService()
    }

    fun retry(id: String) {
        val item = get(id) ?: return
        if (item.status == "error" || item.status == "canceled") {
            item.status = "queued"
            item.percent = 0.0
            item.error = null
            item.errorDetail = null
            emit(item, true)
            pump()
        }
    }

    fun remove(id: String) {
        val removed = synchronized(lock) {
            if (running.containsKey(id)) null else items.remove(id)
        } ?: return
        tempDir(removed.id).deleteRecursively()
        emitRemoved(id)
    }

    fun clearFinished() {
        val done = synchronized(lock) {
            items.values.filter { it.status == "completed" || it.status == "canceled" || it.status == "error" }.map { it.id }
        }
        done.forEach { remove(it) }
    }

    /** The concurrency limit may have changed. */
    fun settingsChanged() {
        NetworkGuard.settingChanged()
        networkChanged()
    }

    /** Wi-Fi came or went, or the "Wi-Fi only" setting changed. */
    fun networkChanged() {
        val allowed = NetworkGuard.allowed()
        if (!allowed) {
            // Stop what is running; the partial files stay and the downloads continue when Wi-Fi is back.
            synchronized(lock) {
                for (id in running.keys.toList()) {
                    stopping[id] = "requeue"
                    YoutubeDL.destroyProcessById(id)
                }
            }
        }
        emitNetwork(allowed)
        if (allowed) pump() else syncService()
    }

    fun openFile(ctx: Context, id: String): Boolean {
        val uri = get(id)?.fileUri ?: HistoryStore.get(id)?.uri ?: return false
        val name = (get(id)?.filePath ?: HistoryStore.get(id)?.filePath ?: "file").substringAfterLast('/')
        return MediaSaver.open(ctx, Uri.parse(uri), name)
    }

    // ---- scheduling ----------------------------------------------------------------------------

    private fun get(id: String): QueueItem? = synchronized(lock) { items[id] }

    private fun tempDir(id: String) = File(app.cacheDir, "dl/$id")

    private fun pump() {
        if (!NetworkGuard.allowed()) {
            syncService()
            return
        }
        synchronized(lock) {
            val limit = SettingsStore.concurrency
            for (item in items.values) {
                if (running.size >= limit) break
                if (item.status == "queued" && !running.containsKey(item.id)) {
                    val t = Thread { run(item) }.apply { isDaemon = true; name = "dl-${item.id.take(6)}" }
                    running[item.id] = t
                    t.start()
                }
            }
        }
        syncService()
    }

    private fun YoutubeDLRequest.addArgs(args: List<String>) {
        var i = 0
        while (i < args.size) {
            val a = args[i]
            if (a.startsWith("-") && i + 1 < args.size && !args[i + 1].startsWith("-")) {
                addOption(a, args[i + 1])
                i += 2
            } else {
                addOption(a)
                i++
            }
        }
    }

    private fun run(item: QueueItem) {
        val temp = tempDir(item.id).also { it.mkdirs() }
        item.status = "downloading"
        item.error = null
        item.errorDetail = null
        item.speed = null
        item.eta = null
        emit(item, true)

        val req = YoutubeDLRequest(item.url).apply {
            addOption("--no-playlist")
            addOption("-N", 4)
            addOption("--socket-timeout", 20)
            addOption("--windows-filenames")
            addOption("--no-mtime")
            addOption("-P", temp.absolutePath)
            addArgs(item.args)
        }

        // A video+audio download runs as two streams whose byte counters restart at 0; accumulate so the bar never jumps back.
        var base = 0.0
        var last = 0.0
        val callback: (Float, Long, String) -> Unit = cb@{ pct, eta, line ->
            if (Classify.isPostprocess(line)) {
                if (item.status == "downloading") {
                    item.status = "processing"
                    item.percent = 100.0
                    item.speed = null
                    item.eta = null
                    emit(item, true)
                }
                return@cb
            }
            if (item.status != "downloading") return@cb
            val p = Classify.progress(line)
            if (p?.downloadedBytes != null) {
                if (p.downloadedBytes < last * 0.9) base += last
                last = p.downloadedBytes
                val done = base + last
                val expected = item.expectedBytes
                item.downloadedBytes = done.toLong()
                item.totalBytes = expected ?: p.totalBytes?.toLong()
                item.percent = when {
                    expected != null && expected > 0 -> max(item.percent, min(99.0, done / expected * 100))
                    base > 0 -> max(item.percent, pct.toDouble())
                    else -> pct.toDouble()
                }
                item.speed = p.speed
                item.eta = when {
                    expected != null && expected > 0 && p.speed != null && p.speed > 0 -> max(0.0, (expected - done) / p.speed)
                    eta >= 0 -> eta.toDouble()
                    else -> null
                }
                emit(item)
            } else if (pct >= 0) {
                item.percent = max(item.percent, pct.toDouble())
                emit(item)
            }
        }

        var failure: String? = null
        try {
            Engine.running { YoutubeDL.execute(req, item.id, callback) }
        } catch (_: YoutubeDL.CanceledException) {
            // handled through `stopping` below
        } catch (e: YoutubeDLException) {
            failure = e.message ?: ""
        } catch (e: Exception) {
            failure = e.message ?: e.javaClass.simpleName
        }

        val why = synchronized(lock) {
            running.remove(item.id)
            stopping.remove(item.id)
        }

        when {
            why == "requeue" -> {
                item.status = "queued"
                item.speed = null
                item.eta = null
                emit(item, true)
            }
            why == "pause" -> {
                item.status = "paused"
                item.speed = null
                item.eta = null
                emit(item, true)
            }
            why == "cancel" -> {
                item.status = "canceled"
                item.speed = null
                item.eta = null
                temp.deleteRecursively()
                emit(item, true)
            }
            failure == null -> complete(item, temp)
            else -> {
                item.status = "error"
                item.speed = null
                item.eta = null
                item.error = Classify.error(failure)
                item.errorDetail = Classify.lastErrorLine(failure)
                emit(item, true)
            }
        }
        pump()
    }

    private fun complete(item: QueueItem, temp: File) {
        val file = temp.listFiles()
            ?.filter { it.isFile && !it.name.endsWith(".part") && !it.name.endsWith(".ytdl") && !it.name.contains(".part-Frag") }
            ?.maxByOrNull { it.length() }
        if (file == null) {
            item.status = "error"
            item.error = "unknown"
            item.errorDetail = "No output file was produced"
            emit(item, true)
            return
        }
        try {
            val size = file.length()
            val saved = MediaSaver.save(app, file, file.name)
            temp.deleteRecursively()
            item.status = "completed"
            item.percent = 100.0
            item.speed = null
            item.eta = null
            item.filePath = saved.displayPath
            item.fileUri = saved.uri.toString()
            item.totalBytes = size
            HistoryStore.add(
                HistoryItem(
                    id = item.id,
                    url = item.url,
                    title = item.title,
                    thumbnail = item.thumbnail,
                    uploader = item.uploader,
                    duration = item.duration,
                    quality = item.quality,
                    kind = if (item.audio) "audio" else "video",
                    filePath = saved.displayPath,
                    uri = saved.uri.toString(),
                    sizeBytes = size,
                    completedAt = System.currentTimeMillis()
                )
            )
            emit(item, true)
            if (SettingsStore.notifications) Notifier.done(app, item)
        } catch (e: Exception) {
            item.status = "error"
            item.error = "unknown"
            item.errorDetail = e.message
            emit(item, true)
        }
    }

    // ---- events / service ----------------------------------------------------------------------

    /** Push an update to the UI; progress ticks are throttled to ~4/s. */
    private fun emit(item: QueueItem, force: Boolean = false) {
        val now = System.currentTimeMillis()
        if (!force) {
            val prev = synchronized(lastEmit) { lastEmit[item.id] ?: 0L }
            if (now - prev < 250) return
        }
        synchronized(lastEmit) { lastEmit[item.id] = now }
        emitUpdate(item.toJson())
        if (force || now - lastServiceUpdate > 1000) {
            lastServiceUpdate = now
            syncService()
        }
    }

    /** Keep the foreground service (and its notification) in step with what is downloading. */
    private fun syncService() {
        val active = synchronized(lock) {
            items.values.filter { it.status == "downloading" || it.status == "processing" || it.status == "queued" }
        }
        if (active.isEmpty()) {
            DownloadService.stop(app)
        } else {
            val current = active.firstOrNull { it.status == "downloading" || it.status == "processing" } ?: active.first()
            DownloadService.show(app, active.size, current.title, current.percent.toInt())
        }
    }
}
