import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { Button, Divider } from '../../components/ui';
import { formatRelative } from '../../lib/time';
import type { ID } from '../../model/types';
import { listScriptVersions } from '../../store/scriptHistory';
import type { ScriptVersion } from '../../store/scriptHistory';
import { font, space, useTheme } from '../../theme';

export function VersionsSheet({
  visible,
  chapterId,
  onClose,
  onRestore,
}: {
  visible: boolean;
  chapterId: ID;
  onClose: () => void;
  onRestore: (version: ScriptVersion) => void;
}) {
  const { c } = useTheme();
  const versions = useMemo(() => (visible ? listScriptVersions(chapterId) : []), [visible, chapterId]);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Version history"
      subtitle="Saved each time you open or leave the script"
    >
      <View style={styles.body}>
        {versions.length === 0 && (
          <Text style={[styles.empty, { color: c.muted }]}>
            No versions yet. One is saved each time you open or leave the script.
          </Text>
        )}
        {versions.map((version, index) => {
          const blocks = version.scenes.reduce((sum, scene) => sum + scene.blocks.length, 0);
          const first = version.scenes.flatMap(scene => scene.blocks).find(block => block.text.trim());
          return (
            <View key={version.at}>
              {index > 0 && <Divider />}
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={[styles.time, { color: c.text }]}>{formatRelative(version.at)}</Text>
                  <Text style={[styles.meta, { color: c.muted }]}>
                    {version.scenes.length} scenes · {blocks} blocks
                  </Text>
                  {first && (
                    <Text style={[styles.preview, { color: c.textSecondary }]} numberOfLines={2}>
                      {first.text.trim()}
                    </Text>
                  )}
                </View>
                <Button title="Restore" variant="secondary" small onPress={() => onRestore(version)} />
              </View>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  empty: { ...font.body, paddingVertical: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  info: { flex: 1, gap: 2 },
  time: { ...font.label },
  meta: { ...font.caption },
  preview: { ...font.caption },
});
