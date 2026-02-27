interface Props {
  score: number
  size?: number
}

export function ScoreCircle({ score, size = 38 }: Props) {
  const color =
    score >= 80 ? '#ef4444'
    : score >= 60 ? '#f97316'
    : score >= 40 ? '#eab308'
    : score >= 20 ? '#6366f1'
    : '#6b7280'

  const r = (size / 2) - 4
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(score, 100) / 100)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ overflow: 'visible' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="currentColor" strokeWidth="2.5"
          className="text-border"
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute font-bold tabular-nums"
        style={{ color, fontSize: size < 32 ? 9 : 10 }}
      >
        {score}
      </span>
    </div>
  )
}
