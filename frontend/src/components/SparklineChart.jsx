import { useMemo } from 'react';

// Tiny SVG sparkline component — no dependencies needed
export default function SparklineChart({ data = [], width = 60, height = 24, positive = true }) {
  const pathD = useMemo(() => {
    if (!data || data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    
    return data.map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [data, width, height]);

  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-surface rounded" />;
  }

  const color = positive ? 'var(--gain)' : 'var(--loss)';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <path d={pathD} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
