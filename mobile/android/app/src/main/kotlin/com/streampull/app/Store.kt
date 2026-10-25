package com.streampull.app

import android.content.Context
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/** Atomic-ish JSON file in the app's private storage. */
private class JsonFile(private val file: File) {
    fun read(): String? = try {
        if (file.exists()) file.readText() else null
    } catch (_: Exception) {
        null
    }

    @Synchronized
    fun write(text: String) {
        val tmp = File(file.parentFile, file.name + ".tmp")
        tmp.writeText(text)
        if (!tmp.renameTo(file)) {
            file.writeText(text)
            tmp.delete()
        }
    }
}

/** Mirrors the desktop `Settings` (src/shared/types.ts); the download folder is fixed on Android. */
object SettingsStore {
    private lateinit var file: JsonFile
    private val themes = setOf("violet", "ocean", "emerald", "rose", "sunset", "midnight")
    private val nameTemplates = setOf("title", "uploader-title", "title-id")
    private val rate = Regex("^\\d+(\\.\\d+)?[KMGkmg]?$")
    private val mp3Qualities = setOf("best", "320", "192", "128")

    @Volatile var concurrency = 3; private set
    @Volatile var lang = "ar"; private set
    @Volatile var theme = "violet"; private set
    @Volatile var defaultQuality = "best"; private set
    @Volatile var nameTemplate = "title"; private set
    @Volatile var speedLimit = ""; private set
    @Volatile var notifications = true; private set
    @Volatile var checkUpdates = true; private set
    @Volatile var embedCover = true; private set
    @Volatile var squareCover = true; private set
    @Volatile var embedTags = true; private set
    @Volatile var mp3Quality = "best"; private set
    @Volatile var wifiOnly = false; private set

    const val DOWNLOAD_DIR = "Download/StreamPull"

    fun init(ctx: Context) {
        file = JsonFile(File(ctx.filesDir, "settings.json"))
        file.read()?.let { runCatching { apply(JSONObject(it)) } }
    }

    fun toJson(): JSONObject = JSONObject().apply {
        put("downloadDir", DOWNLOAD_DIR)
        put("concurrency", concurrency)
        put("lang", lang)
        put("theme", theme)
        put("defaultQuality", defaultQuality)
        put("nameTemplate", nameTemplate)
        put("speedLimit", speedLimit)
        put("notifications", notifications)
        put("checkUpdates", checkUpdates)
        put("embedCover", embedCover)
        put("squareCover", squareCover)
        put("embedTags", embedTags)
        put("mp3Quality", mp3Quality)
        put("wifiOnly", wifiOnly)
    }

    /** Validate and merge a partial settings object from the UI. */
    @Synchronized
    fun patch(p: JSONObject): JSONObject {
        apply(p)
        file.write(toJson().toString())
        return toJson()
    }

    private fun apply(p: JSONObject) {
        if (p.has("concurrency")) concurrency = p.optInt("concurrency", concurrency).coerceIn(1, 8)
        p.optString("lang").takeIf { it == "ar" || it == "en" }?.let { lang = it }
        p.optString("theme").takeIf { it in themes }?.let { theme = it }
        if (p.has("defaultQuality")) p.optString("defaultQuality").takeIf { it.isNotEmpty() }?.let { defaultQuality = it }
        p.optString("nameTemplate").takeIf { it in nameTemplates }?.let { nameTemplate = it }
        if (p.has("speedLimit")) p.optString("speedLimit").takeIf { it.isEmpty() || rate.matches(it) }?.let { speedLimit = it }
        if (p.has("notifications")) notifications = p.optBoolean("notifications", notifications)
        if (p.has("checkUpdates")) checkUpdates = p.optBoolean("checkUpdates", checkUpdates)
        if (p.has("embedCover")) embedCover = p.optBoolean("embedCover", embedCover)
        if (p.has("squareCover")) squareCover = p.optBoolean("squareCover", squareCover)
        if (p.has("embedTags")) embedTags = p.optBoolean("embedTags", embedTags)
        p.optString("mp3Quality").takeIf { it in mp3Qualities }?.let { mp3Quality = it }
        if (p.has("wifiOnly")) wifiOnly = p.optBoolean("wifiOnly", wifiOnly)
    }
}

/** Finished downloads, newest first. */
object HistoryStore {
    private lateinit var file: JsonFile
    private lateinit var ctx: Context
    private val items = ArrayList<HistoryItem>()

    @Synchronized
    fun init(context: Context) {
        ctx = context.applicationContext
        file = JsonFile(File(ctx.filesDir, "history.json"))
        file.read()?.let { text ->
            runCatching {
                val arr = JSONArray(text)
                for (i in 0 until arr.length()) items.add(HistoryItem.fromJson(arr.getJSONObject(i)))
            }
        }
    }

    @Synchronized
    fun add(item: HistoryItem) {
        items.removeAll { it.id == item.id }
        items.add(0, item)
        while (items.size > 2000) items.removeAt(items.size - 1)
        save()
    }

    @Synchronized
    fun get(id: String): HistoryItem? = items.firstOrNull { it.id == id }

    @Synchronized
    fun list(): List<JSONObject> = items.sortedByDescending { it.completedAt }.map { it.toJson(MediaSaver.exists(ctx, Uri.parse(it.uri))) }

    @Synchronized
    fun remove(id: String, deleteFile: Boolean) {
        val item = items.firstOrNull { it.id == id } ?: return
        if (deleteFile) MediaSaver.delete(ctx, Uri.parse(item.uri))
        items.remove(item)
        save()
    }

    @Synchronized
    fun clear() {
        items.clear()
        save()
    }

    private fun save() {
        val arr = JSONArray()
        items.forEach { arr.put(it.toJson()) }
        file.write(arr.toString())
    }
}

