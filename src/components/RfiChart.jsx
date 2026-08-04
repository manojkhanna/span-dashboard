import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import MetricCard from './MetricCard'
import { computeRfiScore } from '../utils/healthScore'

function RfiIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
      <path d="M8 5v3M8 10v1" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-stone-800 mb-1">{d.month}</p>
      <p className="text-blue-600">Sent: {d.sent}</p>
      <p className="text-emerald-600">Resolved: {d.resolved}</p>
    </div>
  )
}

export default function RfiChart({ data }) {
  const score = computeRfiScore(data)

  return (
    <MetricCard title="RFI / Site Query Management" score={score} icon={<RfiIcon />}>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-stone-100 p-2 text-center">
          <div className="text-lg font-bold text-stone-800">{data.summary.total}</div>
          <div className="text-xs text-stone-500">Total</div>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2 text-center">
          <div className="text-lg font-bold text-emerald-600">{data.summary.closed}</div>
          <div className="text-xs text-stone-500">Closed</div>
        </div>
        <div className="rounded-lg bg-red-50 p-2 text-center">
          <div className="text-lg font-bold text-red-500">{data.summary.open}</div>
          <div className="text-xs text-stone-500">Open</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data.monthlyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fill: '#78716c', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.slice(5)}
          />
          <YAxis tick={{ fill: '#a8a29e', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168,162,158,0.08)' }} />
          <Bar dataKey="sent" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Bar dataKey="resolved" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
          <span className="text-xs text-stone-500">Sent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-xs text-stone-500">Resolved</span>
        </div>
      </div>
    </MetricCard>
  )
}
