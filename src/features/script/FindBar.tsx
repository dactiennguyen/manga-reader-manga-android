import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Search, X } from '../../components/icons';
import { Button, Chip, IconButton, TextField } from '../../components/ui';
import { font, space, useTheme } from '../../theme';

export type FindContext = { before: string; match: string; after: string };

export type FindBarProps = {
  query: string;
  replacement: string;
  matchCase: boolean;
  count: number;
  current: number;
  context?: FindContext;
  onQuery: (value: string) => void;
  onReplacement: (value: string) => void;
  onMatchCase: (value: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
};

export const FindBar = memo(function FindBarBase({
  query,
  replacement,
  matchCase,
  count,
  current,
  context,
  onQuery,
  onReplacement,
  onMatchCase,
  onNext,
  onPrevious,
  onReplace,
  onReplaceAll,
  onClose,
}: FindBarProps) {
  const { c } = useTheme();
  const none = count === 0;
  const status = !query ? '' : none ? 'No results' : `${current + 1} of ${count}`;
  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.ink }]}>
      <View style={styles.row}>
        <TextField
          autoFocus
          icon={Search}
          value={query}
          onChangeText={onQuery}
          placeholder="Find in script"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          submitBehavior="submit"
          onSubmitEditing={onNext}
          accessibilityLabel="Find in script"
          style={styles.flex}
        />
        <Text
          style={[styles.status, { color: query && none ? c.danger : c.muted }]}
          accessibilityLiveRegion="polite"
          numberOfLines={1}
        >
          {status}
        </Text>
        <IconButton icon={ChevronUp} onPress={onPrevious} disabled={none} accessibilityLabel="Previous match" />
        <IconButton icon={ChevronDown} onPress={onNext} disabled={none} accessibilityLabel="Next match" />
        <IconButton icon={X} onPress={onClose} accessibilityLabel="Close find" />
      </View>
      <View style={styles.row}>
        <TextField
          value={replacement}
          onChangeText={onReplacement}
          placeholder="Replace with"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          submitBehavior="submit"
          accessibilityLabel="Replace with"
          style={styles.flex}
        />
        <Button title="Replace" variant="secondary" small onPress={onReplace} disabled={none} />
        <Button title="All" small onPress={onReplaceAll} disabled={none} />
      </View>
      <View style={styles.row}>
        <Chip label="Match case" selected={matchCase} onPress={() => onMatchCase(!matchCase)} />
        <Text style={[styles.hint, { color: c.muted }]} numberOfLines={1} ellipsizeMode="tail">
          {context ? (
            <>
              {context.before}
              <Text style={[styles.hit, { color: c.accent }]}>{context.match}</Text>
              {context.after}
            </>
          ) : (
            'Searches every block in this chapter'
          )}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { borderTopWidth: 2, paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  status: { ...font.caption, minWidth: 56, textAlign: 'right' },
  hint: { ...font.caption, flex: 1, textAlign: 'right' },
  hit: { fontWeight: '700', textDecorationLine: 'underline' },
});
