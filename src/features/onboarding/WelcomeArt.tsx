import type { ReactNode } from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Pattern, Rect } from 'react-native-svg';

const PAPER = '#FFFFFF';
const INK = '#16161A';
const PENCIL = '#9AA3B5';

export type WelcomeArtKind = 'write' | 'draw' | 'finish';

function Tone({ id, size = 6, dot = 1 }: { id: string; size?: number; dot?: number }) {
  return (
    <Pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
      <Circle cx={size / 4} cy={size / 4} r={dot} fill={INK} />
      <Circle cx={(size * 3) / 4} cy={(size * 3) / 4} r={dot} fill={INK} />
    </Pattern>
  );
}

function Figure({ x, y, scale = 1, sketch }: { x: number; y: number; scale?: number; sketch?: boolean }) {
  const stroke = sketch ? PENCIL : INK;
  const width = sketch ? 1.2 : 2.6;
  const dash = sketch ? '4 3' : undefined;
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      {sketch && (
        <>
          <Line x1={-26} y1={0} x2={26} y2={0} stroke={PENCIL} strokeWidth={0.8} />
          <Line x1={0} y1={-28} x2={0} y2={30} stroke={PENCIL} strokeWidth={0.8} />
          <Circle cx={0} cy={0} r={27} stroke={PENCIL} strokeWidth={0.8} fill="none" strokeDasharray="2 3" />
        </>
      )}
      <Path
        d="M-30 62 Q-28 34 -10 28 L10 28 Q28 34 30 62 Z"
        fill={sketch ? 'none' : INK}
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={dash}
        strokeLinejoin="round"
      />
      <Circle
        cx={0}
        cy={0}
        r={22}
        fill={sketch ? 'none' : PAPER}
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={dash}
      />
      <Path
        d="M-24 -2 L-20 -26 L-9 -16 L-2 -32 L6 -17 L17 -28 L24 -3 Q10 -14 0 -9 Q-12 -14 -24 -2 Z"
        fill={sketch ? 'none' : INK}
        stroke={stroke}
        strokeWidth={sketch ? width : 1.5}
        strokeDasharray={dash}
        strokeLinejoin="round"
      />
      <Circle cx={-8} cy={3} r={sketch ? 2 : 2.8} fill={stroke} />
      <Circle cx={8} cy={3} r={sketch ? 2 : 2.8} fill={stroke} />
      <Path d="M-6 12 Q0 16 6 12" stroke={stroke} strokeWidth={sketch ? 1 : 1.8} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Bubble({ cx, cy, rx, ry, tail }: { cx: number; cy: number; rx: number; ry: number; tail: 'left' | 'right' }) {
  const dir = tail === 'left' ? -1 : 1;
  const tx = cx + dir * rx * 0.45;
  const ty = cy + ry * 0.8;
  return (
    <G>
      <Path
        d={`M${tx - 6} ${ty} L${tx + dir * 10} ${ty + 14} L${tx + 6} ${ty} Z`}
        fill={PAPER}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={PAPER} stroke={INK} strokeWidth={2} />
      <Rect x={tx - 5} y={ty - 3} width={10} height={3} fill={PAPER} />
      <Rect x={cx - rx * 0.55} y={cy - 5} width={rx * 1.1} height={2.5} rx={1} fill={INK} />
      <Rect x={cx - rx * 0.4} y={cy + 2} width={rx * 0.8} height={2.5} rx={1} fill={INK} />
    </G>
  );
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Rect x={6} y={6} width={194} height={254} fill={INK} />
      <Rect x={1.5} y={1.5} width={194} height={254} fill={PAPER} stroke={INK} strokeWidth={3} />
      {children}
    </>
  );
}

