const typeColors = {
  beams: '#3b82f6',
  columns: '#6366f1',
  members: '#22c55e',
  plates: '#8b5cf6',
  fasteners: '#f59e0b',
  other: '#a8a29e',
}

const typeLabels = {
  beams: 'Beams',
  columns: 'Columns',
  members: 'Members',
  plates: 'Plates',
  fasteners: 'Fasteners',
  other: 'Other',
}

export default function IfcModelSummary({ data }) {
  if (!data) return null

  const { totalElements, totalWeightTons, elementTypes, zones, memberTypes, source, software } = data
  const totalTyped = Object.values(elementTypes).reduce((a, b) => a + b, 0)
  const zoneEntries = Object.entries(zones).sort((a, b) => b[1].weight_tons - a[1].weight_tons)
  const maxZoneWeight = Math.max(...zoneEntries.map(([, z]) => z.weight_tons))
  const topMemberTypes = Object.entries(memberTypes).slice(0, 6)
  const maxMT = Math.max(...topMemberTypes.map(([, v]) => v))

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">BIM Model Summary</h3>
          <p className="text-xs text-stone-500 mt-0.5">Extracted from IFC model ({software})</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">IFC Data</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <div className="text-xl font-bold text-blue-700">{totalElements.toLocaleString()}</div>
          <div className="text-xs text-stone-500">Total Elements</div>
        </div>
        <div className="rounded-lg bg-teal-50 p-3 text-center">
          <div className="text-xl font-bold text-teal-700">{totalWeightTons.toLocaleString()}</div>
          <div className="text-xs text-stone-500">Total Weight (tons)</div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-medium text-stone-600 mb-2">Element Breakdown</h4>
        <div className="flex h-4 rounded-full overflow-hidden">
          {Object.entries(elementTypes).map(([type, count]) => (
            <div
              key={type}
              style={{ width: `${(count / totalTyped) * 100}%`, backgroundColor: typeColors[type] }}
              title={`${typeLabels[type]}: ${count.toLocaleString()}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {Object.entries(elementTypes).map(([type, count]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors[type] }} />
              <span className="text-xs text-stone-500">{typeLabels[type]} ({count.toLocaleString()})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-medium text-stone-600 mb-2">Weight by Zone (tons)</h4>
        <div className="space-y-1.5">
          {zoneEntries.map(([zone, z]) => (
            <div key={zone} className="flex items-center gap-2">
              <span className="text-xs text-stone-500 w-28 shrink-0 truncate">{zone}</span>
              <div className="flex-1 h-3 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-brand"
                  style={{ width: `${(z.weight_tons / maxZoneWeight) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-stone-700 w-16 text-right">{z.weight_tons.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-stone-600 mb-2">Member Types</h4>
        <div className="space-y-1">
          {topMemberTypes.map(([type, count]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="text-xs text-stone-500 w-28 shrink-0 truncate">{type}</span>
              <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-400" style={{ width: `${(count / maxMT) * 100}%` }} />
              </div>
              <span className="text-xs text-stone-500 w-14 text-right">{count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400">
        Source: {source}
      </div>
    </div>
  )
}
