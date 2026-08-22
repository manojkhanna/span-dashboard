const severityStyles = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'bg-red-500',
    title: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    label: 'Critical',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'bg-amber-500',
    title: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Warning',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'bg-blue-500',
    title: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Info',
  },
}

export default function RiskFlags({ risks }) {
  if (!risks || risks.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-800">No Active Risk Flags</h3>
            <p className="text-xs text-emerald-600 mt-0.5">All metrics are within healthy ranges or trending positively.</p>
          </div>
        </div>
      </div>
    )
  }

  const critCount = risks.filter(r => r.severity === 'critical').length
  const warnCount = risks.filter(r => r.severity === 'warning').length

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Early Warning Flags</h3>
          <p className="text-xs text-stone-500 mt-0.5">Predictive risk indicators from trend analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {critCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{critCount} critical</span>
          )}
          {warnCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{warnCount} warning</span>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {risks.map((risk, i) => {
          const style = severityStyles[risk.severity] || severityStyles['info']
          return (
            <div key={i} className={`rounded-lg border p-3 ${style.bg} ${style.border}`}>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full ${style.icon} flex items-center justify-center shrink-0 mt-0.5`}>
                  {risk.severity === 'critical' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 9v4M12 17h.01" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-medium ${style.title}`}>{risk.message}</span>
                  </div>
                  <p className="text-xs text-stone-600">{risk.detail}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
                    <span className="text-xs text-stone-400">Score: {risk.score}</span>
                    <span className="text-xs text-stone-400">Trend: {risk.trend > 0 ? '+' : ''}{risk.trend.toFixed(1)}/mo</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
