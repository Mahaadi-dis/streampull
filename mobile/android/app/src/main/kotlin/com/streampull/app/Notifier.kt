package com.streampull.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

object Notifier {
    const val CH_PROGRESS = "downloads"
    const val CH_DONE = "completed"
    const val ID_PROGRESS = 1001

    fun ensureChannels(ctx: Context) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CH_PROGRESS, ctx.getString(R.string.channel_downloads), NotificationManager.IMPORTANCE_LOW)
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_DONE, ctx.getString(R.string.channel_completed), NotificationManager.IMPORTANCE_DEFAULT)
        )
    }

    private fun canNotify(ctx: Context): Boolean =
        Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    private fun openApp(ctx: Context): PendingIntent = PendingIntent.getActivity(
        ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    fun progress(ctx: Context, count: Int, title: String, percent: Int): Notification =
        NotificationCompat.Builder(ctx, CH_PROGRESS)
            .setSmallIcon(R.drawable.ic_stat_download)
            .setContentTitle(ctx.getString(R.string.notif_downloading, count))
            .setContentText(title)
            .setProgress(100, percent.coerceIn(0, 100), percent <= 0)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openApp(ctx))
            .build()

    @SuppressLint("MissingPermission")
    fun done(ctx: Context, item: QueueItem) {
        if (!canNotify(ctx)) return
        val uri = item.fileUri?.let { Uri.parse(it) }
        val open: PendingIntent = if (uri != null) {
            val name = item.filePath?.substringAfterLast('/') ?: "file"
            PendingIntent.getActivity(
                ctx, item.id.hashCode(),
                Intent(Intent.ACTION_VIEW).setDataAndType(uri, MediaSaver.mimeFor(name))
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        } else openApp(ctx)
        val n = NotificationCompat.Builder(ctx, CH_DONE)
            .setSmallIcon(R.drawable.ic_stat_download)
            .setContentTitle(ctx.getString(R.string.notif_done))
            .setContentText(item.title)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        NotificationManagerCompat.from(ctx).notify(item.id.hashCode(), n)
    }
}

/** Keeps the process alive while downloads run (Android kills idle background processes). */
class DownloadService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Notifier.ensureChannels(this)
        val n = Notifier.progress(this, intent?.getIntExtra("count", 1) ?: 1, intent?.getStringExtra("title") ?: "", intent?.getIntExtra("percent", 0) ?: 0)
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(Notifier.ID_PROGRESS, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(Notifier.ID_PROGRESS, n)
        }
        return START_NOT_STICKY
    }

    companion object {
        /** Start the service, or refresh its notification when it is already running. */
        @SuppressLint("MissingPermission")
        fun show(ctx: Context, count: Int, title: String, percent: Int) {
            val intent = Intent(ctx, DownloadService::class.java)
                .putExtra("count", count).putExtra("title", title).putExtra("percent", percent)
            try {
                ContextCompat.startForegroundService(ctx, intent)
            } catch (_: Exception) {
                // Not allowed to start from the background right now; downloads keep running while the app is alive.
            }
        }

        fun stop(ctx: Context) {
            ctx.stopService(Intent(ctx, DownloadService::class.java))
        }
    }
}
