import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';

import { RootNavigator } from '../src/app/navigation';
import type { RootStackParamList } from '../src/app/routes';
import { mangaKey } from '../src/sources';
import { saveDetail } from '../src/sources/cache';
import type { SourceConfig } from '../src/sources/types';
import { useBrowser } from '../src/store/useBrowser';
import { useDownloads } from '../src/store/useDownloads';
import { useHistory } from '../src/store/useHistory';
import { useLibrary } from '../src/store/useLibrary';
import { useSettings } from '../src/store/useSettings';
import { useSources } from '../src/store/useSources';
import { useStats } from '../src/store/useStats';
import { mockFetch } from './helpers/mockFetch';

const BASE = 'https://madara.test';
const MANGA = `${BASE}/manga/solo-hero/`;
const CH1 = `${MANGA}chapter-1/`;
const CH2 = `${MANGA}chapter-2/`;
const NOVEL = `${BASE}/novel/story/`;
const NCH1 = `${NOVEL}chapter-1/`;

const source: SourceConfig = {
  id: 'madara.test',
  engine: 'madara',
  name: 'Madara Test',
  baseUrl: BASE,
  content: 'manga',
  lang: 'en',
  nsfw: false,
  enabled: true,
  addedAt: 1,
};
const novelSource: SourceConfig = { ...source, id: 'novel.test', name: 'Novel Test', content: 'novel' };

const LISTING = `<div class="page-item-detail"><div class="post-title"><h3><a href="${MANGA}">Solo Hero</a></h3></div><img src="${BASE}/c.jpg"></div>`;
const DETAIL = `<div class="post-title"><h1>Solo Hero</h1></div><div class="summary_image"><img src="${BASE}/c.jpg"></div>
  <div class="genres-content"><a href="${BASE}/manga-genre/action/">Action</a></div>
  <ul><li class="wp-manga-chapter"><a href="${CH2}">Chapter 2</a></li><li class="wp-manga-chapter"><a href="${CH1}">Chapter 1</a></li></ul>`;
const CHAPTER = `<div class="reading-content"><div class="page-break"><img src="${BASE}/1.jpg"></div><div class="page-break"><img src="${BASE}/2.jpg"></div></div>`;
const NOVEL_CHAPTER = '<div class="reading-content"><div class="text-left"><p>Một.</p><p>Hai.</p><p>Ba.</p></div></div>';

function seedData() {
  useSources.getState().addSource(source);
  useSources.getState().addSource(novelSource);
  const key = mangaKey(source.id, MANGA);
  saveDetail(key, {
    url: MANGA,
    title: 'Solo Hero',
    cover: `${BASE}/c.jpg`,
    chapters: [
      { url: CH2, name: 'Chapter 2', number: 2 },
      { url: CH1, name: 'Chapter 1', number: 1 },
    ],
  });
  useLibrary.getState().addBookmark({
    key,
    sourceId: source.id,
    url: MANGA,
    title: 'Solo Hero',
    content: 'manga',
    newChapters: 1,
    unread: 2,
  });
  useHistory.getState().addReading({
    key,
    sourceId: source.id,
    mangaUrl: MANGA,
    title: 'Solo Hero',
    content: 'manga',
    chapterUrl: CH1,
    chapterName: 'Chapter 1',
  });
  useHistory.getState().addWeb({ url: 'https://example.com/', title: 'Example' });
  useBrowser.getState().addWebBookmark({ title: 'Example', url: 'https://example.com/' });
  useBrowser.getState().addSavedPage({ title: 'Saved', url: 'https://example.com/', file: '/doc/saved/x.html', size: 10 });
  useDownloads.getState().enqueue(
    { mangaKey: key, sourceId: source.id, mangaUrl: MANGA, mangaTitle: 'Solo Hero', content: 'manga' },
    [{ url: CH1, name: 'Chapter 1' }],
  );
  useStats.getState().addSession(600);
  useStats.getState().addChapterRead();
  useSettings.getState().set({ tourDone: true });
}

type Visit = { [K in keyof RootStackParamList]: [K, RootStackParamList[K]] }[keyof RootStackParamList];

const VISITS: Visit[] = [
  ['Tabs', undefined],
  ['Bookmarks', { tab: 'media' }],
  ['Bookmarks', { tab: 'web' }],
  ['Bookmarks', { tab: 'sites' }],
  ['History', { tab: 'reading' }],
  ['History', { tab: 'web' }],
  ['Downloads', { tab: 'chapters' }],
  ['Downloads', { tab: 'pages' }],
  ['Addons', undefined],
  ['AddSite', { url: BASE }],
  ['SourceSettings', { sourceId: source.id }],
  ['Catalog', { sourceId: source.id }],
  ['Catalog', { sourceId: source.id, query: 'hero' }],
  ['Catalog', { sourceId: source.id, genre: { id: 'action', name: 'Action' } }],
  ['MangaSearch', { query: 'hero' }],
  ['MangaDetail', { sourceId: source.id, url: MANGA }],
  ['Reader', { sourceId: source.id, mangaUrl: MANGA, chapterUrl: CH1 }],
  ['NovelReader', { sourceId: novelSource.id, mangaUrl: NOVEL, chapterUrl: NCH1 }],
  ['ReadingStats', undefined],
  ['Settings', undefined],
  ['ViewerSettings', undefined],
  ['NovelSettings', undefined],
  ['AdblockSettings', undefined],
  ['CustomizeHomepage', undefined],
  ['BackupRestore', undefined],
  ['ClearData', undefined],
  ['About', undefined],
  ['ViewSource', { url: 'https://example.com/' }],
  ['SavedPage', { id: useBrowser.getState().savedPages[0]?.id ?? 'missing' }],
  ['QRScanner', undefined],
  ['Verify', { url: 'https://example.com/' }],
];

async function visitAll(label: string) {
  const errors: unknown[][] = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    if (/error occurred/i.test(String(args[0]))) {
      errors.push(args);
    }
  });
  const navigation = createNavigationContainerRef<RootStackParamList>();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <NavigationContainer ref={navigation}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>,
    );
  });

  for (const [name, params] of VISITS) {
    await ReactTestRenderer.act(async () => {
      (navigation.navigate as (n: string, p?: object) => void)(name, params ?? undefined);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect({ label, screen: name, route: navigation.getCurrentRoute()?.name }).toEqual({
      label,
      screen: name,
      route: name,
    });
    await ReactTestRenderer.act(async () => {
      navigation.goBack();
    });
  }

  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
  spy.mockRestore();
  warnSpy.mockRestore();
  const fatal = errors.filter(args => !/\bact\(/.test(String(args[0])));
  expect(fatal.map(args => String(args[0]).slice(0, 300))).toEqual([]);
}

beforeAll(() => {
  seedData();
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('mọi màn render được khi mạng trả dữ liệu', async () => {
  mockFetch([
    { match: url => url.startsWith(`${BASE}/manga/?`) || url.startsWith(`${BASE}/manga/page`) || url.includes('?s='), body: LISTING },
    { match: url => url.startsWith(`${BASE}/manga-genre/`), body: LISTING },
    { match: url => url.startsWith(CH1), body: CHAPTER },
    { match: url => url.startsWith(NCH1), body: NOVEL_CHAPTER },
    { match: url => url === MANGA, body: DETAIL },
    { match: () => true, body: '<html><head><title>Example</title></head><body></body></html>' },
  ]);
  await visitAll('online');
});

test('mọi màn render được khi mất mạng', async () => {
  (globalThis as any).fetch = jest.fn(async () => {
    throw new TypeError('Network request failed');
  });
  await visitAll('offline');
});
