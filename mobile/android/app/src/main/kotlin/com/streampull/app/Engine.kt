package com.streampull.app

import android.content.Context
import com.yausername.ffmpeg.FFmpeg
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLException
import com.yausername.youtubedl_android.YoutubeDLRequest
import org.json.JSONObject
import java.util.UUID
import kotlin.concurrent.thread

/** Owns the bundled yt-dlp + FFmpeg (youtubedl-android): initialisation, updates and JSON queries. */
object Engine {
    private const val DAY = 24L * 60 * 60 * 1000

    private lateinit var app: Context

    @Volatile
    var state: JSONObject = JSONObject().put("phase", "checking")
        private set

    /** Called when the state changes (the plugin forwards it to the UI). */
    @Volatile
    var onState: ((JSONObject) -> Unit)? = null

    private val prefs get() = app.getSharedPreferences("engine", Context.MODE_PRIVATE)

    private fun set(s: JSONObject) {
        state = s
        onState?.invoke(s)
    }

    private fun ready(): JSONObject {
        val version = runCatching { YoutubeDL.version(app) }.getOrNull() ?: "bundled"
        return JSONObject().put("phase", "ready").put("version", version)
    }

    fun init(ctx: Context) {
        app = ctx.applicationContext
        thread(name = "engine-init", isDaemon = true) {
            try {
                // First launch unpacks Python and yt-dlp (a few seconds).
                YoutubeDL.init(app)
                FFmpeg.init(app)
                set(ready())
                if (System.currentTimeMillis() - prefs.getLong("lastUpdate", 0) > DAY) update()
            } catch (e: Throwable) {
                set(JSONObject().put("phase", "error").put("message", e.message ?: e.javaClass.simpleName))
            }
        }
    }

    /** Fetch the latest yt-dlp (sites change constantly). Blocks; call off the main thread. */
    @Synchronized
    fun update(): JSONObject {
        if (state.optString("phase") != "ready") return state
        try {
            YoutubeDL.updateYoutubeDL(app, YoutubeDL.UpdateChannel.STABLE)
            prefs.edit().putLong("lastUpdate", System.currentTimeMillis()).apply()
        } catch (_: Throwable) {
            // keep the bundled/previous version; the user can retry from Settings
        }
        set(ready())
        return state
    }

    /** Run `yt-dlp -J --flat-playlist` and return `{ok:true, raw:{…}}` or `{ok:false, error, detail}`. */
    fun runJson(url: String, timeoutMs: Long, playlistEnd: Int?): JSONObject {
        if (state.optString("phase") != "ready") return failure("not_ready", null)

        val id = "json-" + UUID.randomUUID()
        val req = YoutubeDLRequest(url).apply {
            addOption("-J")
            addOption("--flat-playlist")
            addOption("--no-warnings")
            addOption("--socket-timeout", 20)
            playlistEnd?.let { addOption("--playlist-end", it) }
            if (Classify.wantsSingle(url)) addOption("--no-playlist")
        }

        var timedOut = false
        val watchdog = thread(isDaemon = true, name = "json-watchdog") {
            try {
                Thread.sleep(timeoutMs)
                timedOut = true
                YoutubeDL.destroyProcessById(id)
            } catch (_: InterruptedException) {
            }
        }
        return try {
            val res = YoutubeDL.execute(req, id, null)
            JSONObject().put("ok", true).put("raw", JSONObject(res.out.trim()))
        } catch (e: YoutubeDL.CanceledException) {
            failure("network", if (timedOut) "timeout" else "canceled")
        } catch (e: YoutubeDLException) {
            failure(Classify.error(e.message), Classify.lastErrorLine(e.message))
        } catch (e: Exception) {
            failure("unknown", e.message)
        } finally {
            watchdog.interrupt()
        }
    }

    private fun failure(code: String, detail: String?): JSONObject =
        JSONObject().put("ok", false).put("error", code).apply { if (detail != null) put("detail", detail) }
}
