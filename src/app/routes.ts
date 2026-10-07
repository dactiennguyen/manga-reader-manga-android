import { useNavigation, useRoute, type NavigatorScreenParams, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ID, WorldType } from '../model/types';

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Assistant: undefined;
  Profile: undefined;
};

export type ProjectTab = 'chapters' | 'characters' | 'world' | 'notes';

export type StoryDraft = { title: string; genres: string[]; logline: string };

export type RootStackParamList = {
  Welcome: undefined;
  SignIn: { from?: 'profile' } | undefined;
  Preferences: { edit?: boolean } | undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  NewProject: { idea?: string; blankCanvas?: boolean; draft?: StoryDraft } | undefined;
  Project: { projectId: ID; tab?: ProjectTab };
  Outline: { projectId: ID };
  Script: { chapterId: ID; blockId?: ID };
  Character: { characterId: ID };
  World: { projectId: ID; type?: WorldType; view?: 'list' | 'timeline' };
  WorldEntry: { entryId: ID };
  Storyboard: { chapterId: ID };
  PanelLayout: { pageId: ID; mode?: 'panels' | 'art' };
  Canvas: { pageId: ID; panelId: ID };
  Lettering: { pageId: ID };
  Preview: { projectId: ID; chapterId?: ID; pageId?: ID };
  Export: { projectId: ID; chapterId?: ID };
  Trash: undefined;
  About: undefined;
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export function useAppNavigation(): AppNavigation {
  return useNavigation<AppNavigation>();
}

export function useAppRoute<T extends keyof RootStackParamList>(): RouteProp<RootStackParamList, T> {
  return useRoute<RouteProp<RootStackParamList, T>>();
}
