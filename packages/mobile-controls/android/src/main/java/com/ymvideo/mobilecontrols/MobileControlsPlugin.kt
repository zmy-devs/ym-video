package com.ymvideo.mobilecontrols

import android.app.Activity
import android.content.pm.ActivityInfo
import android.provider.Settings
import android.view.WindowManager
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

@TauriPlugin
class MobileControlsPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun setStatusBarStyle(invoke: Invoke) {
        val dark = invoke.parseArgs(Boolean::class.java)
        activity.runOnUiThread {
            val window = activity.window
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            controller.isAppearanceLightStatusBars = !dark
            invoke.resolve()
        }
    }

    @Command
    fun setBrightness(invoke: Invoke) {
        val brightness = invoke.parseArgs(Float::class.java).coerceIn(0f, 1f)
        activity.runOnUiThread {
            val attributes = activity.window.attributes
            attributes.screenBrightness = brightness
            activity.window.attributes = attributes
            invoke.resolve()
        }
    }

    @Command
    fun getBrightness(invoke: Invoke) {
        val brightness = activity.window.attributes.screenBrightness
        val current = if (brightness >= 0f) {
            brightness
        } else {
            Settings.System.getInt(
                activity.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS,
                128,
            ) / 255f
        }
        invoke.resolveObject(current.coerceIn(0f, 1f))
    }

    @Command
    fun resetBrightness(invoke: Invoke) {
        activity.runOnUiThread {
            val attributes = activity.window.attributes
            attributes.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
            activity.window.attributes = attributes
            invoke.resolve()
        }
    }

    @Command
    fun setLandscape(invoke: Invoke) {
        val enabled = invoke.parseArgs(Boolean::class.java)
        activity.runOnUiThread {
            activity.requestedOrientation = if (enabled) {
                ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            } else {
                ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            }
            invoke.resolve()
        }
    }

    @Command
    fun setImmersive(invoke: Invoke) {
        val enabled = invoke.parseArgs(Boolean::class.java)
        activity.runOnUiThread {
            val window = activity.window
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            if (enabled) {
                controller.systemBarsBehavior =
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                controller.hide(WindowInsetsCompat.Type.systemBars())
            } else {
                controller.show(WindowInsetsCompat.Type.systemBars())
            }
            invoke.resolve()
        }
    }

    @Command
    fun setKeepScreenOn(invoke: Invoke) {
        val enabled = invoke.parseArgs(Boolean::class.java)
        activity.runOnUiThread {
            if (enabled) {
                activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            invoke.resolve()
        }
    }
}