function WriteArt() {
  const lines = [150, 132, 158, 120, 144, 96];
  return (
    <PageFrame>
      <Defs>
        <Tone id="waWrite" />
      </Defs>
      {lines.map((w, i) => (
        <Rect key={i} x={20} y={22 + i * 13} width={w} height={4} rx={2} fill={INK} opacity={1 - i * 0.13} />
      ))}
      <Path
        d="M150 96 L176 70 L184 78 L158 104 L147 107 Z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Line x1={98} y1={104} x2={98} y2={118} stroke={INK} strokeWidth={2} strokeDasharray="3 3" />
      <Path d="M92 114 L98 122 L104 114" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Rect x={14} y={128} width={96} height={114} fill="url(#waWrite)" stroke={INK} strokeWidth={2.5} />
      <Figure x={62} y={182} scale={0.9} />
      <Rect x={118} y={128} width={66} height={52} fill={PAPER} stroke={INK} strokeWidth={2.5} />
      <Bubble cx={151} cy={148} rx={24} ry={13} tail="left" />
      <Rect x={118} y={188} width={66} height={54} fill={INK} stroke={INK} strokeWidth={2.5} />
      {[0, 1, 2, 3, 4].map(i => (
        <Line key={i} x1={122 + i * 14} y1={240} x2={150} y2={192} stroke={PAPER} strokeWidth={1.4} />
      ))}
    </PageFrame>
  );
}

function DrawArt() {
  return (
    <PageFrame>
      <Defs>
        <Tone id="waDraw" size={7} dot={1.1} />
      </Defs>
      <Rect x={14} y={14} width={170} height={108} fill={PAPER} stroke={PENCIL} strokeWidth={2} strokeDasharray="6 4" />
      <Figure x={72} y={58} scale={0.9} sketch />
      <Path
        d="M118 96 L160 40 L170 48 L128 104 L115 108 Z"
        fill={PAPER}
        stroke={PENCIL}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M88 124 L99 136 L110 124" stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Rect x={14} y={140} width={170} height={102} fill="url(#waDraw)" stroke={INK} strokeWidth={2.5} />
      <Figure x={72} y={184} scale={0.9} />
      <Path d="M122 218 Q150 150 176 164 Q150 178 136 226 Z" fill={INK} />
      <Circle cx={160} cy={156} r={4} fill={INK} />
      <Circle cx={171} cy={200} r={2.5} fill={INK} />
    </PageFrame>
  );
}

function FinishArt() {
  return (
    <PageFrame>
      <Defs>
        <Tone id="waFinish" />
      </Defs>
      <Rect x={14} y={14} width={170} height={92} fill="url(#waFinish)" stroke={INK} strokeWidth={2.5} />
      <Figure x={56} y={56} scale={0.8} />
      <Bubble cx={134} cy={44} rx={36} ry={18} tail="left" />
      <Path d="M14 116 L104 116 L92 242 L14 242 Z" fill={PAPER} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <Line key={i} x1={18} y1={130 + i * 20} x2={56} y2={176} stroke={INK} strokeWidth={1.2} />
      ))}
      <Bubble cx={62} cy={144} rx={24} ry={13} tail="right" />
      <Path
        d="M114 116 L184 116 L184 242 L102 242 Z"
        fill={INK}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <Circle cx={146} cy={176} r={24} fill={PAPER} />
      <Circle cx={138} cy={172} r={3} fill={INK} />
      <Circle cx={154} cy={172} r={3} fill={INK} />
      <Path d="M136 184 Q146 194 156 184" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path
        d="M122 168 L128 144 L140 156 L148 140 L156 156 L168 146 L170 168 Q146 152 122 168 Z"
        fill={INK}
        stroke={PAPER}
        strokeWidth={1.5}
      />
      <Rect x={124} y={216} width={44} height={14} fill={PAPER} stroke={INK} strokeWidth={1.5} />
      <Rect x={130} y={221.5} width={32} height={3} rx={1.5} fill={INK} />
    </PageFrame>
  );
}

export function WelcomeArt({ kind, width, height }: { kind: WelcomeArtKind; width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 202 262">
      {kind === 'write' ? <WriteArt /> : kind === 'draw' ? <DrawArt /> : <FinishArt />}
    </Svg>
  );
}
