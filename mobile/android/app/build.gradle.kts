plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release signing comes from the environment (GitHub secrets in CI). Without it, release builds fall back to the
// debug key so they can still be installed for testing, but they will not update over a properly signed release.
val keystorePath: String? = System.getenv("SP_KEYSTORE")

android {
    namespace = "com.streampull.app"
    compileSdk = 36

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.streampull.app"
        minSdk = 29
        targetSdk = 36
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    packaging {
        jniLibs {
            // youtubedl-android ships Python and FFmpeg as native libraries that must exist as real files.
            useLegacyPackaging = true
            // Python/FFmpeg are zip files named *.so, not ELF objects: leave them alone instead of failing to strip them.
            keepDebugSymbols += "**/*.zip.so"
        }
    }

    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("SP_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("SP_KEY_ALIAS")
                keyPassword = System.getenv("SP_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (keystorePath != null) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

dependencies {
    implementation("io.github.junkfood02.youtubedl-android:library:0.18.1")
    implementation("io.github.junkfood02.youtubedl-android:ffmpeg:0.18.1")
    implementation("androidx.core:core-ktx:1.16.0")
}

flutter {
    source = "../.."
}
