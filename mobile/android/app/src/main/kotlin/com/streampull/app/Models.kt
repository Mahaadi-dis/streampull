package com.streampull.app

import org.json.JSONArray
import org.json.JSONObject

private fun JSONObject.putN(key: String, value: Any?): JSONObject = put(key, value ?: JSONObject.NULL)

private fun JSONObject.optStringOrNull(key: String): String? =
    if (isNull(key) || !has(key)) null else optString(key).takeIf { it.isNotEmpty() }

private fun JSONObject.optDoubleOrNull(key: String): Double? =
    if (isNull(key) || !has(key)) null else optDouble(key).takeIf { !it.isNaN() }

private fun JSONObject.optLongOrNull(key: String): Long? =
    if (isNull(key) || !has(key)) null else optDouble(key).takeIf { !it.isNaN() }?.toLong()

/** A download in the queue. Field names match `DownloadItem` in lib/core/models.dart. */
class QueueItem(
    val id: String,
    val url: String,
    val title: String,
    val thumbnail: String?,
    val duration: Double?,
    val uploader: String?,
    val quality: String,
    /** yt-dlp options computed in Dart (format, output name, rate limit, referer). */
    val args: List<String>,
    val audio: Boolean,
    val cookieUrl: String?,
    val referer: String?,
    val expectedBytes: Long?,
    /** Only this part of the video (seconds), or null for all of it. */
    val clipStart: Long?,
    val clipEnd: Long?,
    val createdAt: Long
) {
    @Volatile var status: String = "queued"
    @Volatile var percent: Double = 0.0
    @Volatile var speed: Double? = null
    @Volatile var eta: Double? = null
    @Volatile var downloadedBytes: Long = 0
    @Volatile var totalBytes: Long? = null
    @Volatile var filePath: String? = null
    @Volatile var fileUri: String? = null
    @Volatile var error: String? = null
    @Volatile var errorDetail: String? = null

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("url", url)
        put("title", title)
        putN("thumbnail", thumbnail)
        putN("duration", duration)
        putN("uploader", uploader)
        put("quality", quality)
        putN("expectedBytes", expectedBytes)
        putN("referer", referer)
        putN("cookieUrl", cookieUrl)
        if (clipStart != null && clipEnd != null) put("clip", JSONObject().put("start", clipStart).put("end", clipEnd))
        put("status", status)
        put("percent", if (percent.isNaN()) 0.0 else percent)
        putN("speed", speed)
        putN("eta", eta)
        put("downloadedBytes", downloadedBytes)
        putN("totalBytes", totalBytes)
        putN("filePath", filePath)
        putN("error", error)
        putN("errorDetail", errorDetail)
        put("createdAt", createdAt)
    }

    companion object {
        /** Build from a request sent by the UI (see `NativeRequest` in lib/native/native_api.dart). */
        fun fromRequest(id: String, r: JSONObject): QueueItem {
            val argsJson = r.optJSONArray("args") ?: JSONArray()
            return QueueItem(
                id = id,
                url = r.getString("url"),
                title = r.optString("title").ifEmpty { r.getString("url") },
                thumbnail = r.optStringOrNull("thumbnail"),
                duration = r.optDoubleOrNull("duration"),
                uploader = r.optStringOrNull("uploader"),
                quality = r.optString("quality").ifEmpty { "best" },
                args = (0 until argsJson.length()).map { argsJson.getString(it) },
                audio = r.optBoolean("audio", false),
                cookieUrl = r.optStringOrNull("cookieUrl"),
                referer = r.optStringOrNull("referer"),
                expectedBytes = r.optLongOrNull("expectedBytes"),
                clipStart = r.optJSONObject("clip")?.optLongOrNull("start"),
                clipEnd = r.optJSONObject("clip")?.optLongOrNull("end"),
                createdAt = System.currentTimeMillis()
            )
        }
    }
}

/** A finished download. Field names match `HistoryItem` in lib/core/models.dart. */
class HistoryItem(
    val id: String,
    val url: String,
    val title: String,
    val thumbnail: String?,
    val uploader: String?,
    val duration: Double?,
    val quality: String,
    val kind: String,
    /** Human-readable location, e.g. "Download/StreamPull/clip.mp4". */
    val filePath: String,
    /** content:// URI of the saved file. */
    val uri: String,
    val sizeBytes: Long?,
    val completedAt: Long
) {
    fun toJson(exists: Boolean? = null): JSONObject = JSONObject().apply {
        put("id", id)
        put("url", url)
        put("title", title)
        putN("thumbnail", thumbnail)
        putN("uploader", uploader)
        putN("duration", duration)
        put("quality", quality)
        put("kind", kind)
        put("filePath", filePath)
        put("uri", uri)
        putN("sizeBytes", sizeBytes)
        put("completedAt", completedAt)
        if (exists != null) put("fileExists", exists)
    }

    companion object {
        fun fromJson(o: JSONObject) = HistoryItem(
            id = o.getString("id"),
            url = o.getString("url"),
            title = o.getString("title"),
            thumbnail = o.optStringOrNull("thumbnail"),
            uploader = o.optStringOrNull("uploader"),
            duration = o.optDoubleOrNull("duration"),
            quality = o.optString("quality", "best"),
            kind = o.optString("kind", "video"),
            filePath = o.optString("filePath"),
            uri = o.optString("uri"),
            sizeBytes = o.optLongOrNull("sizeBytes"),
            completedAt = o.optLong("completedAt")
        )
    }
}
