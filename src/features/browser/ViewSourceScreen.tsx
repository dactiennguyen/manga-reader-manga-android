import Clipboard from '@react-native-clipboard/clipboard';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../../app/routes';
import { ErrorView } from '../../components/ErrorView';
import { ChevronDown, ChevronUp, Copy, ListFilter, TextWrap } from '../../components/icons';
import { Header, IconButton, LoadingView, Screen, SearchField, toast } from '../../components/ui';
import { getText } from '../../lib/http';
import { displayUrl } from '../../lib/url';
import { space, useTheme } from '../../theme';

const MAX_COLS = 300;
const FONT_SIZE = 12;
const CHAR_WIDTH = FONT_SIZE * 0.62;
const MAX_COPY = 400000;
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

type Row = { key: number; line: number | null; text: string };

type LoadState = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; html: string };

function splitRows(html: string): Row[] {
  const rows: Row[] = [];
  html.split(/\r?\n/).forEach((text, i) => {
    if (text.length <= MAX_COLS) {
      rows.push({ key: rows.length, line: i + 1, text });
      return;
    }
    for (let pos = 0; pos < text.length; pos += MAX_COLS) {
      rows.push({ key: rows.length, line: pos === 0 ? i + 1 : null, text: text.slice(pos, pos + MAX_COLS) });
    }
  });
  return rows;
}

export function ViewSourceScreen() {
  const { c } = useTheme();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ViewSource'>>();
  const url = params.url;
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);
  const [filterOnly, setFilterOnly] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [height, setHeight] = useState(0);
  const listRef = useRef<FlashListRef<Row>>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getText(url)
      .then(html => !cancelled && setState({ status: 'ready', html }))
      .catch(error => !cancelled && setState({ status: 'error', error }));
    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const html = state.status === 'ready' ? state.html : '';
  const rows = useMemo(() => splitRows(html), [html]);
  const lineCount = rows.length ? rows.reduce((n, r) => (r.line ? n + 1 : n), 0) : 0;
  const gutter = Math.max(3, String(lineCount).length) * CHAR_WIDTH + space.md;
  const maxCols = useMemo(() => rows.reduce((n, r) => Math.max(n, r.text.length), 0), [rows]);

  const matches = useMemo(
    () => (term ? rows.filter(r => r.text.toLowerCase().includes(term)).map(r => r.key) : []),
    [rows, term],
  );
  const data = useMemo(() => {
    if (!filterOnly || !term) {
      return rows;
    }
    const hit = new Set(matches);
    return rows.filter(r => hit.has(r.key));
  }, [rows, matches, filterOnly, term]);
  const current = matches.length ? matches[Math.min(cursor, matches.length - 1)] : -1;

  useEffect(() => setCursor(0), [term]);

  useEffect(() => {
    if (current < 0) {
      return;
    }
    const index = filterOnly ? Math.min(cursor, matches.length - 1) : current;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 }).catch(() => {});
  }, [current, cursor, filterOnly, matches.length]);

  const step = (delta: 1 | -1) => {
    if (matches.length) {
      setCursor(i => (i + delta + matches.length) % matches.length);
    }
  };

  const copyAll = () => {
    if (!html) {
      return;
    }
    if (html.length > MAX_COPY) {
      toast('Mã nguồn quá lớn để sao chép toàn bộ');
      return;
    }
    Clipboard.setString(html);
    toast('Đã sao chép mã nguồn');
  };

  const renderText = (row: Row) => {
    if (!term || !row.text.toLowerCase().includes(term)) {
      return row.text;
    }
    const parts: (string | { hit: string; at: number })[] = [];
    const lower = row.text.toLowerCase();
    let pos = 0;
    let at = lower.indexOf(term);
    while (at >= 0) {
      if (at > pos) {
        parts.push(row.text.slice(pos, at));
      }
      parts.push({ hit: row.text.slice(at, at + term.length), at });
      pos = at + term.length;
      at = lower.indexOf(term, pos);
    }
    if (pos < row.text.length) {
      parts.push(row.text.slice(pos));
    }
    return parts.map((part, i) =>
      typeof part === 'string' ? (
        part
      ) : (
        <Text key={`${part.at}-${i}`} style={{ backgroundColor: c.accent, color: c.onAccent }}>
          {part.hit}
        </Text>
      ),
    );
  };

  const list = (
    <FlashList
      ref={listRef}
      data={data}
      keyExtractor={row => String(row.key)}
      extraData={`${term}|${current}`}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <View style={[styles.row, item.key === current && { backgroundColor: c.accentSoft }]}>
          <Text style={[styles.code, styles.lineNo, { width: gutter, color: c.muted }]}>
            {item.line ?? '↪'}
          </Text>
          <Text selectable style={[styles.code, styles.flex, { color: c.text }]}>
            {renderText(item)}
          </Text>
        </View>
      )}
    />
  );

  return (
    <Screen>
      <Header
        title="Mã nguồn"
        subtitle={displayUrl(url)}
        right={
          <>
            <IconButton
              icon={TextWrap}
              active={wrap}
              onPress={() => setWrap(w => !w)}
              accessibilityLabel="Tự xuống dòng"
            />
            <IconButton icon={Copy} disabled={!html} onPress={copyAll} accessibilityLabel="Sao chép toàn bộ" />
          </>
        }
      />
      {state.status === 'loading' && <LoadingView label="Đang tải mã nguồn…" />}
      {state.status === 'error' && <ErrorView error={state.error} url={url} onRetry={() => setAttempt(n => n + 1)} />}
      {state.status === 'ready' && (
        <>
          <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
            <SearchField
              value={search}
              onChangeText={setSearch}
              onClear={() => setSearch('')}
              placeholder="Tìm trong mã"
              onSubmitEditing={() => step(1)}
              style={styles.flex}
            />
            {!!term && (
              <Text style={[styles.counter, { color: matches.length ? c.muted : c.danger }]}>
                {matches.length ? `${Math.min(cursor, matches.length - 1) + 1}/${matches.length}` : '0/0'}
              </Text>
            )}
            <IconButton icon={ChevronUp} disabled={!matches.length} onPress={() => step(-1)} accessibilityLabel="Kết quả trước" />
            <IconButton icon={ChevronDown} disabled={!matches.length} onPress={() => step(1)} accessibilityLabel="Kết quả sau" />
            <IconButton
              icon={ListFilter}
              active={filterOnly}
              disabled={!term}
              onPress={() => setFilterOnly(f => !f)}
              accessibilityLabel="Chỉ hiện dòng khớp"
            />
          </View>
          <Text style={[styles.meta, { color: c.muted }]}>
            {`${lineCount} dòng · ${(html.length / 1024).toFixed(1)} KB`}
          </Text>
          <View style={styles.flex} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
            {wrap ? (
              list
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={{ width: gutter + maxCols * CHAR_WIDTH + space.xl, height }}>{list}</View>
              </ScrollView>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: space.md,
    paddingRight: space.xs,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  counter: { fontSize: 12, fontWeight: '700', marginLeft: space.xs },
  meta: { fontSize: 11, paddingHorizontal: space.md, paddingVertical: 4 },
  listContent: { paddingBottom: space.xl },
  row: { flexDirection: 'row', paddingRight: space.md },
  code: { fontFamily: MONO, fontSize: FONT_SIZE, lineHeight: FONT_SIZE * 1.5 },
  lineNo: { textAlign: 'right', paddingRight: space.sm },
});
