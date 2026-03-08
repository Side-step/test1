"use client";

interface TrustScoreGaugeProps {
  score: number;
}

export default function TrustScoreGauge({ score }: TrustScoreGaugeProps) {
  const getColor = () => {
    if (score >= 80) return { main: "#00d2a0", bg: "rgba(0,210,160,0.15)", label: "Excellent" };
    if (score >= 60) return { main: "#6c5ce7", bg: "rgba(108,92,231,0.15)", label: "Good" };
    if (score >= 40) return { main: "#ffc107", bg: "rgba(255,193,7,0.15)", label: "Fair" };
    return { main: "#ff4757", bg: "rgba(255,71,87,0.15)", label: "Low" };
  };

  const { main, bg, label } = getColor();

  // SVG arc for circular gauge
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[88px] w-[88px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88">
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="#2a2a40"
            strokeWidth="6"
          />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={main}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color: main }}>
            {score}
          </span>
        </div>
      </div>
      <div
        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{ backgroundColor: bg, color: main }}
      >
        {label}
      </div>
    </div>
  );
}
