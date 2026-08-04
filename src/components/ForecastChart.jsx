import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { computeSequenceForecasts } from '../utils/predictions'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-stone-700 mb-1">{d.sequence}</p>
      <div className="space-y-0.5 text-stone-500">
        <p>Current: <span className="text-stone-800 font-medium">{d.currentProgress}%</span></p>
        <p>Velocity: <span className="text-stone-800 font-medium">{d.velocity}%/mo</span></p>
        <p>Est. Complete: <span className="text-stone-800 font-medium">{d.estimatedCompletion}</span></p>
        <p>Months Left: <span className="text-stone-800 font-medium">{d.monthsToComplete}</span></p>
      </div>
    </div>
  )
}

export default function ForecastChart({ progress, history }) {
  const forecasts = computeSequenceForecasts(progress, history)

  if (forecasts.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-800">Completion Forecast</h3>
        <p className="text-xs text-stone-400 mt-2">Insufficient data for forecasting.</p>
      </div>
    )
  }

  const maxMonths = Math.max(...forecasts.map(f => f.monthsToComplete))

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Completion Forecast by Sequence</h3>
          <p className="text-xs text-stone-500 mt-0.5">Projected months to 100% based on velocity</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={forecasts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#a8a29e' }}
            tickFormatter={v => `${v}mo`}
            domain={[0, Math.max(maxMonths + 2, 6)]}
          />
          <YAxis
            type="category"
            dataKey="sequence"
            width={90}
            tick={{ fontSize: 9, fill: '#78716c' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="monthsToComplete" radius={[0, 4, 4, 0]} barSize={16}>
            {forecasts.map((f, i) => (
              <Cell
                key={i}
                fill={f.monthsToComplete <= 3 ? '#22c55e' : f.monthsToComplete <= 6 ? '#f59e0b' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 space-y-1.5">
        {forecasts.map(f => (
          <div key={f.sequence} className="flex items-center justify-between text-xs">
            <span className="text-stone-500 truncate w-28">{f.sequence}</span>
            <div className="flex items-center gap-4">
              <span className="text-stone-400">{f.currentProgress}% done</span>
              <span className="text-stone-400">{f.velocity}%/mo</span>
              <span className={`font-medium ${
                f.monthsToComplete <= 3 ? 'text-emerald-600' : f.monthsToComplete <= 6 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {f.monthsToComplete === 0 ? 'Complete' : f.estimatedCompletion}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-3 justify-end text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-stone-500">≤3 mo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span className="text-stone-500">3-6 mo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className="text-stone-500">&gt;6 mo</span>
        </div>
      </div>
    </div>
  )
}
