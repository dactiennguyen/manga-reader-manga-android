import type { LucideIcon } from 'lucide-react-native';
import {
  Bookmark,
  BookOpen,
  ChevronRight,
  CircleDot,
  Download,
  Eye,
  Globe,
  Lock,
  Play,
  Share2,
  Star,
  StarHalf,
  User,
} from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Cover } from '../../components/MangaCard';
import { Button, Chip, ChipRow } from '../../components/ui';
import type { Genre, MangaDetail, SourceConfig } from '../../sources/types';
import { font, radius, space, useTheme } from '../../theme';
import { Favicon } from '../../components/Favicon';
import type { ReadTarget } from './chapters';

type Props = {
  source: SourceConfig;
  title: string;
  cover?: string;
  headers: Record<string, string>;
  detail?: MangaDetail;
  /** Truyện/nguồn 18+ khi chưa cho phép: làm mờ bìa và khoá đọc. */
  locked: boolean;
  /** Đang tải lần đầu, chưa có dữ liệu chi tiết. */
  loading: boolean;
  bookmarked: boolean;
  target?: ReadTarget;
  onRead: () => void;
  onBookmark: () => void;
  onDownload: () => void;
  onOpenWeb: () => void;
  onShare: () => void;
  onGenre: (genre: Genre) => void;
  onSource: () => void;
  onUnlock: () => void;
};

/** Phần đầu trang chi tiết: nền bìa làm mờ, thông tin, nút hành động, thể loại, mô tả. */
export function DetailHero(props: Props) {
  const { source, title, cover, headers, detail, locked, loading, bookmarked, target } = props;
  const { c } = useTheme();
  const altTitles = detail?.altTitles?.filter(t => t && t !== title) ?? [];
  const authors = detail?.authors?.filter(Boolean) ?? [];
  const hasChapters = !!detail?.chapters.length;

  return (
    <View>
      <View style={styles.top}>
        {!!cover && (
          <Image
            source={{ uri: cover, headers }}
            blurRadius={locked ? 40 : 24}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[StyleSheet.absoluteFill, styles.shade, { backgroundColor: c.bg }]} />
        <View style={styles.topRow}>
          <Cover uri={cover} headers={headers} blur={locked} style={[styles.cover, { borderColor: c.surface }]} />
          <View style={styles.info}>
            <Text selectable numberOfLines={4} style={[font.title, { color: c.text }]}>
              {title}
            </Text>
            {altTitles.length > 0 && (
              <Text numberOfLines={2} style={[font.caption, { color: c.textSecondary }]}>
                Tên khác: {altTitles.join(' · ')}
              </Text>
            )}
            {authors.length > 0 && <InfoLine icon={User} text={authors.join(', ')} />}
            {!!detail?.status && <InfoLine icon={CircleDot} text={detail.status} />}
            {detail?.rating !== undefined && detail.rating > 0 && <Rating value={detail.rating} />}
            {!!detail?.views && <InfoLine icon={Eye} text={detail.views} />}
            <Pressable
              onPress={props.onSource}
              hitSlop={6}
              style={[styles.sourceChip, { backgroundColor: c.surface }]}
            >
              <Favicon url={source.baseUrl} label={source.name} size={18} tile />
              <Text numberOfLines={1} style={[font.caption, styles.sourceName, { color: c.text }]}>
                {source.name}
              </Text>
              <ChevronRight size={14} color={c.muted} />
            </Pressable>
          </View>
        </View>
      </View>

      {locked ? (
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
      ) : (
        <>
          <View style={styles.actions}>
            <Action
              icon={Bookmark}
              label={bookmarked ? 'Đã lưu' : 'Bookmark'}
              active={bookmarked}
              onPress={props.onBookmark}
            />
            <Action icon={Download} label="Tải xuống" disabled={!hasChapters} onPress={props.onDownload} />
            <Action icon={Globe} label="Mở web" onPress={props.onOpenWeb} />
            <Action icon={Share2} label="Chia sẻ" onPress={props.onShare} />
          </View>

          <Pressable
            onPress={props.onRead}
            disabled={!target}
            style={({ pressed }) => [
              styles.read,
              { backgroundColor: target ? c.accent : c.surfaceAlt },
              pressed && styles.pressed,
            ]}
          >
            {target ? (
              <Play size={18} color={c.onAccent} fill={c.onAccent} />
            ) : (
              <BookOpen size={18} color={c.muted} />
            )}
            <Text numberOfLines={1} style={[font.label, styles.readLabel, { color: target ? c.onAccent : c.muted }]}>
              {target?.label ?? (loading ? 'Đang tải danh sách chương…' : 'Chưa có chương để đọc')}
            </Text>
          </Pressable>

          {!!detail?.genres?.length && (
            <ChipRow>
              {detail.genres.map(genre => (
                <Chip key={`${genre.id}|${genre.name}`} label={genre.name} onPress={() => props.onGenre(genre)} />
              ))}
            </ChipRow>
          )}

          <Description text={detail?.description} loading={loading && !detail} />
        </>
      )}
    </View>
  );
}

function InfoLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.infoLine}>
      <Icon size={13} color={c.muted} />
      <Text numberOfLines={1} style={[font.caption, styles.flex, { color: c.textSecondary }]}>
        {text}
      </Text>
    </View>
  );
}

