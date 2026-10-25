package com.streampull.app

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.util.Log

/**
 * "Wi-Fi only": tells the queue whether it may use the current connection. The decision follows the connection's
 * transport — Wi-Fi and Ethernet are allowed, mobile data is not — and does not depend on Android's "metered" flag:
 * some carriers mark unlimited mobile data as unmetered, and a Wi-Fi network can be marked metered by the user, and
 * neither should change what "Wi-Fi only" means. With no connection at all nothing runs. The user can allow mobile
 * data once from the Downloads screen.
 */
object NetworkGuard {
    private const val TAG = "StreamPullNet"

    private var cm: ConnectivityManager? = null

    /** The default network is Wi-Fi / Ethernet (or something else that is not mobile data). */
    @Volatile private var onWifi = true
    @Volatile private var override = false

    /** Called (on a background thread) whenever [allowed] may have changed. */
    @Volatile var onChange: () -> Unit = {}

    /** True for Wi-Fi and Ethernet, false for mobile data and for no connection. */
    internal fun isWifiLike(caps: NetworkCapabilities?): Boolean {
        if (caps == null) return false
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) return false
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) return true
        // Something else (an old-style VPN that does not report what it runs over …): trust the metered flag.
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }

    fun init(ctx: Context) {
        val manager = ctx.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        cm = manager
        onWifi = isWifiLike(manager.getNetworkCapabilities(manager.activeNetwork))
        Log.i(TAG, "start: wifi=" + onWifi)
        try {
            manager.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
                override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) = set(isWifiLike(caps))
                override fun onLost(network: Network) = set(false)
            })
        } catch (e: Exception) {
            Log.w(TAG, "no network callback: " + e.message)
        }
    }

    private fun set(wifi: Boolean) {
        if (wifi == onWifi) return
        onWifi = wifi
        if (wifi) override = false // back on Wi-Fi: the one-time permission is used up
        Log.i(TAG, "wifi=" + wifi + " allowed=" + allowed())
        onChange()
    }

    /** May downloads run right now? */
    fun allowed(): Boolean = !SettingsStore.wifiOnly || onWifi || override

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
