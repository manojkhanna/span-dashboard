import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getConnectors, simulateSync } from '../data/mockConnectors'

function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StatusBadge({ status }) {
  const styles = {
    connected: 'bg-emerald-500',
    syncing: 'bg-amber-500 animate-pulse',
    disconnected: 'bg-stone-400',
  }
  const labels = {
    connected: 'Connected',
    syncing: 'Syncing...',
    disconnected: 'Disconnected',
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-stone-600">
      <span className={`w-2 h-2 rounded-full ${styles[status] || styles.disconnected}`} />
      {labels[status] || status}
    </span>
  )
}

function SyncLogEntry({ entry }) {
  const statusIcon = {
    success: (
      <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm3.22 4.72a.75.75 0 00-1.06-1.06L7 7.82 5.84 6.66a.75.75 0 00-1.06 1.06l1.69 1.7a.75.75 0 001.06 0l3.7-3.7z" />
      </svg>
    ),
    warning: (
      <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm0 3.5a.75.75 0 00-.75.75v3a.75.75 0 001.5 0v-3A.75.75 0 008 4.5zM8 11a.75.75 0 100-1.5.75.75 0 000 1.5z" />
      </svg>
    ),
    error: (
      <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm2.47 4.47a.75.75 0 00-1.06 0L8 6.88 6.59 5.47a.75.75 0 10-1.06 1.06L6.94 8l-1.41 1.47a.75.75 0 101.06 1.06L8 9.12l1.41 1.41a.75.75 0 001.06-1.06L9.06 8l1.41-1.47a.75.75 0 000-1.06z" />
      </svg>
    ),
  }

  return (
    <div className="flex items-start gap-2 py-2 border-b border-stone-100 last:border-0">
      <div className="mt-0.5">{statusIcon[entry.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-stone-500">{timeAgo(entry.timestamp)}</span>
          <span className="text-xs font-medium text-stone-700">{entry.itemsSynced} items</span>
        </div>
        <p className="text-xs text-stone-400 mt-0.5 truncate">{entry.details}</p>
      </div>
    </div>
  )
}

function ConfigPanel({ config }) {
  return (
    <div className="mt-4 pt-4 border-t border-stone-100">
      <h4 className="text-xs font-semibold text-stone-600 mb-3">Configuration</h4>
      <div className="space-y-2">
        {Object.entries(config).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-xs text-stone-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            {typeof value === 'boolean' ? (
              <span className={`text-xs font-medium ${value ? 'text-emerald-600' : 'text-stone-400'}`}>
                {value ? 'Enabled' : 'Disabled'}
              </span>
            ) : (
              <span className="text-xs text-stone-700 font-mono bg-stone-50 px-2 py-0.5 rounded truncate max-w-[200px]">
                {value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ConnectorCard({ connector, onSync }) {
  const [syncing, setSyncing] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [data, setData] = useState(connector)

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setData(prev => ({ ...prev, status: 'syncing' }))
    const result = await onSync(data.id)
    if (result) {
      setData(result)
    }
    setSyncing(false)
  }, [data.id, onSync])

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{data.icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-stone-800">{data.name}</h3>
            <StatusBadge status={syncing ? 'syncing' : data.status} />
          </div>
        </div>
        <span className="text-xs text-stone-400">
          {data.syncFrequency === 'hourly' ? 'Every hour' : data.syncFrequency === 'daily' ? 'Daily' : 'Manual'}
        </span>
      </div>

      <p className="text-xs text-stone-500 mb-4 leading-relaxed">{data.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {data.dataTypes.map(dt => (
          <span key={dt} className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
            {dt}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-stone-400">
          Last sync: <span className="text-stone-600 font-medium">{timeAgo(data.lastSync)}</span>
        </span>
        {data.syncLog.length > 0 && (
          <span className="text-xs text-stone-400">
            {data.syncLog[0].itemsSynced} items
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex-1 px-3 py-2 rounded-lg bg-teal-brand hover:bg-teal-brand/90 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          {syncing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 8a7 7 0 0112.9-3.8M15 8a7 7 0 01-12.9 3.8" />
                <path d="M14 1v3.2h-3.2M2 15v-3.2h3.2" />
              </svg>
              Sync Now
            </>
          )}
        </button>
        <button
          onClick={() => { setShowConfig(v => !v); setShowLog(false) }}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            showConfig
              ? 'bg-stone-800 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Configure
        </button>
      </div>

      <button
        onClick={() => { setShowLog(v => !v); setShowConfig(false) }}
        className="w-full text-left flex items-center justify-between py-2 text-xs text-stone-500 hover:text-stone-700 transition-colors"
      >
        <span>Sync History ({data.syncLog.length})</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${showLog ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {showLog && (
        <div className="mt-1 rounded-lg bg-stone-50 p-3">
          {data.syncLog.slice(0, 5).map((entry, i) => (
            <SyncLogEntry key={i} entry={entry} />
          ))}
        </div>
      )}

      {showConfig && <ConfigPanel config={data.config} />}
    </div>
  )
}

function DataFlowDiagram() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-800 mb-4">Data Flow</h3>
      <div className="flex items-center justify-center gap-3 flex-wrap py-4">
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl">
            {'\u{1F3D7}'}
          </div>
          <span className="text-[11px] font-medium text-stone-600">Procore</span>
        </div>

        <svg className="w-8 h-8 text-stone-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>

        <div className="flex flex-col items-center gap-1">
          <div className="w-20 h-20 rounded-2xl bg-teal-50 border-2 border-teal-brand/30 flex items-center justify-center">
            <div className="text-center">
              <div className="text-base font-bold text-teal-brand">SPAN</div>
              <div className="text-[9px] text-stone-400">Dashboard</div>
            </div>
          </div>
        </div>

        <svg className="w-8 h-8 text-stone-300 shrink-0 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>

        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl">
            {'\u{1F4C5}'}
          </div>
          <span className="text-[11px] font-medium text-stone-600">P6</span>
        </div>

        <div className="hidden sm:block w-full" />

        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-2xl">
              {'\u{1F4D0}'}
            </div>
            <span className="text-[11px] font-medium text-stone-600">BIM 360</span>
          </div>

          <svg className="w-8 h-8 text-stone-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>

          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-xl bg-teal-50 border border-teal-brand/20 flex items-center justify-center">
              <span className="text-xs font-bold text-teal-brand">SPAN</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-stone-400 text-center mt-2">
        Construction data flows into SPAN from connected platforms for unified project health analysis
      </p>
    </div>
  )
}

export default function Integrations() {
  const [connectors, setConnectors] = useState(() => getConnectors())

  const activeCount = connectors.filter(c => c.status === 'connected').length
  const lastSyncAll = connectors
    .filter(c => c.lastSync)
    .sort((a, b) => new Date(b.lastSync) - new Date(a.lastSync))[0]

  const handleSync = useCallback(async (id) => {
    const result = await simulateSync(id)
    if (result) {
      setConnectors(prev => prev.map(c => c.id === id ? result : c))
    }
    return result
  }, [])

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link to="/">
            <img src="/iitd-logo.png" alt="IIT Delhi" className="h-9 w-9 object-contain" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link to="/" className="text-xs text-stone-400 hover:text-teal-brand transition-colors">Portfolio</Link>
              <span className="text-xs text-stone-300">/</span>
              <h1 className="text-base font-semibold text-stone-900">Integrations</h1>
            </div>
            <p className="text-xs text-stone-500">External platform connectors and sync management</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Summary bar */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm mb-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-sm">
                {'\u{1F517}'}
              </span>
              <div>
                <div className="text-sm font-semibold text-stone-800">{connectors.length} Connectors</div>
                <div className="text-xs text-stone-400">configured</div>
              </div>
            </div>
            <div className="h-8 w-px bg-stone-200 hidden sm:block" />
            <div>
              <div className="text-sm font-semibold text-emerald-600">{activeCount} Active</div>
              <div className="text-xs text-stone-400">currently connected</div>
            </div>
            <div className="h-8 w-px bg-stone-200 hidden sm:block" />
            <div>
              <div className="text-sm font-semibold text-stone-800">
                {lastSyncAll ? timeAgo(lastSyncAll.lastSync) : 'Never'}
              </div>
              <div className="text-xs text-stone-400">last sync across all</div>
            </div>
          </div>
        </div>

        {/* Connector cards */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Platform Connectors</h2>
          <p className="text-sm text-stone-500 mb-6">
            Connect external construction management platforms to feed project data into SPAN
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {connectors.map(c => (
              <ConnectorCard key={c.id} connector={c} onSync={handleSync} />
            ))}
          </div>
        </div>

        {/* Data flow diagram */}
        <DataFlowDiagram />

        <footer className="py-8 mt-8 border-t border-stone-200">
          <div className="flex items-center justify-center gap-6">
            <img src="/iitd-logo.png" alt="IIT Delhi" className="h-10 w-10 object-contain" />
            <div className="text-center">
              <p className="text-xs text-stone-500 font-medium">
                SPAN — Structural Process Accountability Network
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                IIT Delhi | Group 5 | Capstone Project | Guide: Prof. Sunil Jha
              </p>
            </div>
            <img src="/industry50-logo.png" alt="Industry 5.0" className="h-10 object-contain" />
          </div>
        </footer>
      </main>
    </div>
  )
}
