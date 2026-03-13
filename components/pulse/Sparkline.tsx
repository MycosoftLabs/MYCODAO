"use client";

type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
  className?: string;
};

export default function Sparkline({ data, width = 80, height = 24, positive, className = "" }: SparklineProps) {
  if (!data?.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const color = positive === undefined ? "currentColor" : positive ? "#22c55e" : "#ef4444";

  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  );
}
