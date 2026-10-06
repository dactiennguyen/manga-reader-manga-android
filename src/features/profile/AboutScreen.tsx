import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { version } from '../../../package.json';
import { Halftone } from '../../components/comic';
import { PenLine } from '../../components/icons';
import { Header, ListItem, Screen, Section } from '../../components/ui';
import { font, radius, space, useTheme } from '../../theme';

const CREDITS = [
  { name: 'Anton', license: 'SIL Open Font License 1.1', use: 'Display typeface' },
  { name: 'Be Vietnam Pro', license: 'SIL Open Font License 1.1', use: 'Lettering typeface' },
  { name: 'Patrick Hand', license: 'SIL Open Font License 1.1', use: 'Handwriting typeface' },
  { name: 'Material Icons', license: 'Apache License 2.0', use: 'Icons' },
];

export function AboutScreen() {
  const { c } = useTheme();
  return (
    <Screen>
      <Header title="About" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.brand}>
            <View style={[styles.logoShadow, { backgroundColor: c.ink }]} />
            <View style={[styles.logo, { backgroundColor: c.surface, borderColor: c.ink }]}>
              <Halftone />
              <PenLine size={40} color={c.accent} />
            </View>
          </View>
          <Text style={[font.display, { color: c.text }]}>Mangaka AI</Text>
          <Text style={[font.label, styles.version, { color: c.textSecondary }]}>Version {version}</Text>
          <Text style={[font.body, styles.tagline, { color: c.textSecondary }]}>
            Make a manga chapter right on your phone: write the script, lay out panels, draw, letter and export.
          </Text>
        </View>
        <Section title="Credits" footer="Fonts and icons are used under their authors' open-source licenses.">
          {CREDITS.map(item => (
            <ListItem key={item.name} title={item.name} subtitle={`${item.use} · ${item.license}`} />
          ))}
        </Section>
        <Text style={[font.caption, styles.foot, { color: c.muted }]}>Your stories are saved on this device.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xl * 2 },
  hero: { alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.lg },
  brand: { width: 92, height: 92, marginBottom: space.lg },
  logoShadow: { position: 'absolute', left: 4, top: 4, width: 88, height: 88, borderRadius: radius.lg },
  logo: {
    width: 88,
    height: 88,
    borderWidth: 2,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  version: { marginTop: space.xs },
  tagline: { marginTop: space.md, textAlign: 'center', lineHeight: 22 },
  foot: { textAlign: 'center', marginTop: space.lg },
});
