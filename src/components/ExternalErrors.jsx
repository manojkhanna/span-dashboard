const categoryColors = {
  A: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: 'Critical' },
  B: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', label: 'Major' },
  C: { bg: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-200', label: 'Minor' },
}

export default function ExternalErrors({ data }) {
  const grouped = {}
  data.external.forEach(e => {
    grouped[e.category] = (grouped[e.category] || 0) + e.count
  })
  const total = Object.values(grouped).reduce((a, b) => a + b, 0)

  const types = {}
  data.external.forEach(e => {
    types[e.type] = (types[e.type] || 0) + e.count
  })

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-800">External Errors (Client)</h3>
        <span className="text-xs text-stone-500">{total} total</span>
      </div>
      <div className="space-y-2">
        {Object.entries(grouped).sort().map(([cat, count]) => {
          const style = categoryColors[cat] || categoryColors['C']
          return (
            <div key={cat} className={`flex items-center justify-between rounded-lg border p-3 ${style.bg} ${style.border}`}>
              <div>
                <span className={`text-sm font-medium ${style.text}`}>Category {cat}</span>
                <span className="text-xs text-stone-500 ml-2">({style.label})</span>
              </div>
              <span className={`text-lg font-bold ${style.text}`}>{count}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 text-xs text-stone-400">
        {Object.entries(types).map(([type, count], i) => (
          <span key={type}>{i > 0 ? ', ' : ''}{type} ({count})</span>
        ))}
      </div>
    </div>
  )
}
