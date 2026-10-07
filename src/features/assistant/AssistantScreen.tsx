import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useAppNavigation } from '../../app/routes';
import { AiErrorBox, AiLoading, AiNote } from '../../components/ai';
import {
  Check,
  CircleStop,
  Copy,
  History,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
} from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import {
  Button,
  Chip,
  Header,
  IconButton,
  ListItem,
  Screen,
  TextField,
  confirm,
  snackbar,
  toast,
} from '../../components/ui';
import { askAssistant, quickPrompts, type AssistantTurn } from '../../lib/ai/assistant';
import { useAiConfigured } from '../../lib/ai/client';
import { storyBrief } from '../../lib/ai/context';
import { useAiTask } from '../../lib/ai/useAiTask';
import { plural } from '../../lib/format';
import { formatRelative } from '../../lib/time';
import type { ID, LastOpened, Project } from '../../model/types';
import {
  conversationTitle,
  conversationsOf,
  projectKeyOf,
  useAssistant,
  type AssistantMessage,
  type Conversation,
} from '../../store/useAssistant';
import { useStory } from '../../store/useStory';
import { font, radius, space, useTheme } from '../../theme';

const QUESTION_MAX = 2000;

const SCREEN_LABEL: Record<LastOpened['screen'], string> = {
  Script: 'Script',
  Storyboard: 'Storyboard',
  PanelLayout: 'Panel layout',
  Canvas: 'Canvas',
  Lettering: 'Lettering',
  Outline: 'Outline',
};

function whereOf(project: Project | undefined, chapterTitle: string | undefined): string {
  if (!project) {
    return 'Home';
  }
  const last = project.lastOpened;
  if (!last) {
    return 'Project overview';
  }
  const label = SCREEN_LABEL[last.screen];
  return chapterTitle ? `${label} of chapter "${chapterTitle}"` : label;
}

function AssistantBubble({
  message,
  onCopy,
  onSave,
}: {
  message: AssistantMessage;
  onCopy: () => void;
  onSave?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.assistantWrap}>
      <View style={[styles.shadow, { backgroundColor: c.ink }]} />
      <View style={[styles.assistantBubble, { backgroundColor: c.surface, borderColor: c.ink }]}>
        <View style={styles.bubbleHead}>
          <Sparkles size={14} color={c.ai} />
          <Text style={[font.overline, { color: c.ai }]}>Assistant</Text>
        </View>
        <Text selectable style={[font.body, { color: c.text }]}>
          {message.text}
        </Text>
        <View style={styles.bubbleActions}>
          <Button title="Copy" icon={Copy} variant="ghost" small onPress={onCopy} />
          {onSave && <Button title="Save as note" icon={StickyNote} variant="ghost" small onPress={onSave} />}
        </View>
      </View>
    </View>
  );
}

function UserBubble({ message }: { message: AssistantMessage }) {
  const { c } = useTheme();
  return (
    <View style={[styles.userBubble, { backgroundColor: c.ink, borderColor: c.ink }]}>
      <Text selectable style={[font.body, { color: c.onInk }]}>
        {message.text}
      </Text>
    </View>
  );
}

