import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppNavigation, useAppRoute } from '../../app/routes';
import { ComicCard, SectionTitle, SpeechBubble } from '../../components/comic';
import { Archive, BookOpen, FileText, GalleryVertical, Images, Save, Share2, Upload } from '../../components/icons';
import {
  Button,
  Checkbox,
  Header,
  ProgressBar,
  Screen,
  Segmented,
  SwitchRow,
  TextField,
  confirm,
  toast,
} from '../../components/ui';
import { RNFS, saveToDevice, shareFile } from '../../lib/files';
import { formatBytes } from '../../lib/format';
import { readJSON, writeJSON } from '../../lib/storage';
import { chapterLabel } from '../../model/selectors';
import type { ID } from '../../model/types';
import { useChapters, useProject } from '../../store/hooks';
import { useSettings } from '../../store/useSettings';
import { useStory } from '../../store/useStory';
import { font, space, useTheme } from '../../theme';
import { FORMAT_LABEL, FormatCard, HistoryList, OptionRow, ThumbStrip } from './ExportParts';
import {
  ExportCancelled,
  extraPageCount,
  runExport,
  type ExportFormat,
  type ExportOptions,
  type ExportResult,
} from './runExport';

type Phase =
  | { kind: 'idle' }
  | { kind: 'running'; done: number; total: number }
  | { kind: 'done'; result: ExportResult }
  | { kind: 'error'; message: string };

const FORMATS: { value: ExportFormat; icon: typeof Images; description: string }[] = [
  { value: 'png', icon: Images, description: 'One image per page, packed in a ZIP. Good for social posts.' },
  { value: 'pdf', icon: FileText, description: 'For printing or sending to beta readers.' },
  { value: 'cbz', icon: Archive, description: 'Opens in comic reader apps.' },
  { value: 'long', icon: GalleryVertical, description: 'Stitches pages into a vertical strip for webtoon platforms.' },
];

