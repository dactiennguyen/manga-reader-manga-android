import { Group, Path, Picture, Rect, Skia } from '@shopify/react-native-skia';
import { memo, useMemo, useSyncExternalStore } from 'react';

import { liveStrokePath, recordLayerContent, strokePaint } from '../../engine/art';
import { boxCorners, isFillTool, transformBox, type Box, type LayerTransform } from '../../engine/artMath';
import type { ArtLayer } from '../../model/types';
import type { LiveStore, TransformStore } from './canvasShared';

function LiveStroke({ store }: { store: LiveStore }) {
  const stroke = useSyncExternalStore(store.subscribe, store.get);
  const path = stroke ? liveStrokePath(stroke) : null;
  if (!stroke || !path) {
    return null;
  }
  const fill = isFillTool(stroke.tool);
  return (
    <>
      <Path path={path} paint={strokePaint(stroke)} />
      {fill ? <Path path={path} style="stroke" strokeWidth={1} color={stroke.color} opacity={0.6} antiAlias /> : null}
    </>
  );
}

function groupTransform(t: LayerTransform | null) {
  return t ? [{ translateX: t.tx }, { translateY: t.ty }, { scale: t.s }] : undefined;
}

export function TransformFrame({
  store,
  layer,
  bounds,
  color,
  viewScale,
}: {
  store: TransformStore;
  layer: ArtLayer;
  bounds: Box;
  color: string;
  viewScale: number;
}) {
  const current = useSyncExternalStore(store.subscribe, store.get);
  const box = current && current.layer === layer ? transformBox(bounds, current.t) : bounds;
  const unit = 1 / Math.max(0.0001, viewScale);
  const half = 7 * unit;
  return (
    <>
      <Rect x={box.x} y={box.y} width={box.w} height={box.h} style="stroke" strokeWidth={1.5 * unit} color={color} />
      {boxCorners(box).map((corner, index) => (
        <Group key={index}>
          <Rect x={corner.x - half} y={corner.y - half} width={half * 2} height={half * 2} color="#FFFFFF" />
          <Rect
            x={corner.x - half}
            y={corner.y - half}
            width={half * 2}
            height={half * 2}
            style="stroke"
            strokeWidth={2 * unit}
            color={color}
          />
        </Group>
      ))}
    </>
  );
}

function LayerContent({
  picture,
  layer,
  store,
}: {
  picture: ReturnType<typeof recordLayerContent>;
  layer: ArtLayer;
  store: TransformStore;
}) {
  const current = useSyncExternalStore(store.subscribe, store.get);
  return (
    <Group transform={groupTransform(current && current.layer === layer ? current.t : null)}>
      <Picture picture={picture} />
    </Group>
  );
}

export const LayerNode = memo(function LayerNodeInner({
  layer,
  live,
  transform,
  imageRev,
}: {
  layer: ArtLayer;
  live: LiveStore | null;
  transform: TransformStore | null;
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
      {transform ? <LayerContent picture={picture} layer={layer} store={transform} /> : <Picture picture={picture} />}
      {live ? <LiveStroke store={live} /> : null}
    </Group>
  );
});
