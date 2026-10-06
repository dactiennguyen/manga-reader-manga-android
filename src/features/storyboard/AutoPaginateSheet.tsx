import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ComicCard } from '../../components/comic';
import { X } from '../../components/icons';
import { Button, Header, IconButton, Screen, Stepper } from '../../components/ui';
import { SHOT_LABEL } from '../../model/constants';
import { paginate, type PagePlan } from '../../model/paginate';
import type { Block, ID, Scene } from '../../model/types';
import { font, space, useTheme } from '../../theme';

export function AutoPaginateSheet({
  visible,
  scenes,
  skipBlockIds,
  firstPageNumber,
  onClose,
  onApply,
}: {
  visible: boolean;
  scenes: Scene[];
  skipBlockIds: Set<ID>;
  firstPageNumber: number;
  onClose: () => void;
  onApply: (plans: PagePlan[]) => void;
}) {
  const { c } = useTheme();
  const [pages, setPages] = useState<number | null>(null);
  const natural = useMemo(() => paginate(scenes, { skipBlockIds }), [scenes, skipBlockIds]);
  const plans = useMemo(
    () => (pages === null ? natural : paginate(scenes, { pages, skipBlockIds })),
    [scenes, skipBlockIds, pages, natural],
  );
  const blocks = useMemo(() => {
    const map: Record<ID, Block> = {};
    for (const scene of scenes) {
      for (const block of scene.blocks) {
        map[block.id] = block;
      }
    }
    return map;
  }, [scenes]);
  const panelTotal = plans.reduce((sum, plan) => sum + plan.panels.length, 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen>
        <Header
          title="Auto-paginate"
          subtitle={`${plans.length} pages · ${panelTotal} panels`}
          hideBack
          right={<IconButton icon={X} color={c.onAppBar} onPress={onClose} accessibilityLabel="Close" />}
        />
        <View style={[styles.countRow, { borderBottomColor: c.border }]}>
          <Text style={[font.label, styles.flex, { color: c.text }]}>Pages</Text>
          <Stepper value={pages ?? natural.length} onChange={setPages} min={1} max={80} />
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {plans.length === 0 && (
            <Text style={[font.body, { color: c.textSecondary }]}>Nothing left in the script to paginate.</Text>
          )}
          {plans.map((plan, index) => (
            <ComicCard key={index} style={styles.card}>
              <Text style={[font.overline, { color: c.accent }]}>
                PAGE {firstPageNumber + index} · {plan.panels.length} panels
              </Text>
              {plan.panels.map((panel, panelIndex) => (
                <View key={panelIndex} style={[styles.panel, { borderTopColor: c.border }]}>
                  <Text style={[font.label, { color: c.text }]}>
                    Panel {panelIndex + 1}
                    {panel.shot ? ` · ${SHOT_LABEL[panel.shot]}` : ''}
                  </Text>
                  {!!panel.description && (
                    <Text style={[font.body, { color: c.textSecondary }]}>{panel.description}</Text>
                  )}
                  {panel.blockIds
                    .map(id => blocks[id])
                    .filter(
                      block =>
                        block && (block.type === 'dialogue' || block.type === 'narration' || block.type === 'sfx'),
                    )
                    .map(block => (
                      <Text
                        key={block.id}
                        style={[font.caption, styles.line, { color: c.text, borderLeftColor: c.ink }]}
                      >
                        {block.type === 'dialogue' ? `“${block.text}”` : block.text}
                      </Text>
                    ))}
                </View>
              ))}
            </ComicCard>
          ))}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.surface }]}>
          <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.flex} />
          <Button
            title={`Apply ${plans.length} pages`}
            disabled={plans.length === 0}
            onPress={() => onApply(plans)}
            style={styles.flex}
          />
        </View>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  list: { padding: space.lg, gap: space.md },
  card: { padding: space.md, gap: space.sm },
  panel: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm, gap: space.xs },
  line: { borderLeftWidth: 2, paddingLeft: space.sm },
  footer: { flexDirection: 'row', gap: space.md, padding: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
