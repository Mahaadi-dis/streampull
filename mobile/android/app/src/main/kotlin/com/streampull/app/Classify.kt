package com.streampull.app

/** Parsing of yt-dlp output for progress and errors (the same rules as lib/core/ytdlp_args.dart). */
object Classify {
    private val social = Regex("(instagram|facebook|tiktok)")
    private val socialLogin = Regex("(unable to extract|login|log in|--cookies|empty media|not available)")
    private val privateRe = Regex(
        "private video|sign in|log ?in|members-only|members only|confirm your age|age-restricted|" +
            "not available in your country|video unavailable|this video is not available"
    )
    private val networkRe = Regex(
        "getaddrinfo|temporary failure|timed out|timeout|connection (reset|refused|aborted)|urlopen error|" +
            "network is unreachable|unable to download (webpage|json)|name or service not known"
    )

    /** Maps yt-dlp's stderr to the UI's error codes (see ErrorCode in src/shared/types.ts). */
    fun error(text: String?): String {
        val t = (text ?: "").lowercase()
        return when {
            "unsupported url" in t -> "unsupported"
            "drm" in t -> "drm"
            social.containsMatchIn(t) && socialLogin.containsMatchIn(t) -> "login_required"
            privateRe.containsMatchIn(t) -> "private"
            networkRe.containsMatchIn(t) -> "network"
            else -> "unknown"
        }
    }

    /** Most useful line of stderr to show the user. */
    fun lastErrorLine(stderr: String?): String? {
        val lines = (stderr ?: "").lines().map { it.trim() }.filter { it.isNotEmpty() }
        return lines.lastOrNull { it.startsWith("ERROR") } ?: lines.lastOrNull()
    }

    /** `watch?v=…&list=…` is a single video, not the whole playlist. */
    fun wantsSingle(url: String): Boolean = Regex("[?&]v=").containsMatchIn(url) && Regex("[?&]list=").containsMatchIn(url)

    private val sizeRe = Regex("""(\d+(?:\.\d+)?)%\s+of\s+~?\s*(\d+(?:\.\d+)?)\s*([KMGT]?i?B)(?:\s+at\s+(\d+(?:\.\d+)?)\s*([KMGT]?i?B)/s)?""")

    class Progress(val totalBytes: Double?, val downloadedBytes: Double?, val speed: Double?)

    /** Parse "[download]  45.2% of 12.34MiB at 1.23MiB/s ETA 00:10" into byte counts. */
    fun progress(line: String): Progress? {
        val m = sizeRe.find(line) ?: return null
        val pct = m.groupValues[1].toDoubleOrNull() ?: return null
        val total = toBytes(m.groupValues[2], m.groupValues[3])
        val speed = if (m.groupValues[4].isNotEmpty()) toBytes(m.groupValues[4], m.groupValues[5]) else null
        return Progress(total, total * pct / 100.0, speed)
    }

    private fun toBytes(num: String, unit: String): Double {
        val n = num.toDoubleOrNull() ?: 0.0
        val k = if (unit.contains("i")) 1024.0 else 1000.0
        return when (unit.firstOrNull()) {
            'K' -> n * k
            'M' -> n * k * k
            'G' -> n * k * k * k
            'T' -> n * k * k * k * k
            else -> n
        }
    }

    /** Lines yt-dlp prints while merging / converting after the download itself. */
    fun isPostprocess(line: String): Boolean =
        line.startsWith("[Merger]") || line.startsWith("[ExtractAudio]") || line.startsWith("[VideoRemuxer]") ||
            line.startsWith("[VideoConvertor]") || line.startsWith("[Fixup") || line.startsWith("[MoveFiles]")
}
