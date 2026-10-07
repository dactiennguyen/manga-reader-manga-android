import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { create } from 'zustand';

import { useAppNavigation } from '../../app/routes';
import { AiErrorBox, AiLoading, AiNote, AiPanel } from '../../components/ai';
import { PromptDialog } from '../../components/comic';
import { Check, Languages, Pencil, Plus, Sparkles, Trash2 } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Button, IconButton, ListItem, Segmented, TextField, confirm, toast } from '../../components/ui';
import { hitTestPanel, type PanelShape } from '../../engine/layout';
import { bubbleCenter } from '../../engine/lettering';
import { buildPageContext } from '../../engine/page';
import {
  LANGUAGE_NAME_MAX,
  MAX_LANGUAGES,
  hasTranslation,
  languageNameError,
  setTranslation,
  translatableBubbles,
  translationProgress,
} from '../../engine/translation';
import { useAiConfigured } from '../../lib/ai/client';
import { storyBrief } from '../../lib/ai/context';
import { translateLines } from '../../lib/ai/translate';
import { useAiTask } from '../../lib/ai/useAiTask';
import { plural } from '../../lib/format';
import { BUBBLE_TYPE_LABEL } from '../../model/constants';
import type { Bubble, Chapter, ID, Project } from '../../model/types';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';

type ActiveLanguageState = {
  byProject: Record<ID, string | null>;
  setLanguage: (projectId: ID, lang: string | null) => void;
};

const useActiveLanguageStore = create<ActiveLanguageState>(set => ({
  byProject: {},
  setLanguage: (projectId, lang) => set(state => ({ byProject: { ...state.byProject, [projectId]: lang } })),
}));

export function useActiveLanguage(project: Project | undefined): [string | null, (lang: string | null) => void] {
  const stored = useActiveLanguageStore(s => (project ? s.byProject[project.id] ?? null : null));
  const lang = stored && project?.languages?.includes(stored) ? stored : null;
  const projectId = project?.id;
  const setLang = (next: string | null) => {
    if (projectId) {
      useActiveLanguageStore.getState().setLanguage(projectId, next);
    }
  };
  return [lang, setLang];
}

export function readingOrder(bubbles: Bubble[], shapes: PanelShape[], rtl: boolean): Bubble[] {
  const rank = (bubble: Bubble) => {
    const id = hitTestPanel(shapes, bubbleCenter(bubble));
    const index = shapes.findIndex(shape => shape.id === id);
    return index < 0 ? shapes.length : index;
  };
  return [...bubbles].sort((a, b) => rank(a) - rank(b) || a.y - b.y || (rtl ? b.x - a.x : a.x - b.x));
}

export function progressLabel(bubbles: Bubble[], lang: string): string {
  const { done, total } = translationProgress(bubbles, lang);
  return total ? `${done} of ${total} translated` : 'Nothing to translate';
}

