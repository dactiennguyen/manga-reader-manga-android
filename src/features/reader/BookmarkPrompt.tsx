import { useMemo, useState } from 'react';
import { create } from 'zustand';

import { Dialog } from '../../components/Sheet';
import { storage } from '../../lib/storage';
import type { MangaDetail, SourceConfig } from '../../sources/types';
import { useLibrary } from '../../store/useLibrary';
import { useSettings } from '../../store/useSettings';
import { BookmarkDialog, type BookmarkTarget } from '../detail/BookmarkDialog';


const PROMPT_AFTER_CHAPTERS = 2;
const neverKey = (key: string) => `bookmarkPrompt:never:${key}`;

const finishedThisSession = new Map<string, number>();

const usePromptState = create<{ key: string | null }>(() => ({ key: null }));

export function noteChapterFinished(key: string): void {
  const count = (finishedThisSession.get(key) ?? 0) + 1;
  finishedThisSession.set(key, count);
  if (
    count === PROMPT_AFTER_CHAPTERS &&
    useSettings.getState().promptBookmark &&
    !useLibrary.getState().bookmarks[key] &&
    !storage.getBoolean(neverKey(key))
  ) {
    usePromptState.setState({ key });
  }
}

export function useBookmarkTarget(
  key: string,
  source: SourceConfig | undefined,
  mangaUrl: string,
  detail: MangaDetail | undefined,
  title: string,
  cover: string | undefined,
): BookmarkTarget | null {
  return useMemo(
    () =>
      source && detail && title
        ? {
            key,
            sourceId: source.id,
            url: mangaUrl,
            title,
            cover,
            content: source.content,
            nsfw: source.nsfw || detail.nsfw,
            chapters: detail.chapters,
          }
        : null,
    [key, source, mangaUrl, detail, title, cover],
  );
}

export function BookmarkPrompt({ target }: { target: BookmarkTarget | null }) {
  const pendingKey = usePromptState(s => s.key);
  const [picking, setPicking] = useState(false);
  const visible = !!target && pendingKey === target.key;

  const dismiss = () => usePromptState.setState({ key: null });

  return (
    <>
      <Dialog
        visible={visible && !picking}
        onClose={dismiss}
        title="Bookmark truyện này?"
        message={
          target
            ? `Bạn đã đọc vài chương của "${target.title}". Bookmark để theo dõi chương mới và đọc tiếp nhanh hơn.`
            : undefined
        }
        actions={[
          {
            label: 'Không hỏi lại',
            variant: 'ghost',
            onPress: () => {
              if (target) {
                storage.set(neverKey(target.key), true);
              }
              dismiss();
            },
          },
          { label: 'Để sau', variant: 'ghost', onPress: dismiss },
          { label: 'Bookmark', variant: 'primary', onPress: () => setPicking(true) },
        ]}
      />
      {target && picking && (
        <BookmarkDialog
          visible
          target={target}
          onClose={() => {
            setPicking(false);
            dismiss();
          }}
        />
      )}
    </>
  );
}
