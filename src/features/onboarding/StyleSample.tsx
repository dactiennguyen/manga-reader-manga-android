import type { ComponentType } from 'react';
import Svg, { Circle, Defs, Ellipse, Line, Path, Pattern, Rect } from 'react-native-svg';

import type { ArtStyle } from '../../model/types';

const PAPER = '#FFFFFF';
const INK = '#16161A';

function Shounen() {
  return (
    <>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <Line
            key={i}
            x1={50 + Math.cos(a) * 40}
            y1={50 + Math.sin(a) * 40}
            x2={50 + Math.cos(a) * 80}
            y2={50 + Math.sin(a) * 80}
            stroke={INK}
            strokeWidth={i % 2 ? 3 : 1.5}
          />
        );
      })}
      <Path d="M28 100 Q30 80 44 76 L56 76 Q70 80 72 100 Z" fill={INK} />
      <Path
        d="M30 50 Q30 76 50 80 Q70 76 70 50 Q70 30 50 30 Q30 30 30 50 Z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={3.5}
      />
      <Path d="M24 52 L20 22 L34 34 L38 10 L50 28 L60 8 L66 30 L82 18 L76 52 Q62 36 50 42 Q38 36 24 52 Z" fill={INK} />
      <Path d="M35 50 L46 54 M54 54 L65 50" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={41} cy={59} r={3} fill={INK} />
      <Circle cx={59} cy={59} r={3} fill={INK} />
      <Path d="M42 69 L58 69 L54 73 L46 73 Z" fill={INK} />
    </>
  );
}

function Shoujo() {
  const sparkle = (x: number, y: number, r: number) =>
    `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${
      y - r
    } Z`;
  return (
    <>
      <Path d={sparkle(16, 20, 8)} fill={INK} />
      <Path d={sparkle(86, 30, 6)} fill={INK} />
      <Path d={sparkle(84, 78, 4)} fill={INK} />
      <Circle cx={14} cy={70} r={5} fill="none" stroke={INK} strokeWidth={1} />
      <Path
        d="M26 100 Q14 70 26 44 Q32 22 50 22 Q68 22 74 44 Q86 70 74 100 Z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={1.2}
      />
      <Path
        d="M32 52 Q32 76 50 84 Q68 76 68 52 Q68 34 50 34 Q32 34 32 52 Z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={1.2}
      />
      <Path
        d="M30 54 Q34 34 50 38 Q66 34 70 54 Q62 44 50 46 Q40 44 30 54 Z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={1.2}
      />
      <Ellipse cx={41} cy={60} rx={5.5} ry={7.5} fill={INK} />
      <Ellipse cx={59} cy={60} rx={5.5} ry={7.5} fill={INK} />
      <Circle cx={43} cy={57} r={2.4} fill={PAPER} />
      <Circle cx={61} cy={57} r={2.4} fill={PAPER} />
      <Circle cx={39.5} cy={63.5} r={1.2} fill={PAPER} />
      <Circle cx={57.5} cy={63.5} r={1.2} fill={PAPER} />
      <Path d="M35 51 Q41 48 47 51 M53 51 Q59 48 65 51" stroke={INK} strokeWidth={1} fill="none" />
      <Path d="M47 74 Q50 76 53 74" stroke={INK} strokeWidth={1} fill="none" strokeLinecap="round" />
    </>
  );
}

function Seinen() {
  return (
    <>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
        <Line key={i} x1={-10 + i * 10} y1={0} x2={-40 + i * 10} y2={100} stroke={INK} strokeWidth={0.6} />
      ))}
      <Path d="M22 100 L30 84 L44 78 L56 78 L70 84 L78 100 Z" fill={INK} />
      <Path d="M43 70 L43 80 L57 80 L57 70 Z" fill={PAPER} stroke={INK} strokeWidth={1.5} />
      <Path
        d="M34 40 Q33 60 40 70 L47 76 L53 76 L60 70 Q67 60 66 40 Q64 22 50 22 Q36 22 34 40 Z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={1.8}
      />
      <Path d="M33 44 Q30 22 48 18 Q66 16 68 44 Q62 30 52 30 Q40 30 33 44 Z" fill={INK} />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <Line key={i} x1={56 + i * 1.6} y1={46 + i * 4} x2={64} y2={50 + i * 4} stroke={INK} strokeWidth={0.8} />
      ))}
      <Path d="M38 47 L46 48 M54 48 L62 47" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <Path d="M39 52 L45 52 M55 52 L61 52" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M50 52 L48 62 L51 63" stroke={INK} strokeWidth={1} fill="none" />
      <Path d="M45 69 L55 69" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
    </>
  );
}

