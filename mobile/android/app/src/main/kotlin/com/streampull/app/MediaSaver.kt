package com.streampull.app

import android.content.ActivityNotFoundException
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import java.io.File

/** Saves finished downloads into the public Downloads/StreamPull folder (scoped storage, no permission needed). */
object MediaSaver {
    class Saved(val uri: Uri, val displayPath: String)

    fun mimeFor(name: String): String {
        val ext = name.substringAfterLast('.', "").lowercase()
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: when (ext) {
            "mkv" -> "video/x-matroska"
            "opus" -> "audio/opus"
            else -> "application/octet-stream"
        }
    }

    fun save(ctx: Context, file: File, displayName: String): Saved {
        val resolver = ctx.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, displayName)
            put(MediaStore.MediaColumns.MIME_TYPE, mimeFor(displayName))
            put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/StreamPull")
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw IllegalStateException("MediaStore insert failed")
        try {
            resolver.openOutputStream(uri)?.use { out -> file.inputStream().use { it.copyTo(out) } }
                ?: throw IllegalStateException("cannot open output stream")
            values.clear()
            values.put(MediaStore.MediaColumns.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
        } catch (e: Exception) {
            resolver.delete(uri, null, null)
            throw e
        }
        // MediaStore may have renamed the file to avoid a clash ("name (1).mp4").
        val finalName = resolver.query(uri, arrayOf(MediaStore.MediaColumns.DISPLAY_NAME), null, null, null)?.use {
            if (it.moveToFirst()) it.getString(0) else null
        } ?: displayName
        return Saved(uri, "${SettingsStore.DOWNLOAD_DIR}/$finalName")
    }

    fun exists(ctx: Context, uri: Uri): Boolean = try {
        ctx.contentResolver.query(uri, arrayOf(MediaStore.MediaColumns._ID), null, null, null)?.use { it.count > 0 } ?: false
    } catch (_: Exception) {
        false
    }

    fun delete(ctx: Context, uri: Uri) {
        try {
            ctx.contentResolver.delete(uri, null, null)
        } catch (_: Exception) {
        }
    }

    fun open(ctx: Context, uri: Uri, name: String): Boolean {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, mimeFor(name))
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return try {
            ctx.startActivity(intent)
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }

    /** Open the system Downloads app. */
    fun showDownloads(ctx: Context) {
        try {
            ctx.startActivity(Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) {
        }
    }
}
