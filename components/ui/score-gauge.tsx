"use client";

interface ScoreGaugeProps {
  score: number; // 0–1
  label: string;
  band: "low" | "medium" | "high";
  size?: number;
}

export function ScoreGauge({ score, label, band, size = 120 }: ScoreGaugeProps) {
  const pct = Math.min(1, Math.max(0, score));
  const radius = (size - 16) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference * (1 - pct);

  const trackColor = "#272d3d";
  const fillColor =
    band === "high" ? "#f05252" : band === "medium" ? "#f59e0b" : "#00c896";

  const cx = size / 2;
  const cy = size / 2 + 8;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size / 2 + 16}
        aria-label={`${label}: ${Math.round(pct * 100)}%`}
      >
        {/* Track */}
        <path
          d={`M ${8} ${cy} A ${radius} ${radius} 0 0 1 ${size - 8} ${cy}`}
          fill="none"
          stroke={trackColor}
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${8} ${cy} A ${radius} ${radius} 0 0 1 ${size - 8} ${cy}`}
          fill="none"
          stroke={fillColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        {/* Score text */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill={fillColor}
          fontSize="20"
          fontWeight="700"
          fontFamily="var(--font-mono)"
        >
          {Math.round(pct * 100)}
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