export function ExportScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const { projectId, chapterId } = useAppRoute<'Export'>().params;
  const project = useProject(projectId);
  const chapters = useChapters(projectId);
  const pages = useStory(s => s.pages);
  const historyKey = `exports:${projectId}`;

  const chapterPages = useMemo(() => {
    const out: Record<ID, ID[]> = {};
    for (const chapter of chapters) {
      out[chapter.id] = chapter.pageIds.filter(id => !!pages[id]);
    }
    return out;
  }, [chapters, pages]);
  const selectable = useMemo(
    () => chapters.filter(ch => chapterPages[ch.id].length > 0).map(ch => ch.id),
    [chapters, chapterPages],
  );

  const [selected, setSelected] = useState<ID[]>(() =>
    chapterId && selectable.includes(chapterId) ? [chapterId] : selectable,
  );
  const [format, setFormat] = useState<ExportFormat>(project?.format === 'webtoon' ? 'long' : 'pdf');
  const [quality, setQuality] = useState<1 | 2>(1);
  const [spread, setSpread] = useState(false);
  const [cover, setCover] = useState(false);
  const [info, setInfo] = useState(false);
  const [penName, setPenName] = useState(() => useSettings.getState().penName);
  const [longWidth, setLongWidth] = useState<800 | 1080>(800);
  const [autoCut, setAutoCut] = useState(true);
  const [gap, setGap] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [history, setHistory] = useState<ExportResult[]>(() => readJSON<ExportResult[]>(historyKey) ?? []);
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const cancelRef = useRef(false);

  useEffect(
    () => () => {
      cancelRef.current = true;
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    Promise.all(history.map(item => RNFS.exists(item.path).catch(() => false))).then(flags => {
      if (alive) {
        const next: Record<string, boolean> = {};
        history.forEach((item, i) => {
          next[item.path] = !flags[i];
        });
        setMissing(next);
      }
    });
    return () => {
      alive = false;
    };
  }, [history]);

  const pageIds = useMemo(
    () => chapters.filter(ch => selected.includes(ch.id)).flatMap(ch => chapterPages[ch.id]),
    [chapters, selected, chapterPages],
  );
  const unfinished = pageIds.filter(id => !pages[id].done).length;
  const withInfo = format === 'pdf' && info;
  const options: ExportOptions = { format, quality, spread, cover, info: withInfo, penName, longWidth, autoCut, gap };
  const totalPages = pageIds.length + extraPageCount(options);
  const running = phase.kind === 'running';
  const allSelected = selectable.length > 0 && selectable.every(id => selected.includes(id));

  const toggle = (id: ID, on: boolean) => setSelected(list => (on ? [...list, id] : list.filter(item => item !== id)));

  const start = async () => {
    if (pageIds.length === 0) {
      toast('Pick at least one chapter');
      return;
    }
    if (unfinished > 0) {
      const ok = await confirm(
        'Export unfinished pages?',
        `${unfinished} ${unfinished === 1 ? 'page is' : 'pages are'} not done and will still be exported.`,
        { confirmText: 'Export anyway' },
      );
      if (!ok) {
        return;
      }
    }
    cancelRef.current = false;
    setPhase({ kind: 'running', done: 0, total: pageIds.length });
    try {
      const result = await runExport(
        projectId,
        pageIds,
        options,
        progress => setPhase({ kind: 'running', ...progress }),
        () => cancelRef.current,
      );
      const next = [result, ...history.filter(item => item.path !== result.path)].slice(0, 5);
      setHistory(next);
      writeJSON(historyKey, next);
      setPhase({ kind: 'done', result });
    } catch (error) {
      if (cancelRef.current || error instanceof ExportCancelled) {
        setPhase({ kind: 'idle' });
        toast('Export cancelled');
      } else {
        setPhase({ kind: 'error', message: error instanceof Error && error.message ? error.message : 'Unknown error' });
      }
    }
  };

  const share = (item: ExportResult) =>
    shareFile(item.path, item.mime, project?.title ?? item.fileName).catch(() => toast("Couldn't share the file"));
  const save = async (item: ExportResult) => {
    try {
      if (await saveToDevice(item.path, item.fileName, item.mime)) {
        toast('Saved to device');
      }
    } catch {
      toast("Couldn't save the file");
    }
  };

  if (!project || selectable.length === 0) {
    return (
      <Screen>
        <Header title="Export" subtitle={project?.title} />
        <View style={styles.empty}>
          <SpeechBubble>
            <Text style={[font.body, { color: c.text }]}>
              {project ? 'Nothing to export yet. Build a storyboard first.' : 'This story no longer exists.'}
            </Text>
          </SpeechBubble>
          <Button
            title={project ? 'Go to story' : 'Go back'}
            icon={BookOpen}
            onPress={() => (project ? navigation.navigate('Project', { projectId }) : navigation.goBack())}
          />
        </View>
      </Screen>
    );
  }

  const state = useStory.getState();
  return (
    <Screen>
      <Header title="Export" subtitle={project.title} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle>Chapters</SectionTitle>
        <ComicCard contentStyle={styles.card}>
          {selectable.length > 1 && (
            <Checkbox checked={allSelected} onChange={on => setSelected(on ? selectable : [])} label="Select all" />
          )}
          {chapters.map(chapter => {
            const ids = chapterPages[chapter.id];
            const notDone = ids.filter(id => !pages[id].done).length;
            if (ids.length === 0) {
              return (
                <View key={chapter.id} style={styles.disabledRow}>
                  <Text style={[font.body, { color: c.muted }]}>{chapterLabel(state, chapter.id)}</Text>
                  <Text style={[font.caption, { color: c.muted }]}>No pages</Text>
                </View>
              );
            }
            return (
              <View key={chapter.id}>
                <Checkbox
                  checked={selected.includes(chapter.id)}
                  onChange={on => toggle(chapter.id, on)}
                  label={chapterLabel(state, chapter.id)}
                />
                <Text style={[font.caption, styles.chapterMeta, { color: notDone ? c.warning : c.textSecondary }]}>
                  {ids.length} {ids.length === 1 ? 'page' : 'pages'}
                  {notDone ? ` · ${notDone} not done` : ''}
                </Text>
              </View>
            );
          })}
        </ComicCard>

        <SectionTitle>Format</SectionTitle>
        <View style={styles.formats}>
          {FORMATS.map(item => (
            <FormatCard
              key={item.value}
              icon={item.icon}
              title={FORMAT_LABEL[item.value]}
              description={item.description}
              selected={format === item.value}
              onPress={() => setFormat(item.value)}
            />
          ))}
        </View>

        <SectionTitle>Options</SectionTitle>
        <ComicCard contentStyle={styles.card}>
          {format === 'long' ? (
            <>
              <OptionRow label="Width">
                <Segmented
                  options={[
                    { value: 800, label: '800 px' },
                    { value: 1080, label: '1080 px' },
                  ]}
                  value={longWidth}
                  onChange={setLongWidth}
                />
              </OptionRow>
              <OptionRow label="Page gap">
                <Segmented
                  options={[
                    { value: 0, label: 'None' },
                    { value: 24, label: 'Small' },
                    { value: 64, label: 'Large' },
                  ]}
                  value={gap}
                  onChange={setGap}
                />
              </OptionRow>
              <SwitchRow
                title="Auto-cut every 4000 px"
                subtitle="Splits between pages so each image stays easy to upload"
                value={autoCut}
                onValueChange={setAutoCut}
              />
            </>
          ) : (
            <>
              <OptionRow label="Quality">
                <Segmented
                  options={[
                    { value: 1, label: '1x · 1200 px' },
                    { value: 2, label: '2x · 2400 px' },
                  ]}
                  value={quality}
                  onChange={setQuality}
                />
              </OptionRow>
              {format === 'pdf' && (
                <OptionRow label="Layout">
                  <Segmented
                    options={[
                      { value: 'single', label: 'Single page' },
                      { value: 'spread', label: 'Spread' },
                    ]}
                    value={spread ? 'spread' : 'single'}
                    onChange={value => setSpread(value === 'spread')}
                  />
                </OptionRow>
              )}
              <SwitchRow
                title="Add cover page"
                subtitle={project.coverUri ? 'Uses the story cover' : 'Builds a title cover from the story name'}
                value={cover}
                onValueChange={setCover}
              />
              {format === 'pdf' && (
                <SwitchRow
                  title="Add info page"
                  subtitle="Title, author and export date"
                  value={info}
                  onValueChange={setInfo}
                />
              )}
              {(cover || withInfo) && (
                <OptionRow label="Author">
                  <TextField value={penName} onChangeText={setPenName} placeholder="Pen name" maxLength={60} />
                </OptionRow>
              )}
            </>
          )}
        </ComicCard>

        <SectionTitle>Preview</SectionTitle>
        <ThumbStrip pageIds={pageIds} />
        <Text style={[font.caption, { color: c.textSecondary }]}>
          {pageIds.length === 0
            ? 'Pick at least one chapter'
            : `${totalPages} ${totalPages === 1 ? 'page' : 'pages'}${unfinished ? ` · ${unfinished} not done` : ''}`}
        </Text>

        {phase.kind === 'running' && (
          <ComicCard contentStyle={styles.card}>
            <Text style={[font.label, { color: c.text }]}>
              Exporting page {Math.min(phase.done + 1, phase.total)}/{phase.total}
            </Text>
            <ProgressBar value={phase.total ? phase.done / phase.total : 0} />
            <Button
              title="Cancel"
              variant="secondary"
              small
              onPress={() => {
                cancelRef.current = true;
              }}
            />
          </ComicCard>
        )}

        {phase.kind === 'done' && (
          <ComicCard contentStyle={styles.card} halftone>
            <Text style={[font.overline, { color: c.success }]}>Export complete</Text>
            <Text style={[font.heading, { color: c.text }]}>{phase.result.fileName}</Text>
            <Text style={[font.caption, { color: c.textSecondary }]}>
              {FORMAT_LABEL[phase.result.format]} · {formatBytes(phase.result.size)}
            </Text>
            <View style={styles.actions}>
              <Button title="Share" icon={Share2} style={styles.flex} onPress={() => share(phase.result)} />
              <Button
                title="Save to device"
                icon={Save}
                variant="secondary"
                style={styles.flex}
                onPress={() => save(phase.result)}
              />
            </View>
          </ComicCard>
        )}

        {phase.kind === 'error' && (
          <ComicCard contentStyle={styles.card} borderColor={c.danger}>
            <Text style={[font.overline, { color: c.danger }]}>Export failed</Text>
            <Text style={[font.body, { color: c.text }]}>{phase.message}</Text>
            <Button title="Try again" variant="secondary" small onPress={start} />
          </ComicCard>
        )}

        {history.length > 0 && (
          <>
            <SectionTitle>Recent exports</SectionTitle>
            <HistoryList items={history} missing={missing} onPress={share} />
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.bg }]}>
        <Button
          title={running ? 'Exporting…' : 'Export file'}
          icon={Upload}
          loading={running}
          disabled={running || pageIds.length === 0}
          onPress={start}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
  card: { padding: space.md, gap: space.sm },
  chapterMeta: { marginLeft: 36 },
  disabledRow: { paddingVertical: space.xs, opacity: 0.6 },
  formats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  footer: { padding: space.lg, borderTopWidth: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
});