export function ManageLanguagesSheet({
  visible,
  onClose,
  project,
  onAdded,
  onRenamed,
}: {
  visible: boolean;
  onClose: () => void;
  project: Project;
  onAdded?: (lang: string) => void;
  onRenamed?: (from: string, to: string) => void;
}) {
  const { c } = useTheme();
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const languages = project.languages ?? [];
  const full = languages.length >= MAX_LANGUAGES;

  const add = (name: string) => {
    const error = languageNameError(languages, name);
    const added = error ? null : useStory.getState().addLanguage(project.id, name);
    if (!added) {
      toast(error ?? 'Could not add that language');
      return;
    }
    onAdded?.(added);
  };

  const rename = (from: string, name: string) => {
    const error = languageNameError(languages, name, from);
    const renamed = error ? null : useStory.getState().renameLanguage(project.id, from, name);
    if (!renamed) {
      toast(error ?? 'Could not rename that language');
      return;
    }
    onRenamed?.(from, renamed);
  };

  const remove = async (name: string) => {
    const ok = await confirm(
      `Remove ${name}?`,
      `Every ${name} translation in this story will be deleted. The original text and the art are kept.`,
      { confirmText: 'Remove', destructive: true },
    );
    if (ok) {
      useStory.getState().removeLanguage(project.id, name);
    }
  };

  return (
    <>
      <Sheet visible={visible} onClose={onClose} title="Languages" subtitle="The art is shared. Only the text changes.">
        <ListItem title="Original" subtitle="The text you wrote first" icon={Languages} />
        {languages.map(name => (
          <ListItem
            key={name}
            title={name}
            icon={Languages}
            right={
              <View style={styles.actions}>
                <IconButton icon={Pencil} size={18} onPress={() => setRenaming(name)} accessibilityLabel="Rename" />
                <IconButton
                  icon={Trash2}
                  size={18}
                  color={c.danger}
                  onPress={() => remove(name)}
                  accessibilityLabel="Remove"
                />
              </View>
            }
          />
        ))}
        <View style={styles.body}>
          <Button title="Add language" icon={Plus} disabled={full} onPress={() => setAdding(true)} />
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            {full
              ? `A story can have up to ${MAX_LANGUAGES} extra languages.`
              : 'Translations are typed by hand, one bubble at a time or from the translation list.'}
          </Text>
        </View>
      </Sheet>
      <PromptDialog
        visible={adding}
        onClose={() => setAdding(false)}
        onSubmit={add}
        title="Add language"
        placeholder="For example: Vietnamese"
        confirmText="Add"
        maxLength={LANGUAGE_NAME_MAX}
      />
      <PromptDialog
        visible={!!renaming}
        onClose={() => setRenaming(null)}
        onSubmit={name => renaming && rename(renaming, name)}
        title="Rename language"
        initialValue={renaming ?? ''}
        maxLength={LANGUAGE_NAME_MAX}
      />
    </>
  );
}

type Section = { pageId: ID; number: number; bubbles: Bubble[] };

type TranslateMode = 'missing' | 'all';

export type Proposal = { pageId: ID; bubbleId: ID; original: string; text: string };

export function translationTargets(
  sections: { pageId: ID; bubbles: Pick<Bubble, 'id' | 'text' | 'translations'>[] }[],
  lang: string,
  mode: TranslateMode,
): Omit<Proposal, 'text'>[] {
  return sections.flatMap(section =>
    section.bubbles
      .filter(bubble => bubble.text.trim() !== '' && (mode === 'all' || !hasTranslation(bubble, lang)))
      .map(bubble => ({ pageId: section.pageId, bubbleId: bubble.id, original: bubble.text.trim() })),
  );
}

export function groupProposals(
  proposals: Proposal[],
  currentPageId: ID,
): { current: Record<ID, string>; others: Record<ID, Record<ID, string>> } {
  const current: Record<ID, string> = {};
  const others: Record<ID, Record<ID, string>> = {};
  proposals.forEach(item => {
    const text = item.text.trim();
    if (!text) {
      return;
    }
    if (item.pageId === currentPageId) {
      current[item.bubbleId] = text;
    } else {
      (others[item.pageId] ??= {})[item.bubbleId] = text;
    }
  });
  return { current, others };
}

