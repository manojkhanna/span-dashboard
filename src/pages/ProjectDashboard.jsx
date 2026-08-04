import { useParams, Link } from 'react-router-dom'
import { getProjectData } from '../data/projects'
import { computeOverallHealth } from '../utils/healthScore'
import { detectRisks, generateRecommendations } from '../utils/predictions'
import HealthGauge from '../components/HealthGauge'
import HealthTrend from '../components/HealthTrend'
import RiskFlags from '../components/RiskFlags'
import ForecastChart from '../components/ForecastChart'
import ScheduleVariance from '../components/ScheduleVariance'
import Recommendations from '../components/Recommendations'
import ProgressChart from '../components/ProgressChart'
import ErrorChart from '../components/ErrorChart'
import RfiChart from '../components/RfiChart'
import ChangeOrderCard from '../components/ChangeOrderCard'
import ResourceCard from '../components/ResourceCard'
import WeightBreakdown from '../components/WeightBreakdown'
import RfiBySequence from '../components/RfiBySequence'
import ExternalErrors from '../components/ExternalErrors'
import IfcModelSummary from '../components/IfcModelSummary'

const dimensionLabels = {
  progress: 'Progress',
  quality: 'Quality',
  rfi: 'RFI',
  changeOrder: 'Change Orders',
  resource: 'Resources',
}

export default function ProjectDashboard() {
  const { id } = useParams()
  const data = getProjectData(id)

  if (!data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-stone-800 mb-2">Project not found</h2>
          <Link to="/" className="text-teal-brand hover:underline text-sm">Back to Portfolio</Link>
        </div>
      </div>
    )
  }

  const { project, progress, errors, rfi, history, schedule, ifc } = data
  const { overall, scores, weights } = computeOverallHealth(data)
  const risks = detectRisks(history, scores)
  const recommendations = generateRecommendations({ scores, risks, rfi, errors, project, progress, schedule })

  return (
    <div className="min-h-screen bg-cream print:bg-white">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-50 print:static print:bg-white print:backdrop-blur-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src="/iitd-logo.png" alt="IIT Delhi" className="h-9 w-9 object-contain" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link to="/" className="text-xs text-stone-400 hover:text-teal-brand transition-colors print:hidden">Portfolio</Link>
                <span className="text-xs text-stone-300 print:hidden">/</span>
                <h1 className="text-base font-semibold text-stone-900 leading-tight">{project.name}</h1>
              </div>
              <p className="text-xs text-stone-500">Predictive Project Health Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-stone-800">{project.client}</p>
              <p className="text-xs text-stone-500">PM: {project.projectManager}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="print:hidden px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
            >
              Export PDF
            </button>
            <img src="/industry50-logo.png" alt="Industry 5.0" className="h-9 object-contain hidden sm:block" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Row 1: Health overview + Risk flags */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col items-center">
            <h2 className="text-sm font-semibold text-stone-800 mb-1">Overall Project Health</h2>
            <p className="text-xs text-stone-500 mb-4">Weighted composite score</p>
            <HealthGauge score={overall} size="lg" />
            <div className="w-full mt-6 space-y-2">
              {Object.entries(scores).map(([key, score]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 w-24">{dimensionLabels[key]}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${score}%`,
                        backgroundColor: score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-stone-700 w-8 text-right">{score}</span>
                  <span className="text-xs text-stone-400 w-8 text-right">{Math.round(weights[key] * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-800 mb-3">Project Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-stone-500">Project Manager</span>
                  <span className="text-xs font-medium text-stone-800">{project.projectManager}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-stone-500">Team Leader</span>
                  <span className="text-xs font-medium text-stone-800">{project.teamLeader}</span>
                </div>
                {project.totalWeight > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-stone-500">Total Weight</span>
                    <span className="text-xs font-medium text-stone-800">{project.totalWeight} tons</span>
                  </div>
                )}
                {project.totalArea > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-stone-500">Total Area</span>
                    <span className="text-xs font-medium text-stone-800">{project.totalArea.toLocaleString()} sqft</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-stone-500">Sequences</span>
                  <span className="text-xs font-medium text-stone-800">{progress.length}</span>
                </div>
              </div>
            </div>
            <RiskFlags risks={risks} />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <ExternalErrors data={errors} />
            <ChangeOrderCard data={project} />
          </div>
        </div>

        {/* Row 2: Health trend + Schedule variance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-before-page">
          <HealthTrend history={history} />
          <ScheduleVariance schedule={schedule} />
        </div>

        {/* Row 3: IFC Model Summary (if available) */}
        {ifc && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IfcModelSummary data={ifc} />
            <WeightBreakdown data={progress} project={project} />
          </div>
        )}

        {/* Row 4: Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ForecastChart progress={progress} history={history} />
          {!ifc && <WeightBreakdown data={progress} project={project} />}
        </div>

        {/* Row 4: Progress + Errors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-before-page">
          <ProgressChart data={progress} />
          <ErrorChart data={errors} />
        </div>

        {/* Row 5: RFI + Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RfiChart data={rfi} />
          <div className="flex flex-col gap-6">
            <ResourceCard data={project} />
            <RfiBySequence data={rfi} />
          </div>
        </div>

        {/* Row 6: AI Recommendations */}
        <div className="print:break-before-page">
          <Recommendations recommendations={recommendations} />
        </div>

        <footer className="py-6 border-t border-stone-200">
          <div className="flex items-center justify-center gap-6">
            <img src="/iitd-logo.png" alt="IIT Delhi" className="h-8 w-8 object-contain" />
            <p className="text-xs text-stone-400">
              SPAN — Structural Process Accountability Network | Group 5 | IIT Delhi
            </p>
            <img src="/industry50-logo.png" alt="Industry 5.0" className="h-8 object-contain" />
          </div>
        </footer>
      </main>
    </div>
  )
}
