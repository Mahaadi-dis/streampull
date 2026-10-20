package com.streampull.app

import android.app.Application

class StreamPullApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SettingsStore.init(this)
        HistoryStore.init(this)
        DownloadQueue.init(this)
        Notifier.ensureChannels(this)
        Engine.init(this)
    }
}