export function TranslationSheet({
  visible,
  onClose,
  lang,
  project,
  chapter,
  pageId,
  onChangeCurrent,
  onApplyCurrent,
}: {
  visible: boolean;
  onClose: () => void;
  lang: string;
  project: Project;
  chapter: Chapter | undefined;
  pageId: ID;
  onChangeCurrent: (bubbleId: ID, text: string) => void;
  onApplyCurrent?: (entries: Record<ID, string>) => void;
}) {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const configured = useAiConfigured();
  const [scope, setScope] = useState<'page' | 'chapter'>('page');
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [busyCount, setBusyCount] = useState(0);
  const { state: ai, start, cancel, reset } = useAiTask<string[]>();
  const lastMode = useRef<TranslateMode>('missing');
  const pages = useStory(s => s.pages);
  const shown = useRef(new Set<ID>());
  useEffect(() => {
    if (!visible) {
      cancel();
      setProposals(null);
    }
  }, [visible, cancel]);
  const sections = useMemo<Section[]>(() => {
    if (!visible) {
      shown.current.clear();
      return [];
    }
    const ids = scope === 'chapter' && chapter ? chapter.pageIds : [pageId];
    return ids.flatMap(id => {
      const page = pages[id];
      if (!page) {
        return [];
      }
      const ctx = buildPageContext(page, project);
      const ordered = readingOrder(page.bubbles, ctx.shapes, ctx.rtl);
      const listed = new Set(translatableBubbles(ordered, lang).map(bubble => bubble.id));
      listed.forEach(bubbleId => shown.current.add(bubbleId));
      const bubbles = ordered.filter(bubble => listed.has(bubble.id) || shown.current.has(bubble.id));
      return [{ pageId: id, number: chapter ? chapter.pageIds.indexOf(id) + 1 : 1, bubbles }];
    });
  }, [visible, scope, chapter, pageId, pages, project, lang]);
  const all = sections.flatMap(section => section.bubbles);
  const missing = translationTargets(sections, lang, 'missing').length;
  const translatable = translationTargets(sections, lang, 'all').length;

  const change = (section: Section, bubbleId: ID, text: string) => {
    if (section.pageId === pageId) {
      onChangeCurrent(bubbleId, text);
      return;
    }
    const page = useStory.getState().pages[section.pageId];
    if (page) {
      useStory.getState().updatePage(section.pageId, {
        bubbles: page.bubbles.map(bubble => (bubble.id === bubbleId ? setTranslation(bubble, lang, text) : bubble)),
      });
    }
  };

  const translate = (mode: TranslateMode) => {
    const items = translationTargets(sections, lang, mode);
    if (!items.length) {
      toast(mode === 'missing' ? 'Every bubble here is already translated' : 'Nothing to translate');
      return;
    }
    lastMode.current = mode;
    setBusyCount(items.length);
    const brief = storyBrief(useStory.getState(), project.id, { chapterId: chapter?.id }).text;
    start(signal =>
      translateLines(
        items.map(item => item.original),
        lang,
        brief,
        signal,
      ),
    ).then(lines => {
      if (lines) {
        setProposals(items.map((item, index) => ({ ...item, text: lines[index] ?? '' })));
        reset();
      }
    });
  };

  const editProposal = (index: number, text: string) =>
    setProposals(list => (list ? list.map((item, i) => (i === index ? { ...item, text } : item)) : list));

  const apply = () => {
    if (!proposals) {
      return;
    }
    const { current, others } = groupProposals(proposals, pageId);
    const currentIds = Object.keys(current);
    if (currentIds.length) {
      if (onApplyCurrent) {
        onApplyCurrent(current);
      } else {
        currentIds.forEach(id => onChangeCurrent(id, current[id]));
      }
    }
    const store = useStory.getState();
    Object.entries(others).forEach(([otherPageId, entries]) => {
      const page = store.pages[otherPageId];
      if (page) {
        store.updatePage(otherPageId, {
          bubbles: page.bubbles.map(bubble =>
            entries[bubble.id] !== undefined ? setTranslation(bubble, lang, entries[bubble.id]) : bubble,
          ),
        });
      }
    });
    const count =
      currentIds.length + Object.values(others).reduce((sum, entries) => sum + Object.keys(entries).length, 0);
    setProposals(null);
    toast(count ? `Applied ${plural(count, 'translation')}` : 'Nothing to apply');
  };

  const openProfile = () => {
    onClose();
    navigation.navigate('Tabs', { screen: 'Profile' });
  };

  const pageNumber = (id: ID) => sections.find(section => section.pageId === id)?.number ?? 1;

  const renderAi = () => {
    if (translatable === 0) {
      return null;
    }
    if (!configured) {
      return (
        <View style={styles.aiRow}>
          <AiNote text="Translate with AI" />
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            Set the AI server address in Profile to translate bubbles automatically.
          </Text>
          <Button title="Open Profile" variant="secondary" small onPress={openProfile} />
        </View>
      );
    }
    if (ai.status === 'loading') {
      return <AiLoading label={`Translating ${plural(busyCount, 'bubble')} into ${lang}…`} onCancel={cancel} />;
    }
    if (ai.status === 'error') {
      return <AiErrorBox message={ai.message} onRetry={() => translate(lastMode.current)} onDismiss={reset} />;
    }
    return (
      <View style={styles.aiRow}>
        <Button
          title={missing ? `Translate missing with AI (${missing})` : 'Translate missing with AI'}
          icon={Sparkles}
          variant="ai"
          disabled={missing === 0}
          onPress={() => translate('missing')}
        />
        <Button
          title={`Translate all (${translatable})`}
          variant="ghost"
          small
          onPress={() => translate('all')}
          style={styles.center}
        />
      </View>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={`Translate to ${lang}`} subtitle={progressLabel(all, lang)}>
      <View style={styles.body}>
        {!!chapter && chapter.pageIds.length > 1 && !proposals && (
          <Segmented
            options={[
              { value: 'page', label: 'This page' },
              { value: 'chapter', label: 'Whole chapter' },
            ]}
            value={scope}
            onChange={setScope}
          />
        )}
        {all.length === 0 && (
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            There is no text to translate here yet. Add bubbles first.
          </Text>
        )}
        {proposals ? (
          <AiPanel title={`${plural(proposals.length, 'proposed translation')}`}>
            <Text style={[styles.hint, styles.left, { color: c.textSecondary }]}>
              Edit anything below. Nothing is written to the page until you apply.
            </Text>
            {proposals.map((item, index) => (
              <View key={item.bubbleId} style={[styles.row, { borderColor: c.ai, backgroundColor: c.surface }]}>
                <Text style={[styles.rowLabel, { color: c.textSecondary }]}>
                  {scope === 'chapter' ? `Page ${pageNumber(item.pageId)} · ${index + 1}` : `${index + 1}`}
                </Text>
                <Text style={[styles.original, { color: c.text }]}>{item.original}</Text>
                <TextField
                  multiline
                  value={item.text}
                  placeholder={`${lang} text`}
                  onChangeText={text => editProposal(index, text)}
                />
              </View>
            ))}
            <Button title="Apply" icon={Check} variant="ai" onPress={apply} />
            <Button title="Discard" variant="ghost" onPress={() => setProposals(null)} />
          </AiPanel>
        ) : (
          renderAi()
        )}
        {!proposals &&
          sections.map(section => (
            <View key={section.pageId} style={styles.section}>
              {scope === 'chapter' && section.bubbles.length > 0 && (
                <Text style={[styles.sectionTitle, { color: c.text }]}>{`Page ${section.number}`}</Text>
              )}
              {section.bubbles.map((bubble, index) => (
                <View key={bubble.id} style={[styles.row, { borderColor: c.ink, backgroundColor: c.surface }]}>
                  <View style={styles.rowHead}>
                    <View
                      style={[
                        styles.dot,
                        { borderColor: c.ink, backgroundColor: hasTranslation(bubble, lang) ? c.success : c.warning },
                      ]}
                    />
                    <Text style={[styles.rowLabel, { color: c.textSecondary }]}>
                      {`${index + 1} · ${BUBBLE_TYPE_LABEL[bubble.type]}`}
                    </Text>
                  </View>
                  <Text style={[styles.original, { color: c.text }]}>{bubble.text.trim() || '(no original text)'}</Text>
                  <TextField
                    multiline
                    value={bubble.translations?.[lang] ?? ''}
                    placeholder={`${lang} text`}
                    onChangeText={text => change(section, bubble.id, text)}
                  />
                </View>
              ))}
            </View>
          ))}
        <Button title="Done" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center' },
  body: { padding: space.lg, gap: space.md },
  hint: { ...font.caption, textAlign: 'center' },
  left: { textAlign: 'left' },
  center: { alignSelf: 'center' },
  aiRow: { gap: space.sm, alignItems: 'stretch' },
  section: { gap: space.sm },
  sectionTitle: { ...font.label },
  row: { borderWidth: 2, borderRadius: radius.md, padding: space.md, gap: space.sm },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowLabel: { ...font.caption },
  original: { ...font.body },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
});
