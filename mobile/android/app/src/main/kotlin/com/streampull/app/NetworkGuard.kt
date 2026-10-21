package com.streampull.app

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities

/**
 * "Wi-Fi only": tells the queue whether it may use the current connection. A connection counts as Wi-Fi-like when
 * Android does not mark it as metered (Wi-Fi, Ethernet, an unlimited plan the user flagged as unmetered); mobile
 * data and metered hotspots wait. The user can allow mobile data once from the Downloads screen.
 */
object NetworkGuard {
    private var cm: ConnectivityManager? = null

    @Volatile private var unmetered = true
    @Volatile private var override = false

    /** Called (on a background thread) whenever [allowed] may have changed. */
    @Volatile var onChange: () -> Unit = {}

    fun init(ctx: Context) {
        val manager = ctx.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        cm = manager
        unmetered = readUnmetered()
        try {
            manager.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) = refresh()
                override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) = refresh()
                override fun onLost(network: Network) = refresh()
            })
        } catch (_: Exception) {
            // Without the callback the state is only read at start; downloads still work.
        }
    }

    private fun readUnmetered(): Boolean {
        val manager = cm ?: return true
        val caps = manager.getNetworkCapabilities(manager.activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }

    private fun refresh() {
        val now = readUnmetered()
        if (now == unmetered) return
        unmetered = now
        if (now) override = false // back on Wi-Fi: the one-time permission is used up
        onChange()
    }

    /** May downloads run right now? */
    fun allowed(): Boolean = !SettingsStore.wifiOnly || unmetered || override

    /** "Use mobile data now": let the queue run until Wi-Fi comes back. */
    fun allowMobileData() {
        override = true
        onChange()
    }

    /** The setting was switched: forget a previous one-time permission. */
    fun settingChanged() {
        override = false
    }
}
