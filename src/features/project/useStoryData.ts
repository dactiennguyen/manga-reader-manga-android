import { useMemo } from 'react';

import { useStory, type StoryData } from '../../store/useStory';

export function useStoryData(): StoryData {
  const projects = useStory(s => s.projects);
  const chapters = useStory(s => s.chapters);
  const scenes = useStory(s => s.scenes);
  const characters = useStory(s => s.characters);
  const relations = useStory(s => s.relations);
  const world = useStory(s => s.world);
  const pages = useStory(s => s.pages);
  return useMemo(
    () => ({ projects, chapters, scenes, characters, relations, world, pages }),
    [projects, chapters, scenes, characters, relations, world, pages],
  );
}
