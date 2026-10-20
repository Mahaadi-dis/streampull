package com.streampull.app

import android.net.Uri

/**
 * Hands a link to the UI: shared from another app ("Share → StreamPull"). The link is kept until the UI takes it,
 * so nothing is lost if the UI is not ready yet.
 */
object ShareBus {
    class Link(val url: String)

    @Volatile private var pending: Link? = null

    /** Set by the channel; tells the UI that a link is waiting. */
    @Volatile var listener: (() -> Unit)? = null

    fun deliver(url: String) {
        pending = Link(url)
        listener?.invoke()
    }

    fun take(): Link? {
        val p = pending
        pending = null
        return p
    }

    private val urlRe = Regex("https?://[^\\s<>\"']+")

    /** First http(s) link inside shared text (apps usually share "Title https://…"). */
    fun extractUrl(text: String?): String? {
        val m = urlRe.find(text ?: return null) ?: return null
        return m.value.trimEnd('.', ',', ')', ']', '!', '?')
    }

    fun fromViewIntent(data: Uri?): String? =
        data?.takeIf { it.scheme == "http" || it.scheme == "https" }?.toString()
}
