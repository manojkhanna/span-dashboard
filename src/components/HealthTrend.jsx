import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts'
import { forecastHealth } from '../utils/predictions'

const DIMS = [
  { key: 'overall', color: '#1B6354', label: 'Overall', strokeWidth: 2.5 },
  { key: 'progress', color: '#3b82f6', label: 'Progress' },
  { key: 'quality', color: '#f59e0b', label: 'Quality' },
  { key: 'rfi', color: '#8b5cf6', label: 'RFI' },
  { key: 'changeOrder', color: '#22c55e', label: 'CO' },
  { key: 'resource', color: '#06b6d4', label: 'Team' },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const isForecast = payload[0]?.payload?.forecast
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-stone-700 mb-1.5">
        {label} {isForecast && <span className="text-amber-600 font-normal">(Forecast)</span>}
      </p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-stone-500 w-14">{DIMS.find(d => d.key === p.dataKey)?.label}</span>
          <span className="font-medium text-stone-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function HealthTrend({ history }) {
  if (!history || history.length < 2) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-800">Health Trend</h3>
        <p className="text-xs text-stone-400 mt-2">Insufficient historical data for trend analysis.</p>
      </div>
    )
  }

  const forecast = forecastHealth(history, 3)
  const lastActual = history[history.length - 1].month
  const combined = [...history.map(h => ({ ...h, forecast: false })), ...forecast]

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Health Score Trend & Forecast</h3>
          <p className="text-xs text-stone-500 mt-0.5">Historical scores with 3-month projection</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-stone-400" />
            <span className="text-stone-500">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-stone-400 border-t border-dashed" style={{ borderTopStyle: 'dashed' }} />
            <span className="text-stone-500">Forecast</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={combined} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#a8a29e' }}
            tickFormatter={m => {
              const [, mo] = m.split('-')
              const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              return names[parseInt(mo)]
            }}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a8a29e' }} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
          {forecast.length > 0 && (
            <ReferenceArea
              x1={lastActual}
              x2={forecast[forecast.length - 1].month}
              fill="#F7F4EF"
              fillOpacity={0.8}
            />
          )}
          {DIMS.map(d => (
            <Line
              key={d.key}
              type="monotone"
              dataKey={d.key}
              stroke={d.color}
              strokeWidth={d.strokeWidth || 1.5}
              dot={{ r: 2, fill: d.color }}
              activeDot={{ r: 4 }}
              strokeDasharray={undefined}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {DIMS.map(d => (
          <div key={d.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-stone-500">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