export function AssistantScreen() {
  const { c } = useTheme();
  const navigation = useAppNavigation();
  const configured = useAiConfigured();
  const project = useStory(
    useShallow(s => {
      let latest: Project | undefined;
      Object.values(s.projects).forEach(item => {
        if (!item.deletedAt && (!latest || item.updatedAt > latest.updatedAt)) {
          latest = item;
        }
      });
      return latest;
    }),
  );
  const chapterTitle = useStory(s => {
    const chapterId = project?.lastOpened?.chapterId;
    return chapterId ? s.chapters[chapterId]?.title : undefined;
  });
  const projectKey = projectKeyOf(project?.id);
  const conversations = useAssistant(useShallow(s => conversationsOf(s.conversations, projectKey)));
  const activeId = useAssistant(s => s.activeByProject[projectKey]);
  const active: Conversation | undefined = useMemo(
    () => conversations.find(item => item.id === activeId) ?? conversations[0],
    [conversations, activeId],
  );
  const messages = active?.messages ?? [];
  const where = whereOf(project, chapterTitle);
  const prompts = useMemo(() => quickPrompts(where, !!project), [where, project]);

  const { state: ai, start, cancel, reset } = useAiTask<string>();
  const [input, setInput] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const pending = useRef<{ conversationId: ID; question: string } | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const loading = ai.status === 'loading';

  const ask = useCallback(
    (conversationId: ID, question: string) => {
      pending.current = { conversationId, question };
      const story = useStory.getState();
      const brief = project ? storyBrief(story, project.id, { chapterId: project.lastOpened?.chapterId }).text : '';
      const turns = useAssistant.getState().conversations[conversationId]?.messages ?? [];
      const history: AssistantTurn[] = turns.slice(0, -1).map(turn => ({ role: turn.role, text: turn.text }));
      start(signal => askAssistant({ brief, where }, history, question, signal)).then(answer => {
        if (answer) {
          useAssistant.getState().addMessage(conversationId, 'assistant', answer);
          reset();
        }
      });
    },
    [project, where, start, reset],
  );

  const send = (raw: string) => {
    const question = raw.trim();
    if (!question || loading) {
      return;
    }
    const store = useAssistant.getState();
    const conversationId = active?.id ?? store.startConversation(projectKey);
    if (!store.activeByProject[projectKey]) {
      store.setActive(projectKey, conversationId);
    }
    store.addMessage(conversationId, 'user', question);
    setInput('');
    ask(conversationId, question);
  };

  const retry = () => {
    if (pending.current) {
      ask(pending.current.conversationId, pending.current.question);
    }
  };

  const copy = async (message: AssistantMessage) => {
    try {
      await Share.share({ message: message.text });
    } catch {
      toast('Sharing failed');
    }
  };

  const saveNote = (message: AssistantMessage) => {
    if (!project || !active) {
      return;
    }
    const index = active.messages.findIndex(item => item.id === message.id);
    const question = [...active.messages.slice(0, Math.max(0, index))].reverse().find(item => item.role === 'user');
    const title = question ? conversationTitle(question.text) : 'Assistant note';
    const entryId = useStory.getState().addWorldEntry(project.id, 'note', {
      title,
      body: message.text,
      fromAssistant: true,
    });
    snackbar({
      message: 'Saved as a note in the world wiki',
      actionLabel: 'Open',
      onAction: () => navigation.navigate('WorldEntry', { entryId }),
    });
  };

  const startNew = () => {
    cancel();
    useAssistant.getState().startConversation(projectKey);
    setListOpen(false);
  };

  const pick = (conversation: Conversation) => {
    if (conversation.id !== active?.id) {
      cancel();
    }
    useAssistant.getState().setActive(projectKey, conversation.id);
    setListOpen(false);
  };

  const remove = async (conversation: Conversation) => {
    const ok = await confirm('Delete this conversation?', conversation.title, {
      confirmText: 'Delete',
      destructive: true,
    });
    if (ok) {
      if (conversation.id === active?.id) {
        cancel();
      }
      useAssistant.getState().removeConversation(conversation.id);
    }
  };

  const openProfile = () => navigation.navigate('Tabs', { screen: 'Profile' });

  const empty = messages.length === 0;
  const canSend = configured && !loading && input.trim().length > 0;

  return (
    <Screen edges={['top']}>
      <Header
        title={project ? project.title || 'Untitled' : 'Assistant'}
        subtitle={project ? where : 'No story open · general manga questions'}
        hideBack
        right={
          <IconButton
            icon={History}
            badge={conversations.length > 1 ? conversations.length : undefined}
            onPress={() => setListOpen(true)}
            accessibilityLabel="Conversations"
          />
        }
      />
      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {!configured && (
          <View style={[styles.notice, { backgroundColor: c.aiSoft, borderColor: c.ai }]}>
            <AiNote text="AI is not set up" />
            <Text style={[font.body, { color: c.text }]}>
              Add the address of an OpenAI-compatible server in Profile to chat with the assistant.
            </Text>
            <Button title="Open Profile" variant="secondary" small onPress={openProfile} style={styles.selfStart} />
          </View>
        )}
        {empty && (
          <View style={styles.welcome}>
            <View style={[styles.welcomeIcon, { backgroundColor: c.surface, borderColor: c.ink }]}>
              <Sparkles size={28} color={c.ai} />
            </View>
            <Text style={[font.heading, styles.centerText, { color: c.text }]}>
              {project ? `Ask about ${project.title || 'your story'}` : 'Ask anything about making manga'}
            </Text>
            <Text style={[font.body, styles.centerText, { color: c.textSecondary }]}>
              {project
                ? 'The assistant knows your logline, characters, world notes and chapters. It never edits the story itself.'
                : 'Open a story to get answers about it, or ask a general question below.'}
            </Text>
            <View style={styles.prompts}>
              {prompts.map(prompt => (
                <Chip key={prompt} label={prompt} icon={Sparkles} onPress={() => send(prompt)} />
              ))}
            </View>
          </View>
        )}
        {messages.map(message =>
          message.role === 'user' ? (
            <UserBubble key={message.id} message={message} />
          ) : (
            <AssistantBubble
              key={message.id}
              message={message}
              onCopy={() => copy(message)}
              onSave={project ? () => saveNote(message) : undefined}
            />
          ),
        )}
        {loading && <AiLoading label="Thinking…" onCancel={cancel} />}
        {ai.status === 'error' && <AiErrorBox message={ai.message} onRetry={retry} onDismiss={reset} />}
      </ScrollView>
      <View style={[styles.inputBar, { backgroundColor: c.surface, borderTopColor: c.ink }]}>
        <TextField
          multiline
          value={input}
          onChangeText={setInput}
          placeholder={project ? 'Ask about your story…' : 'Ask a manga question…'}
          maxLength={QUESTION_MAX}
          editable={configured}
          accessibilityLabel="Message"
          style={styles.flex}
          inputStyle={styles.input}
        />
        {loading ? (
          <Pressable
            onPress={cancel}
            accessibilityRole="button"
            accessibilityLabel="Stop"
            style={[styles.sendButton, { backgroundColor: c.dangerSoft, borderColor: c.danger }]}
          >
            <CircleStop size={22} color={c.danger} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => send(input)}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={[styles.sendButton, { backgroundColor: c.ai, borderColor: c.ink }, !canSend && styles.dimmed]}
          >
            <Send size={20} color={c.onAi} />
          </Pressable>
        )}
      </View>

      <Sheet
        visible={listOpen}
        onClose={() => setListOpen(false)}
        title="Conversations"
        subtitle={project ? project.title || 'Untitled' : 'Without a story'}
      >
        <View style={styles.sheetBody}>
          <Button title="New conversation" icon={Plus} onPress={startNew} />
        </View>
        {conversations.length === 0 && (
          <Text style={[font.body, styles.sheetEmpty, { color: c.textSecondary }]}>No conversations yet.</Text>
        )}
        {conversations.map(conversation => (
          <ListItem
            key={conversation.id}
            title={conversation.title}
            subtitle={`${plural(conversation.messages.length, 'message')} · ${formatRelative(conversation.updatedAt)}`}
            icon={conversation.id === active?.id ? Check : MessageSquare}
            iconColor={conversation.id === active?.id ? c.ai : undefined}
            selected={conversation.id === active?.id}
            onPress={() => pick(conversation)}
            right={
              <IconButton
                icon={Trash2}
                size={18}
                color={c.danger}
                onPress={() => remove(conversation)}
                accessibilityLabel="Delete conversation"
              />
            }
          />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dimmed: { opacity: 0.4 },
  list: { padding: space.lg, gap: space.md, flexGrow: 1 },
  notice: { borderWidth: 2, borderRadius: radius.md, padding: space.md, gap: space.sm },
  selfStart: { alignSelf: 'flex-start' },
  welcome: { alignItems: 'center', gap: space.md, paddingVertical: space.xl, paddingHorizontal: space.sm },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: { textAlign: 'center' },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, marginTop: space.sm },
  assistantWrap: { alignSelf: 'flex-start', maxWidth: '92%', marginRight: 3, marginBottom: 3 },
  shadow: { position: 'absolute', top: 3, left: 3, right: -3, bottom: -3, borderRadius: radius.lg },
  assistantBubble: { borderWidth: 2, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  bubbleActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginLeft: -space.sm },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderWidth: 2,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderTopWidth: 2,
  },
  input: { maxHeight: 120, paddingTop: 10 },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { padding: space.lg, paddingTop: space.sm },
  sheetEmpty: { textAlign: 'center', paddingHorizontal: space.lg, paddingBottom: space.lg },
});
