import type { AppNavigation } from '../../app/routes';
import { confirm, toast } from '../../components/ui';
import { MIME, pickImage, removeFile, shareFile } from '../../lib/files';
import { exportProjectArchive } from '../../lib/projectArchive';
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
  toast('Moved to Trash');
  return true;
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
