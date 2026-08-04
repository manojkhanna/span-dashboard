export default function RfiBySequence({ data }) {
  const maxTotal = Math.max(...data.bySequence.map(s => s.total))

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-800 mb-4">RFI by Sequence</h3>
      <div className="space-y-2">
        {data.bySequence.map(s => (
          <div key={s.sequence} className="flex items-center gap-3">
            <span className="text-xs text-stone-500 w-24 shrink-0 truncate">{s.sequence}</span>
            <div className="flex-1 flex h-5 rounded overflow-hidden bg-stone-100">
              <div
                className="h-full rounded-l"
                style={{ width: `${(s.closed / maxTotal) * 100}%`, backgroundColor: '#22c55e' }}
              />
              {s.open > 0 && (
                <div
                  className="h-full"
                  style={{ width: `${(s.open / maxTotal) * 100}%`, backgroundColor: '#ef4444' }}
                />
              )}
            </div>
            <span className="text-xs font-medium text-stone-700 w-8 text-right">{s.total}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 justify-end">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-xs text-stone-500">Closed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className="text-xs text-stone-500">Open</span>
        </div>
      </div>
    </div>
  )
}
