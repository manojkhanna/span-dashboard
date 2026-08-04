import { Link } from 'react-router-dom'
import { getAllProjects, getProjectData } from '../data/projects'
import { computeOverallHealth, getHealthStatus } from '../utils/healthScore'
import HealthGauge from '../components/HealthGauge'

const domainLabels = {
  repair: { label: 'Repair & Retrofit', color: '#B06A1A', bg: 'bg-amber-50 text-amber-700' },
  bim: { label: 'BIM / Structural', color: '#1B6354', bg: 'bg-teal-50 text-teal-700' },
}

function getDomain(project) {
  return domainLabels[project.domain] || domainLabels.bim
}

export default function Portfolio() {
  const projects = getAllProjects()

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-brand flex items-center justify-center">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-stone-900 leading-tight">SPAN</h1>
              <p className="text-xs text-stone-500">Portfolio Health Overview</p>
            </div>
          </div>
          <Link
            to="/upload"
            className="px-4 py-2 rounded-lg bg-teal-brand hover:bg-teal-brand/90 text-sm font-medium text-white transition-colors shadow-sm"
          >
            + Add Project
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-1">Project Portfolio</h2>
          <p className="text-sm text-stone-500">
            {projects.length} project{projects.length !== 1 ? 's' : ''} across structural engineering and repair domains
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map(proj => {
            const data = getProjectData(proj.id)
            if (!data) return null
            const { overall, scores } = computeOverallHealth(data)
            const status = getHealthStatus(overall)
            const domain = getDomain(proj)

            return (
              <Link
                key={proj.id}
                to={`/project/${proj.id}`}
                className="group rounded-xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-stone-300 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${domain.bg}`}>
                        {domain.label}
                      </span>
                      {!proj.builtin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">Uploaded</span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-stone-900 truncate group-hover:text-teal-brand transition-colors">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-stone-500 truncate mt-0.5">{proj.client}</p>
                  </div>
                  <HealthGauge score={overall} size="sm" />
                </div>

                <div className="space-y-1.5">
                  {Object.entries(scores).map(([key, score]) => {
                    const labels = { progress: 'Progress', quality: 'Quality', rfi: 'RFI', changeOrder: 'CO', resource: 'Team' }
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-stone-400 w-16">{labels[key]}</span>
                        <div className="flex-1 h-1 rounded-full bg-stone-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${score}%`,
                              backgroundColor: score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="text-xs text-stone-500 w-6 text-right">{score}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-400">PM: {proj.projectManager}</span>
                  <span className="text-xs text-stone-400 group-hover:text-teal-brand transition-colors">View Dashboard →</span>
                </div>
              </Link>
            )
          })}

          <Link
            to="/upload"
            className="rounded-xl border-2 border-dashed border-stone-300 p-6 flex flex-col items-center justify-center gap-3 hover:border-teal-brand/50 hover:bg-white transition-all min-h-[280px]"
          >
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-stone-600">Add New Project</p>
              <p className="text-xs text-stone-400 mt-1">Upload Excel / CSV data</p>
            </div>
          </Link>
        </div>

        <footer className="text-center py-8 mt-8 border-t border-stone-200">
          <p className="text-xs text-stone-400">
            SPAN — Structural Process Accountability Network | Group 5 | IIT Delhi
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Capstone Project | Guide: Prof. Sunil Jha
          </p>
        </footer>
      </main>
    </div>
  )
}
