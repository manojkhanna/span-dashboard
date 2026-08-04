import MetricCard from './MetricCard'
import { computeChangeOrderScore } from '../utils/healthScore'

function CoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M10 5l3 3-3 3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ChangeOrderCard({ data }) {
  const score = computeChangeOrderScore(data)
  const co = data.changeOrders
  const rate = co.submitted > 0 ? Math.round((co.approved / co.submitted) * 100) : 100

  return (
    <MetricCard title="Change / Variation Orders" score={score} icon={<CoIcon />}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">Submitted</span>
          <span className="text-sm font-semibold text-stone-800">{co.submitted}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">Approved</span>
          <span className="text-sm font-semibold text-emerald-600">{co.approved}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">Rejected</span>
          <span className="text-sm font-semibold text-red-500">{co.rejected}</span>
        </div>
        <div className={`mt-3 rounded-lg border p-3 ${rate >= 80 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className={`text-xs font-medium ${rate >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>{rate}% Approval Rate</div>
          <div className="text-xs text-stone-500 mt-1">
            {co.rejected > 0 ? `${co.rejected} rejected — review scope alignment` : 'All submitted orders approved'}
          </div>
        </div>
      </div>
    </MetricCard>
  )
}
