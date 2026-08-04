import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import MetricCard from './MetricCard'
import { computeProgressScore } from '../utils/healthScore'

const phaseColors = {
  'Approval': '#22c55e',
  'Re-Approval': '#f59e0b',
  'Approval Submitted': '#3b82f6',
  'In Progress': '#8b5cf6',
  'Awaiting RFI': '#ef4444',
}

function ProgressIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="10" width="3" height="5" rx="0.5" fill="#3b82f6" />
      <rect x="5.5" y="6" width="3" height="9" rx="0.5" fill="#3b82f6" />
      <rect x="10" y="2" width="3" height="13" rx="0.5" fill="#3b82f6" />
    </svg>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-stone-800 mb-1">{d.sequence}</p>
      {d.weight > 0 && <p className="text-stone-500">Weight: {d.weight} tons</p>}
      {d.area > 0 && <p className="text-stone-500">Area: {d.area} sqft</p>}
      <p className="text-stone-500">Contribution: {(d.contribution * 100).toFixed(1)}%</p>
      <p className="text-stone-500">Approval: {d.approvalPct}%</p>
      <p style={{ color: phaseColors[d.phase] || '#78716c' }}>Phase: {d.phase}</p>
    </div>
  )
}

export default function ProgressChart({ data }) {
  const score = computeProgressScore(data)

  return (
    <MetricCard title="Sequence Progress" score={score} icon={<ProgressIcon />}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="sequence" tick={{ fill: '#78716c', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fill: '#a8a29e', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 10]} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168,162,158,0.08)' }} />
          <Bar dataKey="totalProgress" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((entry, i) => (
              <Cell key={i} fill={phaseColors[entry.phase] || '#a8a29e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(phaseColors).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs text-stone-500">{label}</span>
          </div>
        ))}
      </div>
    </MetricCard>
  )
}
