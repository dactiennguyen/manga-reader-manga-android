/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { BACKGROUND_TASK, runBackgroundUpdateCheck } from './src/features/library/backgroundUpdates';

AppRegistry.registerComponent(appName, () => App);
// Kiểm tra chương mới ở nền (WorkManager → UpdateCheckWorker).
AppRegistry.registerHeadlessTask(BACKGROUND_TASK, () => runBackgroundUpdateCheck);
