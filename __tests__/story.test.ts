import { loadArt, newLayer, saveArt } from '../src/engine/artStore';
import { collectPanelIds } from '../src/engine/layout';
import {
  activeProjects,
  chapterIdsOf,
  chapterStatus,
  characterUsage,
  projectProgress,
  projectStatus,
  scriptOutdated,
  trashedProjects,
} from '../src/model/selectors';
import type { NewProjectInput } from '../src/store/useStory';
import { useStory } from '../src/store/useStory';

const INPUT: NewProjectInput = {
  title: 'The Delivery Boy',
  genres: ['Adventure'],
  logline: '',
  format: 'manga',
  pageSize: 'B5',
  style: 'shounen',
  color: false,
};

const story = () => useStory.getState();

function reset() {
  useStory.setState({ projects: {}, chapters: {}, scenes: {}, characters: {}, relations: {}, world: {}, pages: {} });
}

function stroke() {
  return { tool: 'gpen' as const, color: '#16161A', size: 8, opacity: 1, points: [1, 2, 3, 4] };
}

beforeEach(reset);

describe('projects and chapters', () => {
  it('a new story has three acts and Chapter 1', () => {
    const projectId = story().createProject(INPUT);
    const project = story().projects[projectId];
    expect(project.acts).toHaveLength(3);
    const [chapterId] = chapterIdsOf(project);
    expect(story().chapters[chapterId].title).toBe('Chapter 1');
    expect(projectStatus(story(), projectId)).toBe('draft');
  });

  it('adding, moving and removing chapters keeps the order right', () => {
    const projectId = story().createProject(INPUT);
    const [act1, act2] = story().projects[projectId].acts;
    const second = story().addChapter(projectId, { actId: act1.id });
    const third = story().addChapter(projectId, { actId: act2.id });
    const first = chapterIdsOf(story().projects[projectId])[0];
    expect(chapterIdsOf(story().projects[projectId])).toEqual([first, second, third]);
    expect(story().chapters[third].title).toBe('Chapter 3');

    story().moveChapter(first, act2.id, 99);
    expect(chapterIdsOf(story().projects[projectId])).toEqual([second, third, first]);

    story().removeChapter(third);
    expect(chapterIdsOf(story().projects[projectId])).toEqual([second, first]);
    expect(story().chapters[third]).toBeUndefined();
  });

  it('does not remove an act with chapters unless a target act is given', () => {
    const projectId = story().createProject(INPUT);
    const [act1, act2] = story().projects[projectId].acts;
    story().removeAct(projectId, act1.id);
    expect(story().projects[projectId].acts).toHaveLength(3);
    story().removeAct(projectId, act1.id, act2.id);
    const acts = story().projects[projectId].acts;
    expect(acts).toHaveLength(2);
    expect(acts[0].chapterIds).toHaveLength(1);
  });

  it('trash: soft delete, restore, and purge after 30 days', () => {
    const keep = story().createProject(INPUT);
    const old = story().createProject({ ...INPUT, title: 'Old' });
    story().trashProject(keep);
    story().trashProject(old);
    expect(activeProjects(story())).toHaveLength(0);
    expect(trashedProjects(story())).toHaveLength(2);
    story().restoreProject(keep);
    expect(story().projects[keep].deletedAt).toBeUndefined();

    const chapterId = chapterIdsOf(story().projects[old])[0];
    story().purgeTrash(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(story().projects[old]).toBeUndefined();
    expect(story().chapters[chapterId]).toBeUndefined();
    expect(story().projects[keep]).toBeDefined();
  });
});

describe('script', () => {
  it('editing the script after pagination marks it as outdated', async () => {
    const projectId = story().createProject(INPUT);
    const chapterId = chapterIdsOf(story().projects[projectId])[0];
    const sceneId = story().addScene(chapterId, { blocks: [{ id: 'b1', type: 'action', text: 'Opening' }] });
    expect(chapterStatus(story(), chapterId)).toBe('writing');

    story().applyPagination(chapterId, [{ panels: [{ description: 'Opening', blockIds: ['b1'] }] }], 'append');
    expect(scriptOutdated(story().chapters[chapterId])).toBe(false);
    expect(chapterStatus(story(), chapterId)).toBe('drawing');

    await new Promise<void>(resolve => setTimeout(resolve, 5));
    story().updateScene(sceneId, { blocks: [{ id: 'b1', type: 'action', text: 'Opening, revised' }] });
    expect(scriptOutdated(story().chapters[chapterId])).toBe(true);
  });

  it('collapsing a scene does not count as a script edit', () => {
    const projectId = story().createProject(INPUT);
    const chapterId = chapterIdsOf(story().projects[projectId])[0];
    const sceneId = story().addScene(chapterId);
    const before = story().chapters[chapterId].scriptChangedAt;
    story().updateScene(sceneId, { collapsed: true });
    expect(story().chapters[chapterId].scriptChangedAt).toBe(before);
  });
});

describe('pages and panels', () => {
  function setup() {
    const projectId = story().createProject(INPUT);
    const chapterId = chapterIdsOf(story().projects[projectId])[0];
    return { projectId, chapterId };
  }

  it('creates a page from a plan and assigns descriptions in reading order', () => {
    const { chapterId } = setup();
    const pageId = story().addPage(chapterId, {
      plan: {
        panels: [
          { description: 'one', blockIds: ['a'] },
          { description: 'two', blockIds: ['b'] },
          { description: 'three', blockIds: [] },
        ],
      },
    });
    const page = story().pages[pageId];
    expect(collectPanelIds(page.layout)).toHaveLength(3);
    const described = Object.values(page.panels).map(p => p.description).sort();
    expect(described).toEqual(['one', 'three', 'two']);
  });

  it('changing the template keeps existing panels and art and drops art of surplus panels', () => {
    const { chapterId } = setup();
    const pageId = story().addPage(chapterId, { templateId: 'g3-rows' });
    const before = collectPanelIds(story().pages[pageId].layout);
    for (const id of before) {
      saveArt(id, { layers: [{ ...newLayer('Ink'), strokes: [stroke()] }] });
    }

    story().applyTemplate(pageId, 'g2-rows');
    const after = collectPanelIds(story().pages[pageId].layout);
    expect(after).toEqual(before.slice(0, 2));
    expect(loadArt(before[0])).not.toBeNull();
    expect(loadArt(before[2])).toBeNull();

    story().applyTemplate(pageId, 'g4-grid');
    const grown = story().pages[pageId];
    expect(Object.keys(grown.panels)).toHaveLength(4);
    expect(before.slice(0, 2).every(id => !!grown.panels[id])).toBe(true);
  });

  it('duplicating a page creates new panels and copies the art', () => {
    const { chapterId } = setup();
    const pageId = story().addPage(chapterId, { templateId: 'g2-rows' });
    const [panelId] = collectPanelIds(story().pages[pageId].layout);
    saveArt(panelId, { layers: [{ ...newLayer('Ink'), strokes: [stroke()] }] });

    const copyId = story().duplicatePage(pageId)!;
    const copy = story().pages[copyId];
    const copyPanels = collectPanelIds(copy.layout);
    expect(copyPanels).toHaveLength(2);
    expect(copyPanels).not.toContain(panelId);
    expect(copyPanels.some(id => loadArt(id)?.layers[0].strokes.length === 1)).toBe(true);
    expect(story().chapters[chapterId].pageIds).toEqual([pageId, copyId]);
  });

  it('removing a page removes the art of its panels', () => {
    const { chapterId } = setup();
    const pageId = story().addPage(chapterId, { templateId: 'g1' });
    const [panelId] = collectPanelIds(story().pages[pageId].layout);
    saveArt(panelId, { layers: [{ ...newLayer('Ink'), strokes: [stroke()] }] });
    story().removePage(pageId);
    expect(loadArt(panelId)).toBeNull();
    expect(story().chapters[chapterId].pageIds).toEqual([]);
  });

  it('story progress counts pages marked done', () => {
    const { projectId, chapterId } = setup();
    const a = story().addPage(chapterId, { templateId: 'g1' });
    story().addPage(chapterId, { templateId: 'g1' });
    story().updatePage(a, { done: true });
    expect(projectProgress(story(), projectId)).toEqual({ done: 1, total: 2, ratio: 0.5 });
    expect(projectStatus(story(), projectId)).toBe('active');
  });
});

describe('characters', () => {
  it('removing a character clears it from dialogue, bubbles, relations and chapters', () => {
    const projectId = story().createProject(INPUT);
    const chapterId = chapterIdsOf(story().projects[projectId])[0];
    const minh = story().addCharacter(projectId, { name: 'Minh' });
    const tu = story().addCharacter(projectId, { name: 'Mrs. Tu' });
    story().addRelation(projectId, minh, tu, 'neighbor');
    story().updateChapter(chapterId, { characterIds: [minh, tu] });
    const sceneId = story().addScene(chapterId, {
      blocks: [{ id: 'b1', type: 'dialogue', text: 'Hello', characterId: minh, kind: 'speak' }],
    });
    const pageId = story().addPage(chapterId, { templateId: 'g1' });
    story().updatePage(pageId, {
      bubbles: [
        {
          id: 'bb',
          type: 'speak',
          text: 'Hello',
          x: 0,
          y: 0,
          w: 100,
          h: 80,
          rotation: 0,
          tail: null,
          fontSize: 28,
          font: 'hand',
          bold: false,
          characterId: minh,
        },
      ],
    });
    expect(characterUsage(story(), minh)).toEqual({ dialogues: 1, bubbles: 1, chapterIds: [chapterId] });

    story().removeCharacter(minh);
    expect(story().characters[minh]).toBeUndefined();
    expect(Object.keys(story().relations)).toHaveLength(0);
    expect(story().chapters[chapterId].characterIds).toEqual([tu]);
    expect(story().scenes[sceneId].blocks[0].characterId).toBeUndefined();
    expect(story().pages[pageId].bubbles[0].characterId).toBeUndefined();
  });
});
