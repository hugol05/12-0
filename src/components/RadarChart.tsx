interface RadarAxis {
  label: string;
  value: number; // 0-99
}

interface Props {
  axes: RadarAxis[];
  size?: number;
}

// Lightweight dependency-free SVG radar for the 8 OVR categories.
export function RadarChart({ axes, size = 260 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const n = axes.length;

  const point = (i: number, frac: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * r * frac, cy + Math.sin(angle) * r * frac];
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const valuePoly = axes.map((a, i) => point(i, Math.max(0.05, a.value / 99)).join(',')).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Attribute radar">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => point(i, ring).join(',')).join(' ')}
          fill="none"
          stroke="#23232f"
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#23232f" strokeWidth={1} />;
      })}
      <polygon points={valuePoly} fill="rgba(212,168,83,0.25)" stroke="var(--gold-primary)" strokeWidth={2} />
      {axes.map((a, i) => {
        const [x, y] = point(i, 1.16);
        return (
          <text
            key={a.label}
            x={x}
            y={y}
            fontSize={10}
            fill="#8a8a9a"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
