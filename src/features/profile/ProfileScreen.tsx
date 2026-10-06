import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAppNavigation } from '../../app/routes';
import { ComicCard, Halftone, MenuSheet, PromptDialog } from '../../components/comic';
import {
  Circle,
  CircleCheck,
  Database,
  FolderInput,
  Hand,
  Info,
  Palette,
  Pencil,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Trash,
} from '../../components/icons';
import { Header, IconButton, ListItem, Screen, Section, SwitchRow, toast } from '../../components/ui';
import { dirSize, pickerTypes, pickToCache, removeFile, ROOT_DIR } from '../../lib/files';
import { formatBytes } from '../../lib/format';
import { ARCHIVE_EXTENSION, importProjectArchive } from '../../lib/projectArchive';
import { ART_STYLE_LABEL } from '../../model/constants';
import { initialOf } from '../../model/selectors';
import { useSettings, type CreatorRole, type Handedness, type ThemeMode } from '../../store/useSettings';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';

const PEN_NAME_MAX = 30;

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const HAND_OPTIONS: { value: Handedness; label: string }[] = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
];

const ROLE_NAME: Record<CreatorRole, string> = { write: 'Writing', draw: 'Drawing', both: 'Writing and drawing' };

export function ProfileScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const penName = useSettings(s => s.penName);
  const themeMode = useSettings(s => s.themeMode);
  const handedness = useSettings(s => s.handedness);
  const keepAwake = useSettings(s => s.keepAwakeWhileDrawing);
  const haptics = useSettings(s => s.haptics);
  const preventCapture = useSettings(s => s.preventCapture);
  const role = useSettings(s => s.role);
  const defaultStyle = useSettings(s => s.defaultStyle);
  const set = useSettings(s => s.set);

  const projects = useStory(s => s.projects);
  const chapters = useStory(s => s.chapters);
  const pages = useStory(s => s.pages);
  const characters = useStory(s => s.characters);

  const [menu, setMenu] = useState<'theme' | 'hand' | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [importing, setImporting] = useState(false);
  const [usedBytes, setUsedBytes] = useState<number | null>(null);

  const stats = useMemo(() => {
    const active = new Set<string>();
    let trashed = 0;
    Object.values(projects).forEach(project => {
      if (project.deletedAt) {
        trashed += 1;
      } else {
        active.add(project.id);
      }
    });
    const donePages = Object.values(pages).filter(page => {
      const chapter = chapters[page.chapterId];
      return page.done && !!chapter && active.has(chapter.projectId);
    }).length;
    const characterCount = Object.values(characters).filter(character => active.has(character.projectId)).length;
    return { projectCount: active.size, trashed, donePages, characterCount };
  }, [projects, chapters, pages, characters]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      dirSize(ROOT_DIR)
        .then(size => alive && setUsedBytes(size))
        .catch(() => alive && setUsedBytes(0));
      return () => {
        alive = false;
      };
    }, []),
  );

  const onImport = async () => {
    if (importing) {
      return;
    }
    setImporting(true);
    let cachePath: string | null = null;
    try {
      const picked = await pickToCache(pickerTypes.allFiles);
      if (!picked) {
        return;
      }
      cachePath = picked.path;
      if (!picked.name.toLowerCase().endsWith(`.${ARCHIVE_EXTENSION}`)) {
        toast(`Pick a .${ARCHIVE_EXTENSION} file`);
        return;
      }
      const projectId = await importProjectArchive(picked.path);
      toast('Project imported to your library');
      navigation.navigate('Project', { projectId });
    } catch {
      toast('Could not import this project. The file may be damaged or unsupported.');
    } finally {
      removeFile(cachePath).catch(() => undefined);
      setImporting(false);
    }
  };

  const themeLabel = THEME_OPTIONS.find(option => option.value === themeMode)?.label ?? '';
  const handLabel = HAND_OPTIONS.find(option => option.value === handedness)?.label ?? '';
  const statItems = [
    { value: stats.projectCount, label: 'stories' },
    { value: stats.donePages, label: 'pages done' },
    { value: stats.characterCount, label: 'characters' },
  ];

  return (
    <Screen edges={['top']}>
      <Header title="Profile" hideBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: c.surfaceAlt, borderBottomColor: c.ink }]}>
          <Halftone />
          <View style={[styles.avatar, { backgroundColor: c.accent, borderColor: c.ink }]}>
            <Text style={[font.display, { color: c.onAccent }]}>{initialOf(penName)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[font.caption, { color: c.textSecondary }]}>Pen name</Text>
            <Text numberOfLines={1} style={[font.title, { color: penName ? c.text : c.muted }]}>
              {penName || 'No pen name yet'}
            </Text>
          </View>
          <IconButton icon={Pencil} onPress={() => setEditingName(true)} accessibilityLabel="Edit pen name" />
        </View>

        <View style={styles.stats}>
          {statItems.map(item => (
            <ComicCard key={item.label} shadow={3} style={styles.flex} contentStyle={styles.stat}>
              <Text style={[font.display, { color: c.text }]}>{item.value}</Text>
              <Text numberOfLines={1} style={[font.caption, { color: c.textSecondary }]}>
                {item.label}
              </Text>
            </ComicCard>
          ))}
        </View>

        <Section title="Appearance">
          <ListItem
            icon={Palette}
            title="Theme"
            right={<Text style={[font.body, { color: c.muted }]}>{themeLabel}</Text>}
            chevron
            onPress={() => setMenu('theme')}
          />
          <ListItem
            icon={Hand}
            title="Drawing hand"
            subtitle="Flips the side of the drawing toolbar"
            right={<Text style={[font.body, { color: c.muted }]}>{handLabel}</Text>}
            chevron
            onPress={() => setMenu('hand')}
          />
        </Section>

        <Section title="Writing and drawing">
          <ListItem
            icon={SlidersHorizontal}
            title="Creative preferences"
            subtitle={`${ROLE_NAME[role]} · ${ART_STYLE_LABEL[defaultStyle]}`}
            chevron
            onPress={() => navigation.navigate('Preferences', { edit: true })}
          />
          <SwitchRow
            icon={Sun}
            title="Keep screen on while drawing"
            value={keepAwake}
            onValueChange={value => set({ keepAwakeWhileDrawing: value })}
          />
          <SwitchRow
            icon={Smartphone}
            title="Haptic feedback"
            value={haptics}
            onValueChange={value => set({ haptics: value })}
          />
        </Section>

        <Section title="Privacy and data">
          <SwitchRow
            icon={ShieldCheck}
            title="Block screenshots"
            subtitle="Prevents screenshots and screen recording while the app is open"
            value={preventCapture}
            onValueChange={value => set({ preventCapture: value })}
          />
          <ListItem
            icon={FolderInput}
            title={`Import project (.${ARCHIVE_EXTENSION})`}
            subtitle={importing ? 'Importing…' : 'Add a backed-up story to your library'}
            chevron
            disabled={importing}
            onPress={onImport}
          />
          <ListItem
            icon={Trash}
            title={`Trash (${stats.trashed})`}
            chevron
            onPress={() => navigation.navigate('Trash')}
          />
          <ListItem
            icon={Database}
            title="Storage used"
            right={
              <Text style={[font.body, { color: c.muted }]}>{usedBytes === null ? '…' : formatBytes(usedBytes)}</Text>
            }
          />
        </Section>

        <Section title="More">
          <ListItem icon={Info} title="About" chevron onPress={() => navigation.navigate('About')} />
        </Section>
      </ScrollView>

      <MenuSheet
        visible={menu === 'theme'}
        onClose={() => setMenu(null)}
        title="Theme"
        items={THEME_OPTIONS.map(option => ({
          label: option.label,
          icon: option.value === themeMode ? CircleCheck : Circle,
          onPress: () => set({ themeMode: option.value }),
        }))}
      />
      <MenuSheet
        visible={menu === 'hand'}
        onClose={() => setMenu(null)}
        title="Drawing hand"
        items={HAND_OPTIONS.map(option => ({
          label: option.label,
          icon: option.value === handedness ? CircleCheck : Circle,
          onPress: () => set({ handedness: option.value }),
        }))}
      />
      <PromptDialog
        visible={editingName}
        onClose={() => setEditingName(false)}
        onSubmit={value => {
          set({ penName: value.trim().slice(0, PEN_NAME_MAX) });
          setEditingName(false);
        }}
        title="Pen name"
        message="The author name printed on the credits page when you export."
        initialValue={penName}
        placeholder="Optional"
        maxLength={PEN_NAME_MAX}
        allowEmpty
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: space.xl * 2 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    borderBottomWidth: 2,
    overflow: 'hidden',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  stat: { alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.xs },
});
