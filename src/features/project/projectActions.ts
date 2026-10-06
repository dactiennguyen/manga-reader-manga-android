import type { AppNavigation } from '../../app/routes';
import { confirm, snackbar, toast } from '../../components/ui';
import {
  MIME,
  RNFS,
  copyIntoImages,
  fileUri,
  pickImage,
  removeFile,
  shareFile,
  stripFileScheme,
} from '../../lib/files';
import { buildProjectBundle, exportProjectArchive, mapBundleImages } from '../../lib/projectArchive';
import { chapterNumber, pageNumber } from '../../model/selectors';
import type { ID, Project } from '../../model/types';
import { useStory, type StoryData } from '../../store/useStory';

export async function changeProjectCover(projectId: ID): Promise<void> {
  try {
    const path = await pickImage();
    if (!path) {
      return;
    }
    const previous = useStory.getState().projects[projectId]?.coverUri;
    useStory.getState().updateProject(projectId, { coverUri: path });
    if (previous && previous !== path) {
      removeFile(previous).catch(() => undefined);
    }
    toast('Cover changed');
  } catch {
    toast('Could not open this image');
  }
}

export async function exportProjectFile(projectId: ID): Promise<void> {
  const title = useStory.getState().projects[projectId]?.title || 'Story';
  try {
    toast('Packing project…');
    const path = await exportProjectArchive(projectId);
    await shareFile(path, MIME.mangaka, `${title} project`);
  } catch {
    toast('Could not export the project. Try again later');
  }
}

export async function trashProjectWithConfirm(project: Project): Promise<boolean> {
  const ok = await confirm(
    `Delete "${project.title || 'Untitled'}"?`,
    'The story stays in Trash for 30 days and can be restored during that time.',
    { confirmText: 'Delete', destructive: true },
  );
  if (!ok) {
    return false;
  }
  useStory.getState().trashProject(project.id);
  snackbar({
    message: 'Moved to trash',
    actionLabel: 'Undo',
    onAction: () => useStory.getState().restoreProject(project.id),
  });
  return true;
}

async function copyProjectImages(projectId: ID): Promise<Map<string, string>> {
  const copied = new Map<string, string>();
  const bundle = buildProjectBundle(projectId);
  if (!bundle) {
    return copied;
  }
  const paths = new Set<string>();
  mapBundleImages(bundle, path => {
    paths.add(path);
    return path;
  });
  for (const path of paths) {
    try {
      const source = stripFileScheme(path);
      if (await RNFS.exists(source)) {
        const dest = await copyIntoImages(source);
        copied.set(path, path.startsWith('file://') ? fileUri(dest) : dest);
      }
    } catch {
      copied.delete(path);
    }
  }
  return copied;
}

export async function duplicateStory(projectId: ID, onOpen?: (copyId: ID) => void): Promise<ID | null> {
  const copied = await copyProjectImages(projectId);
  const copyId = useStory.getState().duplicateProject(projectId, path => copied.get(path));
  if (!copyId) {
    copied.forEach(dest => {
      removeFile(stripFileScheme(dest)).catch(() => undefined);
    });
    toast('Could not duplicate this story');
    return null;
  }
  snackbar({
    message: 'Story duplicated',
    actionLabel: onOpen ? 'Open' : undefined,
    onAction: onOpen ? () => onOpen(copyId) : undefined,
  });
  return copyId;
}

export type ResumeTarget = { where: string; action: string; go: (navigation: AppNavigation) => void };

export function resumeTarget(state: StoryData, project: Project): ResumeTarget {
  const fallback: ResumeTarget = {
    where: 'Story overview',
    action: 'Open story',
    go: navigation => navigation.navigate('Project', { projectId: project.id }),
  };
  const last = project.lastOpened;
  if (!last) {
    return fallback;
  }
  if (last.screen === 'Outline') {
    return {
      where: 'Outline',
      action: 'Keep writing',
      go: navigation => navigation.navigate('Outline', { projectId: project.id }),
    };
  }
  if (last.screen === 'Script' || last.screen === 'Storyboard') {
    const chapterId = last.chapterId;
    if (!chapterId || !state.chapters[chapterId]) {
      return fallback;
    }
    const number = chapterNumber(project, chapterId);
    return last.screen === 'Script'
      ? {
          where: `Chapter ${number} script`,
          action: 'Keep writing',
          go: navigation => navigation.navigate('Script', { chapterId }),
        }
      : {
          where: `Chapter ${number} storyboard`,
          action: 'Keep drawing',
          go: navigation => navigation.navigate('Storyboard', { chapterId }),
        };
  }
  const pageId = last.pageId;
  const page = pageId ? state.pages[pageId] : undefined;
  if (!pageId || !page) {
    return fallback;
  }
  const where = `Chapter ${chapterNumber(project, page.chapterId)} · Page ${pageNumber(state, pageId).index}`;
  if (last.screen === 'PanelLayout') {
    return { where, action: 'Keep paneling', go: navigation => navigation.navigate('PanelLayout', { pageId }) };
  }
  if (last.screen === 'Lettering') {
    return { where, action: 'Keep lettering', go: navigation => navigation.navigate('Lettering', { pageId }) };
  }
  const panelId = last.panelId;
  if (!panelId || !page.panels[panelId]) {
    return {
      where,
      action: 'Keep drawing',
      go: navigation => navigation.navigate('PanelLayout', { pageId, mode: 'art' }),
    };
  }
  return { where, action: 'Keep drawing', go: navigation => navigation.navigate('Canvas', { pageId, panelId }) };
}
