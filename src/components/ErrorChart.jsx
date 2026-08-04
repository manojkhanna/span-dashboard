import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import MetricCard from './MetricCard'
import { computeQualityScore } from '../utils/healthScore'

function QualityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7L8 1z" fill="#f59e0b" />
    </svg>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-stone-800 mb-1">{d.month}</p>
      <p className="text-red-600">Cat A (Critical): {d.catA}</p>
      <p className="text-amber-600">Cat B (Major): {d.catB}</p>
      <p className="text-stone-600">Total: {d.total}</p>
    </div>
  )
}

export default function ErrorChart({ data }) {
  const score = computeQualityScore(data)
  const monthlyData = data.internal.byMonth

  return (
    <MetricCard title="Quality (Internal Errors)" score={score} icon={<QualityIcon />}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fill: '#78716c', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.slice(5)}
          />
          <YAxis tick={{ fill: '#a8a29e', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="total" stroke="#ef4444" fill="url(#errGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="catA" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {data.internal.byResourceType.map(r => (
          <div key={r.type} className="rounded-lg bg-stone-100 p-2 text-center">
            <div className="text-lg font-bold text-stone-800">{r.total}</div>
            <div className="text-xs text-stone-500">{r.type}s</div>
          </div>
        ))}
      </div>
    </MetricCard>
  )
}
