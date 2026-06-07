import { useId } from 'react';

interface RadarAxis {
  label: string;
  value: number; // 0-99
}

interface Props {
  axes: RadarAxis[];
  size?: number;
}

// Lightweight dependency-free SVG radar for the 8 OVR categories.
// Premium pass (WS4): gold gradient fill, vertex dots, per-axis value chips.
export function RadarChart({ axes, size = 280 }: Props) {
  const uid = useId().replace(/[:]/g, '');
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 44;
  const n = axes.length;

  const point = (i: number, frac: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * r * frac, cy + Math.sin(angle) * r * frac];
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const valuePts = axes.map((a, i) => point(i, Math.max(0.05, a.value / 99)));
  const valuePoly = valuePts.map((p) => p.join(',')).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Attribute radar"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`${uid}-fill`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,215,0,0.42)" />
          <stop offset="100%" stopColor="rgba(212,168,83,0.14)" />
        </radialGradient>
      </defs>

      {/* grid rings */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => point(i, ring).join(',')).join(' ')}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />
      ))}
      {/* spokes */}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border-subtle)" strokeWidth={1} />;
      })}

      {/* value polygon */}
      <polygon points={valuePoly} fill={`url(#${uid}-fill)`} stroke="var(--gold-primary)" strokeWidth={2.5} strokeLinejoin="round" />
      {/* vertex dots */}
      {valuePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="var(--gold-glow)" />
      ))}

      {/* axis labels + values */}
      {axes.map((a, i) => {
        const [lx, ly] = point(i, 1.2);
        const anchor = lx < cx - 1 ? 'end' : lx > cx + 1 ? 'start' : 'middle';
        return (
          <g key={a.label}>
            <text
              x={lx}
              y={ly - 5}
              fontSize={10}
              fontWeight={600}
              fill="var(--text-secondary)"
              textAnchor={anchor}
              dominantBaseline="middle"
            >
              {a.label}
            </text>
            <text
              x={lx}
              y={ly + 7}
              fontSize={11}
              fontWeight={700}
              fill="var(--gold-primary)"
              textAnchor={anchor}
              dominantBaseline="middle"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {a.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
