const colors = ['#3b82f6', '#8b5cf6', '#0891b2', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#78716c']

export default function WeightBreakdown({ data, project }) {
  const isRepair = project.domain === 'repair'
  const withSize = isRepair
    ? data.filter(s => s.area > 0)
    : data.filter(s => s.weight > 0)

  if (withSize.length === 0) return null

  const totalSize = withSize.reduce((s, v) => s + (isRepair ? v.area : v.weight), 0)
  const unitLabel = isRepair ? 'sqft' : 'tons'

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-800 mb-4">
        {isRepair ? 'Area' : 'Weight'} Distribution ({totalSize.toLocaleString()} {unitLabel})
      </h3>
      <div className="flex h-4 rounded-full overflow-hidden bg-stone-100 mb-4">
        {withSize.map((s, i) => (
          <div
            key={s.sequence}
            style={{
              width: `${((isRepair ? s.area : s.weight) / totalSize) * 100}%`,
              backgroundColor: colors[i % colors.length],
            }}
            title={`${s.sequence}: ${(isRepair ? s.area : s.weight).toLocaleString()}${isRepair ? ' sqft' : 't'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {withSize.map((s, i) => (
          <div key={s.sequence} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-xs text-stone-500 truncate">{s.sequence}</span>
            <span className="text-xs font-medium text-stone-700 ml-auto">
              {(isRepair ? s.area : s.weight).toLocaleString()}{isRepair ? '' : 't'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
