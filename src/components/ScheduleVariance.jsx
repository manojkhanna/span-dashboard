const statusStyles = {
  completed: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Completed' },
  'in-progress': { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', label: 'In Progress' },
  delayed: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', label: 'Delayed' },
  upcoming: { dot: 'bg-stone-400', text: 'text-stone-600', bg: 'bg-stone-50', label: 'Upcoming' },
}

function daysDiff(planned, actual) {
  if (!actual) return null
  const d1 = new Date(planned)
  const d2 = new Date(actual)
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

export default function ScheduleVariance({ schedule }) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-800">Schedule Variance</h3>
        <p className="text-xs text-stone-400 mt-2">No milestone data available.</p>
      </div>
    )
  }

  const completed = schedule.filter(m => m.status === 'completed')
  const delayed = schedule.filter(m => m.status === 'delayed')
  const inProgress = schedule.filter(m => m.status === 'in-progress')
  const upcoming = schedule.filter(m => m.status === 'upcoming')

  const avgVariance = completed.length > 0
    ? completed.reduce((s, m) => s + (daysDiff(m.planned, m.actual) || 0), 0) / completed.length
    : 0

  const onTime = completed.filter(m => (daysDiff(m.planned, m.actual) || 0) <= 0).length
  const late = completed.filter(m => (daysDiff(m.planned, m.actual) || 0) > 0).length

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Schedule Variance</h3>
          <p className="text-xs text-stone-500 mt-0.5">Planned vs. actual milestone tracking</p>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${avgVariance <= 0 ? 'text-emerald-600' : avgVariance <= 7 ? 'text-amber-600' : 'text-red-600'}`}>
            {avgVariance > 0 ? '+' : ''}{avgVariance.toFixed(0)}d
          </div>
          <div className="text-xs text-stone-400">avg variance</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="rounded-lg bg-emerald-50 p-2 text-center">
          <div className="text-base font-bold text-emerald-700">{onTime}</div>
          <div className="text-xs text-stone-500">On Time</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-2 text-center">
          <div className="text-base font-bold text-amber-700">{late}</div>
          <div className="text-xs text-stone-500">Late</div>
        </div>
        <div className="rounded-lg bg-red-50 p-2 text-center">
          <div className="text-base font-bold text-red-700">{delayed.length}</div>
          <div className="text-xs text-stone-500">Delayed</div>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 text-center">
          <div className="text-base font-bold text-blue-700">{inProgress.length + upcoming.length}</div>
          <div className="text-xs text-stone-500">Pending</div>
        </div>
      </div>

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
        {schedule.map((m, i) => {
          const style = statusStyles[m.status]
          const variance = daysDiff(m.planned, m.actual)
          return (
            <div key={i} className={`flex items-center gap-3 rounded-lg p-2 ${style.bg}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-stone-800 truncate">{m.milestone}</p>
                <p className="text-xs text-stone-400 truncate">{m.sequence}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-stone-500">{m.planned}</p>
                {variance !== null && (
                  <p className={`text-xs font-medium ${variance <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {variance > 0 ? `+${variance}d late` : variance === 0 ? 'On time' : `${Math.abs(variance)}d early`}
                  </p>
                )}
                {variance === null && m.status === 'delayed' && (
                  <p className="text-xs font-medium text-red-600">Overdue</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
