import type { ComponentType, Ref } from 'react';
import WebViewBase, { type WebViewProps } from 'react-native-webview';

/** Instance của WebView (reload, goBack, injectJavaScript…). */
export type WebViewRef = WebViewBase<object>;

/**
 * Khai báo class của react-native-webview 14 có props mặc định
 * `WebViewProps & undefined` (= never) nên không dùng trực tiếp trong JSX
 * được với React 19; gán lại kiểu đúng cho component.
 */
export const WebView = WebViewBase as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewRef> }>;

export type { WebViewMessageEvent, WebViewNavigation, WebViewProps } from 'react-native-webview';
