import { Group, Path, Picture, Skia } from '@shopify/react-native-skia';
import { memo, useMemo, useSyncExternalStore } from 'react';

import { isOutlineTool, liveStrokePath, recordLayerContent } from '../../engine/art';
import type { ArtLayer } from '../../model/types';
import type { LiveStore } from './canvasShared';

function LiveStroke({ store }: { store: LiveStore }) {
  const stroke = useSyncExternalStore(store.subscribe, store.get);
  const path = stroke ? liveStrokePath(stroke) : null;
  if (!stroke || !path) {
    return null;
  }
  const eraser = stroke.tool === 'eraser';
  const outline = isOutlineTool(stroke.tool);
  return (
    <Path
      path={path}
      color={eraser ? '#000000' : stroke.color}
      opacity={eraser ? 1 : stroke.opacity}
      blendMode={eraser ? 'clear' : 'srcOver'}
      style={outline ? 'fill' : 'stroke'}
      strokeWidth={stroke.size}
      strokeCap="round"
      strokeJoin="round"
      antiAlias
    />
  );
}

export const LayerNode = memo(function LayerNodeInner({
  layer,
  live,
  imageRev,
}: {
  layer: ArtLayer;
  live: LiveStore | null;
  imageRev: number;
}) {
  const { strokes, image, opacity, visible } = layer;
  const picture = useMemo(
    () => recordLayerContent({ strokes, image }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [strokes, image, imageRev],
  );
  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setAlphaf(opacity);
    return p;
  }, [opacity]);
  if (!visible) {
    return null;
  }
  return (
    <Group layer={paint}>
      <Picture picture={picture} />
      {live ? <LiveStroke store={live} /> : null}
    </Group>
  );
});
