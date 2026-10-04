import Speech, { type EventProps } from '@mhpdev/react-native-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toast } from '../../components/ui';

/**
 * Đọc to chương novel (novelTts): đọc lần lượt từng đoạn, mỗi lần một mẩu
 * không quá giới hạn của engine; báo đoạn đang đọc để tô sáng và cuộn theo.
 */

export type TtsState = 'idle' | 'playing' | 'paused';

export type Tts = {
  state: TtsState;
  /** Đoạn đang đọc; null khi không đọc. */
  index: number | null;
  start: (paragraphs: readonly string[], from: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

export const TTS_UNSUPPORTED = 'Thiết bị không hỗ trợ đọc văn bản';

/** Android thường giới hạn 4000 ký tự mỗi lần; iOS không giới hạn. */
const MAX_CHUNK = 3900;
const chunkLimit = () => Math.max(200, Math.min(Speech.maxInputLength || MAX_CHUNK, MAX_CHUNK));

/** Cắt đoạn văn dài theo câu, câu quá dài thì cắt theo khoảng trắng. */
export function splitForSpeech(text: string, limit: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return [];
  }
  if (clean.length <= limit) {
    return [clean];
  }
  const sentences = clean.match(/[^.!?…。！？]+[.!?…。！？]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  let buffer = '';
  for (const sentence of sentences) {
    if (buffer.length + sentence.length <= limit) {
      buffer += sentence;
      continue;
    }
    if (buffer.trim()) {
      chunks.push(buffer.trim());
    }
    buffer = sentence;
    while (buffer.length > limit) {
      const cut = buffer.lastIndexOf(' ', limit);
      const at = cut > 0 ? cut : limit;
      chunks.push(buffer.slice(0, at).trim());
      buffer = buffer.slice(at);
    }
  }
  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }
  return chunks;
}

export function useTts({
  rate,
  pitch,
  language,
  onChapterEnd,
}: {
  rate: number;
  pitch: number;
  /** Mã ngôn ngữ của nguồn (en, vi…) để chọn giọng phù hợp. */
  language?: string;
  /** Đọc hết chương. Trả về true nếu đang chuyển sang chương sau (sẽ gọi start lại). */
  onChapterEnd: () => boolean;
}): Tts {
  const [state, setStateValue] = useState<TtsState>('idle');
  const [index, setIndex] = useState<number | null>(null);
  const stateRef = useRef<TtsState>('idle');
  const run = useRef({
    paragraphs: [] as readonly string[],
    paragraph: 0,
    chunks: [] as string[],
    chunk: 0,
    /** Mã câu đang đọc do engine trả về. */
    utterance: null as string | null,
    /** Tăng mỗi lần dừng/đọc lại — kết quả của lượt cũ bị bỏ qua. */
    token: 0,
    /** Tạm dừng bằng API của engine (Android 8+); không thì dừng hẳn và đọc lại mẩu hiện tại. */
    nativePaused: false,
    /** Lệnh tạm dừng đang chờ engine trả lời — bấm tiếp tục quá nhanh thì đợi nó xong. */
    pausing: null as Promise<void> | null,
  });
  // Sự kiện xong có thể tới trước khi speak() trả về mã câu.
  const earlyFinished = useRef(new Set<string>());
  const advanceRef = useRef<() => void>(() => {});
  const onChapterEndRef = useRef(onChapterEnd);
  onChapterEndRef.current = onChapterEnd;

  const setState = useCallback((next: TtsState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  const voice = useMemo(() => (language ? { rate, pitch, language } : { rate, pitch }), [rate, pitch, language]);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  useEffect(() => {
    Speech.configure(voice);
  }, [voice]);

  const halt = useCallback(() => {
    const r = run.current;
    r.token += 1;
    r.utterance = null;
    r.nativePaused = false;
    earlyFinished.current.clear();
    Speech.stop().catch(() => {});
  }, []);

  const reset = useCallback(() => {
    halt();
    setState('idle');
    setIndex(null);
  }, [halt, setState]);

  const fail = useCallback(() => {
    reset();
    toast(TTS_UNSUPPORTED);
  }, [reset]);

  const speakCurrent = useCallback(() => {
    const r = run.current;
    const token = r.token;
    r.utterance = null;
    Speech.speak(r.chunks[r.chunk]).then(
      id => {
        if (run.current.token !== token) {
          return;
        }
        run.current.utterance = id;
        if (earlyFinished.current.delete(id)) {
          advanceRef.current();
        }
      },
      () => {
        if (run.current.token === token) {
          fail();
        }
      },
    );
  }, [fail]);

  /** Bắt đầu đọc từ đoạn `from` (bỏ qua đoạn trống). false nếu không còn đoạn nào. */
  const beginParagraph = useCallback(
    (from: number) => {
      const r = run.current;
      const limit = chunkLimit();
      for (let i = Math.max(0, from); i < r.paragraphs.length; i++) {
        const chunks = splitForSpeech(r.paragraphs[i], limit);
        if (chunks.length) {
          r.paragraph = i;
          r.chunks = chunks;
          r.chunk = 0;
          setIndex(i);
          speakCurrent();
          return true;
        }
      }
      return false;
    },
    [speakCurrent],
  );

  const finishChapter = useCallback(() => {
    run.current.utterance = null;
    setIndex(null);
    if (!onChapterEndRef.current()) {
      reset();
    }
  }, [reset]);

  const advance = useCallback(() => {
    const r = run.current;
    r.utterance = null;
    if (r.chunk + 1 < r.chunks.length) {
      r.chunk += 1;
      speakCurrent();
    } else if (!beginParagraph(r.paragraph + 1)) {
      finishChapter();
    }
  }, [speakCurrent, beginParagraph, finishChapter]);
  advanceRef.current = advance;

  useEffect(() => {
    const finished = Speech.onFinish(({ id }: EventProps) => {
      if (stateRef.current !== 'playing') {
        return;
      }
      if (id === run.current.utterance) {
        advanceRef.current();
      } else if (run.current.utterance === null) {
        earlyFinished.current.add(id);
      }
    });
    const failed = Speech.onError(({ id }: EventProps) => {
      if (stateRef.current !== 'idle' && id === run.current.utterance) {
        fail();
      }
    });
    return () => {
      finished.remove();
      failed.remove();
    };
  }, [fail]);

  // Rời màn: dừng đọc.
  useEffect(() => halt, [halt]);

  const start = useCallback(
    (paragraphs: readonly string[], from: number) => {
      halt();
      // Màn khác (nghe thử trong cài đặt) có thể đã đổi cấu hình giọng.
      Speech.configure(voiceRef.current);
      run.current.paragraphs = paragraphs;
      setState('playing');
      if (!beginParagraph(from)) {
        finishChapter();
      }
    },
    [halt, setState, beginParagraph, finishChapter],
  );

  const pause = useCallback(() => {
    if (stateRef.current !== 'playing') {
      return;
    }
    setState('paused');
    const r = run.current;
    const token = r.token;
    const fallback = () => {
      if (r.token !== token) {
        return;
      }
      r.token += 1;
      r.utterance = null;
      Speech.stop().catch(() => {});
    };
    const pausing: Promise<void> = Speech.pause()
      .then(paused => {
        if (paused && r.token === token) {
          r.nativePaused = true;
        } else {
          fallback();
        }
      }, fallback)
      .finally(() => {
        if (r.pausing === pausing) {
          r.pausing = null;
        }
      });
    r.pausing = pausing;
  }, [setState]);

  const resume = useCallback(() => {
    if (stateRef.current !== 'paused') {
      return;
    }
    setState('playing');
    const r = run.current;
    const proceed = () => {
      if (stateRef.current !== 'playing') {
        return;
      }
      if (!r.nativePaused) {
        speakCurrent();
        return;
      }
      r.nativePaused = false;
      const token = r.token;
      const restart = () => {
        if (r.token === token) {
          Speech.stop().catch(() => {});
          speakCurrent();
        }
      };
      Speech.resume().then(resumed => {
        if (!resumed) {
          restart();
        }
      }, restart);
    };
    if (r.pausing) {
      r.pausing.then(proceed);
    } else {
      proceed();
    }
  }, [setState, speakCurrent]);

  const stop = useCallback(() => {
    if (stateRef.current !== 'idle') {
      reset();
    }
  }, [reset]);

  return useMemo(
    () => ({ state, index, start, pause, resume, stop }),
    [state, index, start, pause, resume, stop],
  );
}
