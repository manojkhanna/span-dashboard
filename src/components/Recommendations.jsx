const priorityStyles = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: 'text-red-500',
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-500',
  },
  low: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: 'text-emerald-500',
  },
}

export default function Recommendations({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">AI Recommendations</h3>
          <p className="text-xs text-stone-500 mt-0.5">Data-driven action items based on current metrics and trends</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
          {recommendations.length} item{recommendations.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, i) => {
          const style = priorityStyles[rec.priority] || priorityStyles['low']
          return (
            <div key={i} className={`rounded-lg border p-4 ${style.bg} ${style.border}`}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={style.icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {rec.priority === 'high' ? (
                      <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>
                    ) : rec.priority === 'medium' ? (
                      <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>
                    ) : (
                      <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>
                    )}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-stone-800">{rec.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${style.badge}`}>{rec.priority}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">{rec.category}</span>
                  </div>
                  <p className="text-xs text-stone-600 mb-1.5">{rec.description}</p>
                  <p className="text-xs text-stone-500 italic">Impact: {rec.impact}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
