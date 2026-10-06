import type { ComponentType, Ref } from 'react';
import WebViewBase, { type WebViewProps } from 'react-native-webview';

export type WebViewRef = WebViewBase<object>;

export const WebView = WebViewBase as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewRef> }>;

export type { WebViewMessageEvent, WebViewNavigation, WebViewProps } from 'react-native-webview';
