import type { AppNavigation, RootStackParamList } from '../../app/routes';
import { sameUrl } from '../../lib/url';

export function backToManga(navigation: AppNavigation, params: RootStackParamList['MangaDetail']): void {
  const state = navigation.getState();
  const below = state.routes[state.index - 1];
  const detail =
    below?.name === 'MangaDetail' ? (below.params as RootStackParamList['MangaDetail'] | undefined) : undefined;
  if (detail && detail.sourceId === params.sourceId && sameUrl(detail.url, params.url)) {
    navigation.goBack();
  } else {
    navigation.replace('MangaDetail', params);
  }
}
