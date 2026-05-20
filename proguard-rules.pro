# ── Transport Manager — ProGuard / R8 Rules ──────────────────────────────────
# Copy this file to android/app/proguard-rules.pro after running: npx cap add android
# Also set minifyEnabled true in android/app/build.gradle (see APK_BUILD_GUIDE.md)

# Keep Capacitor bridge intact
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Android components
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver

# Remove all logging
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}

# Obfuscate everything else aggressively
-repackageclasses ''
-allowaccessmodification
-optimizationpasses 5