function Chibi() {
  return (
    <>
      <Defs>
        <Pattern id="ssChibi" width={10} height={10} patternUnits="userSpaceOnUse">
          <Circle cx={5} cy={5} r={1.6} fill={INK} opacity={0.35} />
        </Pattern>
      </Defs>
      <Rect width={100} height={100} fill="url(#ssChibi)" />
      <Path d="M40 100 Q40 82 50 82 Q60 82 60 100 Z" fill={INK} />
      <Ellipse cx={50} cy={48} rx={34} ry={31} fill={PAPER} stroke={INK} strokeWidth={3} />
      <Path d="M16 46 Q14 14 50 14 Q86 14 84 46 Q72 30 58 34 L52 26 L46 34 Q28 30 16 46 Z" fill={INK} />
      <Circle cx={36} cy={54} r={6} fill={INK} />
      <Circle cx={64} cy={54} r={6} fill={INK} />
      <Circle cx={38} cy={52} r={2.2} fill={PAPER} />
      <Circle cx={66} cy={52} r={2.2} fill={PAPER} />
      <Ellipse cx={26} cy={63} rx={5} ry={2.5} fill={INK} opacity={0.25} />
      <Ellipse cx={74} cy={63} rx={5} ry={2.5} fill={INK} opacity={0.25} />
      <Path d="M45 64 Q50 71 55 64 Z" fill={INK} />
    </>
  );
}

function Horror() {
  return (
    <>
      <Rect width={100} height={100} fill={INK} />
      <Path d="M20 100 Q24 82 42 78 L58 78 Q76 82 80 100 Z" fill={PAPER} opacity={0.18} />
      <Path d="M32 46 Q32 74 50 82 Q68 74 68 46 Q68 26 50 26 Q32 26 32 46 Z" fill={PAPER} />
      <Path d="M50 26 Q68 26 68 46 Q68 74 50 82 Q58 60 50 26 Z" fill={INK} opacity={0.82} />
      <Path
        d="M28 60 Q22 24 50 18 Q78 24 72 60 Q68 34 58 32 L54 44 L50 30 L45 46 L41 32 Q32 36 28 60 Z"
        fill={INK}
        stroke={PAPER}
        strokeWidth={0.6}
      />
      <Ellipse cx={41} cy={54} rx={5} ry={6} fill={INK} />
      <Ellipse cx={59} cy={54} rx={5} ry={6} fill={PAPER} />
      <Circle cx={41} cy={55} r={1.4} fill={PAPER} />
      <Circle cx={59} cy={55} r={1.4} fill={INK} />
      <Path d="M41 70 L45 68 L48 71 L52 68 L55 71 L59 69" stroke={INK} strokeWidth={1.6} fill="none" />
      <Path d="M41 60 L40 72" stroke={INK} strokeWidth={1.4} />
      {[0, 1, 2, 3].map(i => (
        <Line key={i} x1={6 + i * 6} y1={0} x2={2 + i * 6} y2={30 + i * 12} stroke={PAPER} strokeWidth={0.7} />
      ))}
    </>
  );
}

function Slice() {
  return (
    <>
      <Circle cx={80} cy={22} r={9} fill="none" stroke={INK} strokeWidth={1} />
      <Path d="M6 86 L94 86" stroke={INK} strokeWidth={1} strokeDasharray="2 5" />
      <Path d="M30 100 Q32 82 44 80 L56 80 Q68 82 70 100" fill="none" stroke={INK} strokeWidth={1.6} />
      <Circle cx={50} cy={52} r={22} fill={PAPER} stroke={INK} strokeWidth={1.6} />
      <Path
        d="M28 50 Q30 28 50 28 Q70 28 72 50 Q60 38 44 42 Q34 44 28 50 Z"
        fill="none"
        stroke={INK}
        strokeWidth={1.6}
      />
      <Circle cx={42} cy={56} r={1.8} fill={INK} />
      <Circle cx={58} cy={56} r={1.8} fill={INK} />
      <Path d="M45 64 Q50 68 55 64" stroke={INK} strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </>
  );
}

const SAMPLES: Record<ArtStyle, ComponentType> = {
  shounen: Shounen,
  shoujo: Shoujo,
  seinen: Seinen,
  chibi: Chibi,
  horror: Horror,
  slice: Slice,
};

export function StyleSample({ style, size }: { style: ArtStyle; size: number }) {
  const Sample = SAMPLES[style];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect width={100} height={100} fill={PAPER} />
      <Sample />
    </Svg>
  );
}
