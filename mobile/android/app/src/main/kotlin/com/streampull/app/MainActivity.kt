package com.streampull.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    private var channel: StreamPullChannel? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        channel = StreamPullChannel(applicationContext, flutterEngine.dartExecutor.binaryMessenger)
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        channel?.dispose()
        channel = null
        super.cleanUpFlutterEngine(flutterEngine)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handle(intent)
        askNotificationPermission()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handle(intent)
    }

    /** "Share → StreamPull" from another app, or a tapped video link. */
    private fun handle(intent: Intent?) {
        val url = when (intent?.action) {
            Intent.ACTION_SEND -> ShareBus.extractUrl(intent.getStringExtra(Intent.EXTRA_TEXT))
            Intent.ACTION_VIEW -> ShareBus.fromViewIntent(intent.data)
            else -> null
        } ?: return
        ShareBus.deliver(url)
        // The same intent must not re-open the link if the activity is recreated.
        intent?.action = Intent.ACTION_MAIN
    }

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7)
        }
    }
}
