import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import MetricCard from './MetricCard'
import { computeResourceScore } from '../utils/healthScore'

function ResourceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="2.5" stroke="#0891b2" strokeWidth="1.5" fill="none" />
      <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export default function ResourceCard({ data }) {
  const score = computeResourceScore(data)
  const chartData = data.manCount.map(m => ({
    week: m.week.slice(5),
    count: m.count,
  }))
  const avgCount = Math.round(data.manCount.reduce((s, m) => s + m.count, 0) / data.manCount.length)
  const maxCount = Math.max(...data.manCount.map(m => m.count))

  return (
    <MetricCard title="Resource Utilization" score={score} icon={<ResourceIcon />}>
      <div className="flex gap-4 mb-4">
        <div className="flex-1 rounded-lg bg-cyan-50 p-2 text-center">
          <div className="text-lg font-bold text-cyan-700">{avgCount}</div>
          <div className="text-xs text-stone-500">Avg. Count</div>
        </div>
        <div className="flex-1 rounded-lg bg-stone-100 p-2 text-center">
          <div className="text-lg font-bold text-stone-800">{data.manCount.length}</div>
          <div className="text-xs text-stone-500">Weeks Tracked</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="week" tick={{ fill: '#78716c', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#a8a29e', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, maxCount + 5]} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #d6d3d1', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#44403c' }}
          />
          <Line type="monotone" dataKey="count" stroke="#0891b2" strokeWidth={2} dot={{ fill: '#0891b2', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </MetricCard>
  )
}
