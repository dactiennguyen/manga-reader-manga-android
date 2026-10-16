import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorView } from '../../components/ErrorView';
import { Favicon } from '../../components/Favicon';
import { Cover } from '../../components/MangaCard';
import { ChevronDown, ChevronRight, ChevronUp, Lock, Star } from '../../components/icons';
import { Button, Chip } from '../../components/ui';
import type { Genre, MangaDetail, SourceConfig } from '../../sources/types';
import { font, radius, space, useTheme } from '../../theme';
import { chapterDate } from './chapters';

type Props = {
  source: SourceConfig;
  url: string;
  title: string;
  cover?: string;
  headers: Record<string, string>;
  detail?: MangaDetail;
  error?: unknown;
  locked: boolean;
  hasSimilar: boolean;
  onRetry: () => void;
  onGenre: (genre: Genre) => void;
  onSource: () => void;
  onUnlock: () => void;
};

export function DetailInfo(props: Props) {
  const { source, url, title, cover, headers, detail, error, locked } = props;
  const { c } = useTheme();
  const altTitles = detail?.altTitles?.filter(t => t && t !== title) ?? [];
  const authors = detail?.authors?.filter(Boolean) ?? [];
  const latest = detail?.chapters[0];
  const updated = latest ? chapterDate(latest) : undefined;

  const sourceField = (
    <Field label="Nguồn">
      <Pressable
        onPress={props.onSource}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Catalog ${source.name}`}
        style={styles.source}
      >
        <Favicon url={source.baseUrl} label={source.name} size={16} />
        <Text numberOfLines={1} style={[font.body, styles.sourceName, { color: c.accent }]}>
          {source.name}
        </Text>
        <ChevronRight size={18} color={c.accent} />
      </Pressable>
    </Field>
  );

  let body: ReactNode;
  if (locked) {
    body = (
      <>
        {sourceField}
        <View style={[styles.lock, { backgroundColor: c.surface }]}>
          <View style={[styles.lockIcon, { backgroundColor: c.dangerSoft }]}>
            <Lock size={22} color={c.danger} />
          </View>
          <Text style={[font.heading, styles.center, { color: c.text }]}>Nội dung 18+</Text>
          <Text style={[font.body, styles.center, { color: c.muted }]}>
            Truyện này có nội dung người lớn. Bật hiển thị nội dung 18+ và xác nhận đủ tuổi trong Cài đặt để đọc.
          </Text>
          <Button title="Mở Cài đặt" onPress={props.onUnlock} small />
        </View>
      </>
    );
  } else if (!detail && error) {
    body = (
      <>
        {sourceField}
        <ErrorView error={error} onRetry={props.onRetry} url={url} style={styles.inline} />
      </>
    );
  } else if (!detail) {
    body = (
      <>
        {sourceField}
        <View style={styles.skeletons}>
          <View style={[styles.skeleton, { backgroundColor: c.skeleton }]} />
          <View style={[styles.skeleton, { backgroundColor: c.skeleton }]} />
          <View style={[styles.skeleton, styles.skeletonShort, { backgroundColor: c.skeleton }]} />
        </View>
      </>
    );
  } else {
    body = (
      <>
        {altTitles.length > 0 && <Field label="Tên khác" value={altTitles.join(', ')} />}
        {authors.length > 0 && <Field label="Tác giả" value={authors.join(', ')} />}
        {sourceField}
        <Field label="Mô tả">
          <Description text={detail.description} />
        </Field>
        {!!detail.genres?.length && (
          <Field label="Thể loại">
            <View style={styles.genres}>
              {detail.genres.map(genre => (
                <Chip key={`${genre.id}|${genre.name}`} label={genre.name} onPress={() => props.onGenre(genre)} />
              ))}
            </View>
          </Field>
        )}
        {props.hasSimilar && <Text style={[styles.label, { color: c.text }]}>Truyện tương tự</Text>}
      </>
    );
  }

  const stats =
    detail && !locked ? (
      <>
        {!!detail.status && <Field label="Trạng thái" value={detail.status} first />}
        {!!detail.views && <Field label="Lượt xem" value={detail.views} first={!detail.status} />}
        {!!updated && <Field label="Cập nhật" value={updated} first={!detail.status && !detail.views} />}
        {detail.rating !== undefined && detail.rating > 0 && (
          <Field label="Đánh giá" first={!detail.status && !detail.views && !updated}>
            <View style={styles.rating}>
              <Star size={16} color={c.warning} fill={c.warning} />
              <Text style={[font.body, { color: c.text }]}>{detail.rating.toFixed(1)}</Text>
            </View>
          </Field>
        )}
      </>
    ) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Cover uri={cover} headers={headers} blur={locked} style={styles.cover} />
        <View style={styles.stats}>{stats}</View>
      </View>
      <View style={styles.fields}>
        <Field label="Tên truyện" value={title} />
        {body}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  first,
  children,
}: {
  label: string;
  value?: string;
  first?: boolean;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View>
      <Text style={[styles.label, first && styles.firstLabel, { color: c.text }]}>{label}</Text>
      {value !== undefined ? (
        <Text selectable style={[font.body, styles.value, { color: c.text }]}>
          {value}
        </Text>
      ) : (
        <View style={styles.valueBox}>{children}</View>
      )}
    </View>
  );
}

function Description({ text }: { text?: string }) {
  const { c } = useTheme();
  const [expanded, setExpanded] = useState(false);
  if (!text) {
    return <Text style={[font.body, styles.italic, { color: c.muted }]}>Chưa có mô tả</Text>;
  }
  const long = text.length > 200 || text.split('\n').length > 4;
  const Arrow = expanded ? ChevronUp : ChevronDown;
  return (
    <View>
      <Text
        selectable
        numberOfLines={expanded || !long ? undefined : 4}
        style={[font.body, styles.descText, { color: c.text }]}
      >
        {text}
      </Text>
      {long && (
        <Pressable
          onPress={() => setExpanded(v => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Thu gọn mô tả' : 'Xem toàn bộ mô tả'}
          style={styles.more}
        >
          <Arrow size={26} color={c.text} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  wrap: { paddingTop: space.lg },
  top: { flexDirection: 'row', gap: space.lg, paddingHorizontal: space.lg },
  cover: { width: '50%', borderRadius: radius.sm },
  stats: { flex: 1, paddingTop: space.sm },
  source: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, maxWidth: '100%' },
  sourceName: { flexShrink: 1 },
  fields: { paddingHorizontal: space.lg },
  label: { fontSize: 15, fontWeight: '700', marginTop: space.lg },
  firstLabel: { marginTop: 0 },
  value: { marginTop: 6, lineHeight: 22 },
  valueBox: { marginTop: space.sm },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  descText: { lineHeight: 22 },
  italic: { fontStyle: 'italic' },
  more: { alignSelf: 'center', paddingTop: space.xs, paddingHorizontal: space.xl },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  skeletons: { gap: space.sm, paddingTop: space.lg },
  skeleton: { height: 12, borderRadius: 6 },
  skeletonShort: { width: '60%' },
  inline: { flex: 0, paddingVertical: space.xl },
  lock: {
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.lg,
    padding: space.xl,
    borderRadius: radius.lg,
  },
  lockIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
