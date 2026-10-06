import { StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { Divider, PanelShape, Pt, Size } from '../../engine/layout';
import type { ID } from '../../model/types';
import { useTheme } from '../../theme';
import { handlePoints } from './pageEdit';

const points = (shape: PanelShape) => shape.poly.map(p => `${p.x},${p.y}`).join(' ');

export function PageOverlay({
  size,
  k,
  shapes,
  selectedIds,
  labels,
  draftShapes,
  dividers,
  activeSplitId,
  cutLine,
  safeGrid,
}: {
  size: Size;
  k: number;
  shapes: PanelShape[];
  selectedIds: ID[];
  labels?: Record<ID, string>;
  draftShapes?: PanelShape[] | null;
  dividers?: Divider[];
  activeSplitId?: ID | null;
  cutLine?: { p0: Pt; p1: Pt } | null;
  safeGrid?: boolean;
}) {
  const { c } = useTheme();
  const u = 1 / k;
  const r = 11 * u;
  return (
    <Svg
      width={size.w * k}
      height={size.h * k}
      viewBox={`0 0 ${size.w} ${size.h}`}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {safeGrid && (
        <Rect
          x={size.w * 0.05}
          y={size.h * 0.05}
          width={size.w * 0.9}
          height={size.h * 0.9}
          fill="none"
          stroke={c.accent}
          strokeWidth={u}
          strokeDasharray={`${6 * u} ${4 * u}`}
        />
      )}
      {draftShapes?.map(shape => (
        <Polygon
          key={`d${shape.id}`}
          points={points(shape)}
          fill="#FFFFFF"
          fillOpacity={0.55}
          stroke={c.accent}
          strokeWidth={2 * u}
          strokeDasharray={`${6 * u} ${4 * u}`}
        />
      ))}
      {shapes
        .filter(shape => selectedIds.includes(shape.id))
        .map(shape => (
          <Polygon key={`s${shape.id}`} points={points(shape)} fill="none" stroke={c.accent} strokeWidth={3 * u} />
        ))}
      {(draftShapes ?? shapes).map(shape => {
        const label = labels ? labels[shape.id] : `${shape.index + 1}`;
        const cx = shape.bbox.x + r + 6 * u;
        const cy = shape.bbox.y + r + 6 * u;
        return (
          <G key={`n${shape.id}`}>
            <Circle cx={cx} cy={cy} r={r} fill={labels && label ? c.accent : '#16161A'} />
            <SvgText x={cx} y={cy + 4 * u} fontSize={12 * u} fontWeight="700" fill="#FFFFFF" textAnchor="middle">
              {label || '·'}
            </SvgText>
          </G>
        );
      })}
      {dividers?.map(divider => {
        const h = handlePoints(divider);
        const active = divider.splitId === activeSplitId;
        return (
          <G key={divider.splitId}>
            <Line
              x1={divider.a.x}
              y1={divider.a.y}
              x2={divider.b.x}
              y2={divider.b.y}
              stroke={c.accent}
              strokeWidth={(active ? 2 : 1) * u}
              strokeDasharray={`${5 * u} ${4 * u}`}
            />
            <Circle cx={h.mid.x} cy={h.mid.y} r={9 * u} fill={c.accent} stroke="#FFFFFF" strokeWidth={2 * u} />
            <Circle cx={h.t0.x} cy={h.t0.y} r={5 * u} fill="#FFFFFF" stroke={c.accent} strokeWidth={2 * u} />
            <Circle cx={h.t1.x} cy={h.t1.y} r={5 * u} fill="#FFFFFF" stroke={c.accent} strokeWidth={2 * u} />
          </G>
        );
      })}
      {cutLine && (
        <Line
          x1={cutLine.p0.x}
          y1={cutLine.p0.y}
          x2={cutLine.p1.x}
          y2={cutLine.p1.y}
          stroke={c.accent}
          strokeWidth={2.5 * u}
          strokeDasharray={`${8 * u} ${5 * u}`}
        />
      )}
    </Svg>
  );
}
