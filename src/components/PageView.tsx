import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { usePagePicture, type PageDrawOptions } from '../engine/page';
import type { ID } from '../model/types';
import { useTheme } from '../theme';

export function PageView({
  pageId,
  width,
  options,
  style,
  children,
}: {
  pageId: ID;
  width: number;
  options?: PageDrawOptions;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const { picture, ctx } = usePagePicture(pageId, options);
  if (!ctx) {
    return null;
  }
  const scale = width / ctx.size.w;
  const height = ctx.size.h * scale;
  return (
    <View style={[styles.page, { width, height }, style]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ scale }]}>{picture && <Picture picture={picture} />}</Group>
        {children}
      </Canvas>
      {!ctx.page.layout && <View style={[StyleSheet.absoluteFill, styles.outline, { borderColor: c.border }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#FFFFFF' },
  outline: { borderWidth: 1 },
});
