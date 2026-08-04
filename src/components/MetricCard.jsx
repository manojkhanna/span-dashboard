import { getHealthStatus } from '../utils/healthScore'

export default function MetricCard({ title, score, icon, children }) {
  const status = getHealthStatus(score)

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
          <span className="text-sm font-bold" style={{ color: status.color }}>{score}</span>
        </div>
      </div>
      {children}
    </div>
  )
}
