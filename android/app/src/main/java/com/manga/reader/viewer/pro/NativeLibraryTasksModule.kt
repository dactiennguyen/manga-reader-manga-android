package com.manga.reader.viewer.pro

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.TimeUnit

/** Cài đặt specs/NativeLibraryTasks.ts: lịch kiểm tra chương mới và thông báo. */
class NativeLibraryTasksModule(reactContext: ReactApplicationContext) :
    NativeLibraryTasksSpec(reactContext) {

  override fun getName() = NAME

  private val constraints =
      Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

  override fun scheduleUpdateCheck(intervalHours: Double) {
    val hours = intervalHours.toLong().coerceAtLeast(1)
    val request =
        PeriodicWorkRequestBuilder<UpdateCheckWorker>(hours, TimeUnit.HOURS)
            .setConstraints(constraints)
            .build()
    WorkManager.getInstance(reactApplicationContext)
        .enqueueUniquePeriodicWork(PERIODIC_WORK, ExistingPeriodicWorkPolicy.UPDATE, request)
  }

  override fun cancelUpdateCheck() {
    WorkManager.getInstance(reactApplicationContext).cancelUniqueWork(PERIODIC_WORK)
  }

  override fun runUpdateCheckNow() {
    val request =
        OneTimeWorkRequestBuilder<UpdateCheckWorker>().setConstraints(constraints).build()
    WorkManager.getInstance(reactApplicationContext)
        .enqueueUniqueWork(ONE_TIME_WORK, ExistingWorkPolicy.REPLACE, request)
  }

  override fun showNotification(id: Double, title: String, text: String) {
    showUpdateNotification(reactApplicationContext, id.toInt(), title, text)
  }

  companion object {
    const val NAME = "NativeLibraryTasks"
    private const val PERIODIC_WORK = "library-updates"
    private const val ONE_TIME_WORK = "library-updates-now"
    private const val CHANNEL_ID = "library_updates"

    fun showUpdateNotification(context: Context, id: Int, title: String, text: String) {
      val manager = NotificationManagerCompat.from(context)
      if (!manager.areNotificationsEnabled()) {
        return
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel =
            NotificationChannel(CHANNEL_ID, "Chương mới", NotificationManager.IMPORTANCE_DEFAULT)
        channel.description = "Báo khi truyện đã bookmark có chương mới"
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
      }
      val launch =
          context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
          }
      val pending =
          launch?.let {
            PendingIntent.getActivity(
                context,
                id,
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
          }
      val notification =
          NotificationCompat.Builder(context, CHANNEL_ID)
              .setSmallIcon(R.drawable.ic_stat_book)
              .setContentTitle(title)
              .setContentText(text)
              .setStyle(NotificationCompat.BigTextStyle().bigText(text))
              .setContentIntent(pending)
              .setAutoCancel(true)
              .build()
      try {
        manager.notify(id, notification)
      } catch (_: SecurityException) {
        // Chưa được cấp quyền thông báo (Android 13+).
      }
    }
  }
}