/** Điểm thang 5 dạng sao, có nửa sao. */
function Rating({ value }: { value: number }) {
  const { c } = useTheme();
  return (
    <View style={styles.infoLine}>
      {[0, 1, 2, 3, 4].map(i => {
        const diff = value - i;
        return (
          <View key={i} style={styles.star}>
            <Star size={13} color={c.warning} />
            {diff >= 0.75 && (
              <View style={StyleSheet.absoluteFill}>
                <Star size={13} color={c.warning} fill={c.warning} />
              </View>
            )}
            {diff >= 0.25 && diff < 0.75 && (
              <View style={StyleSheet.absoluteFill}>
                <StarHalf size={13} color={c.warning} fill={c.warning} />
              </View>
            )}
          </View>
        );
      })}
      <Text style={[font.caption, styles.ratingValue, { color: c.textSecondary }]}>{value.toFixed(1)}</Text>
    </View>
  );
}

function Action({
  icon: Icon,
  label,
  onPress,
  active,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const color = active ? c.accent : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Icon size={22} color={color} fill={active ? c.accent : 'none'} />
      <Text numberOfLines={1} style={[font.caption, { color: active ? c.accent : c.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Mô tả thu gọn 4 dòng. */
function Description({ text, loading }: { text?: string; loading: boolean }) {
  const { c } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <View style={styles.description}>
        <View style={[styles.skeleton, { backgroundColor: c.skeleton }]} />
        <View style={[styles.skeleton, { backgroundColor: c.skeleton }]} />
        <View style={[styles.skeleton, styles.skeletonShort, { backgroundColor: c.skeleton }]} />
      </View>
    );
  }
  if (!text) {
    return (
      <View style={styles.description}>
        <Text style={[font.body, styles.italic, { color: c.muted }]}>Chưa có mô tả</Text>
      </View>
    );
  }
  // Không đo được số dòng thật trước khi vẽ nên ước lượng theo độ dài.
  const long = text.length > 200 || text.split('\n').length > 4;
  return (
    <View style={styles.description}>
      <Text
        selectable
        numberOfLines={expanded || !long ? undefined : 4}
        style={[font.body, styles.descText, { color: c.textSecondary }]}
      >
        {text}
      </Text>
      {long && (
        <Pressable onPress={() => setExpanded(v => !v)} hitSlop={8} style={styles.more}>
          <Text style={[font.label, { color: c.accent }]}>{expanded ? 'Thu gọn' : 'Xem thêm'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  top: { overflow: 'hidden' },
  shade: { opacity: 0.72 },
  topRow: { flexDirection: 'row', gap: space.lg, padding: space.lg, paddingTop: space.xl },
  cover: { width: 116, borderWidth: 2 },
  info: { flex: 1, gap: 6 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  star: { width: 13, height: 13 },
  ratingValue: { marginLeft: 2, fontWeight: '700' },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    maxWidth: '100%',
    marginTop: 2,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  sourceName: { flexShrink: 1, fontWeight: '600' },
  actions: { flexDirection: 'row', paddingHorizontal: space.sm, paddingTop: space.md },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.sm },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.6 },
  read: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 48,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    marginBottom: space.xs,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  readLabel: { flexShrink: 1, fontWeight: '700' },
  description: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.md, gap: 6 },
  descText: { lineHeight: 22 },
  italic: { fontStyle: 'italic' },
  more: { alignSelf: 'flex-start' },
  skeleton: { height: 12, borderRadius: 6 },
  skeletonShort: { width: '60%' },
  lock: {
    alignItems: 'center',
    gap: space.sm,
    margin: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
  },
  lockIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
