package com.manga.reader.viewer.pro

import android.content.Context
import android.content.pm.ActivityInfo
import android.os.BatteryManager
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil

/** Cài đặt specs/NativeScreen.ts: khoá xoay màn hình, FLAG_SECURE và mức pin cho dòng trạng thái của reader. */
class NativeScreenModule(reactContext: ReactApplicationContext) : NativeScreenSpec(reactContext) {

  override fun getName() = NAME

  override fun setOrientation(mode: String) {
    val orientation =
        when (mode) {
          "portrait" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
          "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
          else -> ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    UiThreadUtil.runOnUiThread {
      reactApplicationContext.currentActivity?.requestedOrientation = orientation
    }
  }

  override fun setSecure(enabled: Boolean) {
    UiThreadUtil.runOnUiThread {
      val window = reactApplicationContext.currentActivity?.window ?: return@runOnUiThread
      if (enabled) {
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
      } else {
        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
      }
    }
  }

  override fun getBatteryLevel(): Double {
    val level = batteryManager()?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
    return if (level in 0..100) level.toDouble() else -1.0
  }

  override fun isCharging(): Boolean = batteryManager()?.isCharging ?: false

  private fun batteryManager() =
      reactApplicationContext.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager

  companion object {
    const val NAME = "NativeScreen"
  }
}
