import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { uid } from '../lib/id';
import { persistStorage } from '../lib/storage';
import type { ID } from '../model/types';

export type AssistantRole = 'user' | 'assistant';

export type AssistantMessage = { id: ID; role: AssistantRole; text: string; at: number };

export type Conversation = {
  id: ID;
  projectKey: string;
  title: string;
  messages: AssistantMessage[];
  createdAt: number;
  updatedAt: number;
};

export const MAX_CONVERSATIONS = 20;
export const TITLE_MAX = 48;
export const NO_STORY_KEY = 'none';

export function projectKeyOf(projectId: ID | undefined | null): string {
  return projectId || NO_STORY_KEY;
}

export function conversationTitle(question: string): string {
  const clean = question.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return 'New conversation';
  }
  if (clean.length <= TITLE_MAX) {
    return clean;
  }
  const cut = clean.slice(0, TITLE_MAX);
  const space = cut.lastIndexOf(' ');
  return `${(space > TITLE_MAX / 2 ? cut.slice(0, space) : cut).trim()}…`;
}

export function conversationsOf(conversations: Record<ID, Conversation>, projectKey: string): Conversation[] {
  return Object.values(conversations)
    .filter(item => item.projectKey === projectKey)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function pruneConversations(
  conversations: Record<ID, Conversation>,
  projectKey: string,
  max = MAX_CONVERSATIONS,
): Record<ID, Conversation> {
  const kept = conversationsOf(conversations, projectKey).slice(0, max);
  const keptIds = new Set(kept.map(item => item.id));
  const next: Record<ID, Conversation> = {};
  Object.values(conversations).forEach(item => {
    if (item.projectKey !== projectKey || keptIds.has(item.id)) {
      next[item.id] = item;
    }
  });
  return next;
}

export function appendMessage(conversation: Conversation, message: AssistantMessage): Conversation {
  const first = conversation.messages.length === 0 && message.role === 'user';
  return {
    ...conversation,
    title: first ? conversationTitle(message.text) : conversation.title,
    messages: [...conversation.messages, message],
    updatedAt: message.at,
  };
}

export type AssistantData = {
  conversations: Record<ID, Conversation>;
  activeByProject: Record<string, ID>;
};

type AssistantActions = {
  startConversation: (projectKey: string) => ID;
  setActive: (projectKey: string, conversationId: ID) => void;
  addMessage: (conversationId: ID, role: AssistantRole, text: string) => ID;
  removeConversation: (conversationId: ID) => void;
  reset: () => void;
};

const EMPTY: AssistantData = { conversations: {}, activeByProject: {} };

let lastStamp = 0;

function stamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

export const useAssistant = create<AssistantData & AssistantActions>()(
  persist(
    set => ({
      ...EMPTY,

      startConversation: projectKey => {
        const id = uid();
        const now = stamp();
        set(state => {
          const conversation: Conversation = {
            id,
            projectKey,
            title: 'New conversation',
            messages: [],
            createdAt: now,
            updatedAt: now,
          };
          const empties = conversationsOf(state.conversations, projectKey).filter(item => item.messages.length === 0);
          const conversations = { ...state.conversations };
          empties.forEach(item => delete conversations[item.id]);
          conversations[id] = conversation;
          return {
            conversations: pruneConversations(conversations, projectKey),
            activeByProject: { ...state.activeByProject, [projectKey]: id },
          };
        });
        return id;
      },

      setActive: (projectKey, conversationId) =>
        set(state => ({ activeByProject: { ...state.activeByProject, [projectKey]: conversationId } })),

      addMessage: (conversationId, role, text) => {
        const id = uid();
        set(state => {
          const conversation = state.conversations[conversationId];
          if (!conversation) {
            return state;
          }
          const message: AssistantMessage = { id, role, text, at: stamp() };
          return {
            conversations: { ...state.conversations, [conversationId]: appendMessage(conversation, message) },
          };
        });
        return id;
      },

      removeConversation: conversationId =>
        set(state => {
          const conversation = state.conversations[conversationId];
          if (!conversation) {
            return state;
          }
          const conversations = { ...state.conversations };
          delete conversations[conversationId];
          const activeByProject = { ...state.activeByProject };
          if (activeByProject[conversation.projectKey] === conversationId) {
            delete activeByProject[conversation.projectKey];
          }
          return { conversations, activeByProject };
        }),

      reset: () => set(EMPTY),
    }),
    {
      name: 'mangaka-assistant',
      storage: persistStorage,
      version: 1,
      partialize: state => ({ conversations: state.conversations, activeByProject: state.activeByProject }),
      merge: (persisted, current) => ({ ...current, ...((persisted ?? {}) as Partial<AssistantData>) }),
    },
  ),
);
