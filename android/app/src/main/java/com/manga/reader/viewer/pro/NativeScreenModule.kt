package com.manga.reader.viewer.pro

import android.content.pm.ActivityInfo
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil

/** Cài đặt specs/NativeScreen.ts: khoá xoay màn hình và FLAG_SECURE cho Activity hiện tại. */
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

  companion object {
    const val NAME = "NativeScreen"
  }
}
