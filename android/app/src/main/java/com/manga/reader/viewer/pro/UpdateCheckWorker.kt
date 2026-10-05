package com.manga.reader.viewer.pro

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Việc nền định kỳ: khởi động React (nếu app đang tắt) rồi chạy task JS
 * "CheckLibraryUpdates" — task dùng lại đúng engine của app để kiểm tra chương mới.
 * Chạy trong tiến trình app qua HeadlessJsTaskContext, không cần Service riêng.
 */
class UpdateCheckWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

  override fun doWork(): Result {
    val app = applicationContext as? ReactApplication ?: return Result.failure()
    val finished = CountDownLatch(1)

    UiThreadUtil.runOnUiThread {
      val host = app.reactHost ?: run {
        finished.countDown()
        return@runOnUiThread
      }
      val current = host.currentReactContext
      if (current != null) {
        startTask(current, finished)
      } else {
        host.addReactInstanceEventListener(
            object : ReactInstanceEventListener {
              override fun onReactContextInitialized(context: ReactContext) {
                host.removeReactInstanceEventListener(this)
                startTask(context, finished)
              }
            })
        host.start()
      }
    }

    finished.await(TASK_TIMEOUT_MS + 60_000, TimeUnit.MILLISECONDS)
    return Result.success()
  }

  private fun startTask(context: ReactContext, finished: CountDownLatch) {
    val tasks = HeadlessJsTaskContext.getInstance(context)
    var taskId = -1
    tasks.addTaskEventListener(
        object : HeadlessJsTaskEventListener {
          override fun onHeadlessJsTaskStart(id: Int) = Unit

          override fun onHeadlessJsTaskFinish(id: Int) {
            if (id == taskId) {
              tasks.removeTaskEventListener(this)
              finished.countDown()
            }
          }
        })
    try {
      taskId =
          tasks.startTask(
              HeadlessJsTaskConfig(TASK_NAME, Arguments.createMap(), TASK_TIMEOUT_MS, true))
    } catch (_: Exception) {
      finished.countDown()
    }
  }

  companion object {
    const val TASK_NAME = "CheckLibraryUpdates"
    private const val TASK_TIMEOUT_MS = 5 * 60_000L
  }
}
