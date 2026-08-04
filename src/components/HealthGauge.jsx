import { getHealthStatus } from '../utils/healthScore'

export default function HealthGauge({ score, label, size = 'lg' }) {
  const status = getHealthStatus(score)
  const isLarge = size === 'lg'
  const radius = isLarge ? 70 : 36
  const stroke = isLarge ? 10 : 6
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  const viewSize = (radius + stroke) * 2

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: viewSize, height: viewSize }}>
        <svg width={viewSize} height={viewSize} className="-rotate-90">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="#E8E2D9"
            strokeWidth={stroke}
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={status.color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${isLarge ? 'text-4xl' : 'text-lg'}`} style={{ color: status.color }}>
            {score}
          </span>
          {isLarge && <span className="text-xs text-stone-500 uppercase tracking-wider mt-1">{status.label}</span>}
        </div>
      </div>
      {label && (
        <span className={`text-stone-500 ${isLarge ? 'text-sm mt-1' : 'text-xs'}`}>{label}</span>
      )}
    </div>
  )
}
