import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { addUploadedProject, updateProjectData, getProjectData } from '../data/projects'

const REQUIRED_SHEETS = ['Progress', 'Errors', 'RFI']

function parseProgress(ws) {
  const rows = XLSX.utils.sheet_to_json(ws)
  return rows
    .filter(r => r.Sequence || r.sequence)
    .map(r => ({
      sequence: r.Sequence || r.sequence || '',
      weight: Number(r.Weight || r.weight || r['Estimated Weight'] || 0),
      area: Number(r.Area || r.area || 0),
      contribution: Number(r.Contribution || r.contribution || 0),
      modelProgress: Number(r['Model Progress'] || r.modelProgress || r.Progress || 0),
      approvalPct: Number(r['Approval %'] || r.approvalPct || r.APP || 0),
      reApprovalPct: Number(r['Re-Approval %'] || r.reApprovalPct || 0),
      fabPct: Number(r['Fab %'] || r.fabPct || r.FAB || 0),
      erectionPct: Number(r['Erection %'] || r.erectionPct || 0),
      totalProgress: Number(r['Total Progress'] || r.totalProgress || r.Progress || 0),
      overallProgress: Number(r['Overall Progress'] || r.overallProgress || 0),
      phase: r.Phase || r.phase || r.Status || 'In Progress',
    }))
}

function parseErrors(ws) {
  const rows = XLSX.utils.sheet_to_json(ws)
  const external = []
  const byMonth = {}
  const byType = {}

  rows.forEach(r => {
    const month = r.Month || r.month || ''
    const cat = r.Category || r.category || 'B'
    const type = r.Type || r.type || r['Error Type'] || r['Resource Type'] || 'Unknown'
    const count = Number(r.Count || r.count || r.Total || r.total || 1)
    const source = (r.Source || r.source || '').toLowerCase()

    if (source === 'external' || source === 'client') {
      external.push({ month, type, category: cat, count })
    } else {
      const key = month
      if (!byMonth[key]) byMonth[key] = { month: key, catA: 0, catB: 0, catC: 0, total: 0 }
      byMonth[key][`cat${cat}`] = (byMonth[key][`cat${cat}`] || 0) + count
      byMonth[key].total += count

      if (!byType[type]) byType[type] = { type, catA: 0, catB: 0, catC: 0, total: 0 }
      byType[type][`cat${cat}`] = (byType[type][`cat${cat}`] || 0) + count
      byType[type].total += count
    }
  })

  return {
    external: external.length > 0 ? external : [{ month: '', type: 'None', category: 'C', count: 0 }],
    internal: {
      byMonth: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
      byResourceType: Object.values(byType),
    },
  }
}

function parseRfi(ws) {
  const rows = XLSX.utils.sheet_to_json(ws)
  const bySeq = {}
  const byMonth = {}
  let totalOpen = 0
  let totalClosed = 0

  rows.forEach(r => {
    const seq = r.Sequence || r.sequence || 'General'
    const status = (r.Status || r.status || '').toLowerCase()
    const month = r.Month || r.month || r['Date Sent'] || ''
    const isClosed = status === 'closed' || status === 'resolved'

    if (!bySeq[seq]) bySeq[seq] = { sequence: seq, total: 0, closed: 0, open: 0 }
    bySeq[seq].total++
    if (isClosed) { bySeq[seq].closed++; totalClosed++ }
    else { bySeq[seq].open++; totalOpen++ }

    if (month) {
      const mKey = typeof month === 'string' ? month.slice(0, 7) : ''
      if (mKey && !byMonth[mKey]) byMonth[mKey] = { month: mKey, sent: 0, resolved: 0 }
      if (mKey) {
        byMonth[mKey].sent++
        if (isClosed) byMonth[mKey].resolved++
      }
    }
  })

  return {
    summary: { total: totalOpen + totalClosed, closed: totalClosed, open: totalOpen },
    bySequence: Object.values(bySeq),
    monthlyTrend: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
  }
}

export default function DataUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const updateId = searchParams.get('update')

  const [step, setStep] = useState(1)
  const [projectMeta, setProjectMeta] = useState({
    name: '', client: '', projectManager: '', teamLeader: '', domain: 'bim',
  })
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [sheets, setSheets] = useState([])
  const [mapping, setMapping] = useState({ progress: '', errors: '', rfi: '' })
  const [preview, setPreview] = useState(null)
  const [ifcPreview, setIfcPreview] = useState(null)
  const [error, setError] = useState(null)
  const [parsing, setParsing] = useState(false)

  useEffect(() => {
    if (updateId) {
      const existing = getProjectData(updateId)
      if (existing?.project) {
        setProjectMeta({
          name: existing.project.name || '',
          client: existing.project.client || '',
          projectManager: existing.project.projectManager || '',
          teamLeader: existing.project.teamLeader || '',
          domain: existing.project.domain || 'bim',
        })
      }
    }
  }, [updateId])

  const handleFile = useCallback(async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError(null)
    setIfcPreview(null)
    setPreview(null)

    const ext = f.name.split('.').pop().toLowerCase()

    if (ext === 'ifc') {
      setFileType('ifc')
      setParsing(true)
      try {
        const { parseIfcFile } = await import('../utils/ifcParser.js')
        const buffer = await f.arrayBuffer()
        const ifcData = await parseIfcFile(buffer)
        ifcData.source = f.name
        setIfcPreview(ifcData)
        setStep(3)
      } catch (err) {
        setError(`IFC parsing failed: ${err.message}`)
      } finally {
        setParsing(false)
      }
      return
    }

    setFileType('excel')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        setSheets(wb.SheetNames)

        const autoMap = { progress: '', errors: '', rfi: '' }
        wb.SheetNames.forEach(name => {
          const lower = name.toLowerCase()
          if (lower.includes('progress') || lower.includes('sequence')) autoMap.progress = name
          if (lower.includes('error') || lower.includes('quality') || lower.includes('defect')) autoMap.errors = name
          if (lower.includes('rfi') || lower.includes('query') || lower.includes('request')) autoMap.rfi = name
        })
        setMapping(autoMap)
        setStep(2)
      } catch (err) {
        setError('Could not parse file. Please upload an Excel (.xlsx) or CSV file.')
      }
    }
    reader.readAsArrayBuffer(f)
  }, [])

  const handleMapping = useCallback(() => {
    if (!mapping.progress || !mapping.errors || !mapping.rfi) {
      setError('Please map all three required sheets.')
      return
    }
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const progress = parseProgress(wb.Sheets[mapping.progress])
        const errors = parseErrors(wb.Sheets[mapping.errors])
        const rfi = parseRfi(wb.Sheets[mapping.rfi])

        const totalContrib = progress.reduce((s, p) => s + p.contribution, 0)
        if (totalContrib === 0) {
          progress.forEach(p => { p.contribution = 1 / progress.length })
        }

        setPreview({ progress, errors, rfi })
        setStep(3)
      } catch (err) {
        setError(`Error parsing sheets: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [file, mapping])

  const handleSubmit = useCallback(() => {
    if (!updateId && !projectMeta.name.trim()) {
      setError('Please enter a project name.')
      return
    }

    if (updateId) {
      const partial = {}
      if (fileType === 'ifc' && ifcPreview) {
        partial.ifc = ifcPreview
      } else if (preview) {
        partial.progress = preview.progress
        partial.errors = preview.errors
        partial.rfi = preview.rfi
        partial.project = {
          ...projectMeta,
          totalWeight: preview.progress.reduce((s, p) => s + (p.weight || 0), 0),
          totalArea: preview.progress.reduce((s, p) => s + (p.area || 0), 0),
          changeOrders: { submitted: 0, approved: 0, rejected: 0 },
          rfiSummary: preview.rfi.summary,
          manCount: [{ week: new Date().toISOString().slice(0, 10), count: 10 }],
        }
      }
      updateProjectData(updateId, partial)
      navigate(`/project/${updateId}`)
      return
    }

    const id = projectMeta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const manCount = [{ week: new Date().toISOString().slice(0, 10), count: 10 }]

    const projectData = {
      project: {
        ...projectMeta,
        totalWeight: (preview?.progress || []).reduce((s, p) => s + (p.weight || 0), 0),
        totalArea: (preview?.progress || []).reduce((s, p) => s + (p.area || 0), 0),
        changeOrders: { submitted: 0, approved: 0, rejected: 0 },
        rfiSummary: preview?.rfi?.summary || { total: 0, closed: 0, open: 0 },
        manCount,
      },
      progress: preview?.progress || [],
      errors: preview?.errors || { external: [], internal: { byMonth: [], byResourceType: [] } },
      rfi: preview?.rfi || { summary: { total: 0, closed: 0, open: 0 }, bySequence: [], monthlyTrend: [] },
    }

    if (ifcPreview) {
      projectData.ifc = ifcPreview
    }

    addUploadedProject(id, projectData)
    navigate(`/project/${id}`)
  }, [projectMeta, preview, ifcPreview, fileType, navigate, updateId])

  const stepLabels = fileType === 'ifc'
    ? ['Upload', '—', 'Review & Save']
    : ['Upload', 'Map Sheets', 'Review & Save']

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
              {updateId && (
                <>
                  <Link to={`/project/${updateId}`} className="text-xs text-stone-400 hover:text-teal-brand transition-colors">{projectMeta.name || updateId}</Link>
                  <span className="text-xs text-stone-300">/</span>
                </>
              )}
              <h1 className="text-base font-semibold text-stone-900">
                {updateId ? 'Update Data' : 'Add Project'}
              </h1>
            </div>
            <p className="text-xs text-stone-500">
              {updateId ? 'Replace or add data for this project' : 'Upload project data from Excel, CSV, or IFC'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-teal-brand text-white' : 'bg-stone-200 text-stone-500'
              }`}>
                {s}
              </div>
              <span className={`text-xs ${step >= s ? 'text-stone-800' : 'text-stone-400'}`}>
                {stepLabels[s - 1]}
              </span>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-teal-brand' : 'bg-stone-200'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {!updateId && (
              <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-stone-800 mb-4">Project Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Project Name *</label>
                    <input
                      type="text"
                      value={projectMeta.name}
                      onChange={e => setProjectMeta(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 focus:border-teal-brand focus:outline-none"
                      placeholder="e.g., Tower Construction Phase 2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Client</label>
                    <input
                      type="text"
                      value={projectMeta.client}
                      onChange={e => setProjectMeta(p => ({ ...p, client: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 focus:border-teal-brand focus:outline-none"
                      placeholder="e.g., ABC Construction Ltd."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Project Manager</label>
                    <input
                      type="text"
                      value={projectMeta.projectManager}
                      onChange={e => setProjectMeta(p => ({ ...p, projectManager: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 focus:border-teal-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Team Leader</label>
                    <input
                      type="text"
                      value={projectMeta.teamLeader}
                      onChange={e => setProjectMeta(p => ({ ...p, teamLeader: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 focus:border-teal-brand focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs text-stone-500 mb-2 block">Domain</label>
                  <div className="flex gap-3">
                    {[{ value: 'bim', label: 'BIM / Structural Engineering' }, { value: 'repair', label: 'Repair & Retrofit' }].map(d => (
                      <button
                        key={d.value}
                        onClick={() => setProjectMeta(p => ({ ...p, domain: d.value }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          projectMeta.domain === d.value
                            ? 'bg-teal-brand text-white shadow-sm'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {updateId && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-800 mb-1">Updating: {projectMeta.name || updateId}</h3>
                <p className="text-xs text-blue-600">
                  Upload an Excel/CSV file to replace project data, or an IFC file to add/replace the BIM model summary.
                </p>
              </div>
            )}

            <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-8 text-center hover:border-teal-brand/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.ifc"
                onChange={handleFile}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  {parsing ? (
                    <div className="w-7 h-7 border-3 border-teal-brand/30 border-t-teal-brand rounded-full animate-spin" />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  )}
                </div>
                <p className="text-sm font-medium text-stone-700 mb-1">
                  {parsing ? 'Parsing IFC model...' : file ? file.name : 'Click to upload Excel, CSV, or IFC file'}
                </p>
                <p className="text-xs text-stone-400">
                  {parsing
                    ? 'Extracting structural elements, weights, and zones from BIM model'
                    : 'Excel/CSV for project data — IFC for BIM model summary'}
                </p>
              </label>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h4 className="text-xs font-semibold text-stone-700 mb-3">Supported Formats</h4>
              <div className="space-y-3 text-xs text-stone-500">
                <div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium mr-2">Excel/CSV</span>
                  Progress, Errors, and RFI sheets with sequence data, error categories, and RFI status tracking
                </div>
                <div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium mr-2">IFC</span>
                  BIM model file — automatically extracts element counts, weights, zones, and member types
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && fileType === 'excel' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-800 mb-1">Map Sheets</h3>
              <p className="text-xs text-stone-500 mb-4">
                Found {sheets.length} sheet{sheets.length !== 1 ? 's' : ''} in <span className="text-stone-700 font-medium">{file.name}</span>.
                Map each to a data category.
              </p>
              {REQUIRED_SHEETS.map(req => (
                <div key={req} className="flex items-center gap-4 mb-3">
                  <span className="text-sm text-stone-700 w-24">{req}</span>
                  <select
                    value={mapping[req.toLowerCase()]}
                    onChange={e => setMapping(m => ({ ...m, [req.toLowerCase()]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 focus:border-teal-brand focus:outline-none"
                  >
                    <option value="">Select sheet...</option>
                    {sheets.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {mapping[req.toLowerCase()] && (
                    <span className="text-xs text-emerald-600 font-medium">Mapped</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg bg-stone-100 text-sm text-stone-600 hover:bg-stone-200 transition-colors">
                Back
              </button>
              <button onClick={handleMapping} className="px-6 py-2 rounded-lg bg-teal-brand text-sm font-medium text-white hover:bg-teal-brand/90 transition-colors shadow-sm">
                Parse & Preview
              </button>
            </div>
          </div>
        )}

        {step === 3 && fileType === 'ifc' && ifcPreview && (
          <div className="space-y-6">
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-stone-800">IFC Model Preview</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">IFC Data</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <div className="text-xl font-bold text-blue-700">{ifcPreview.totalElements.toLocaleString()}</div>
                  <div className="text-xs text-stone-500">Elements</div>
                </div>
                <div className="rounded-lg bg-teal-50 p-3 text-center">
                  <div className="text-xl font-bold text-teal-700">{ifcPreview.totalWeightTons.toLocaleString()}</div>
                  <div className="text-xs text-stone-500">Weight (tons)</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 text-center">
                  <div className="text-xl font-bold text-purple-700">{Object.keys(ifcPreview.zones).length}</div>
                  <div className="text-xs text-stone-500">Zones</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <div className="text-xl font-bold text-amber-700">{Object.keys(ifcPreview.memberTypes).length}</div>
                  <div className="text-xs text-stone-500">Member Types</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-stone-500">
                {ifcPreview.software && <div>Software: <span className="text-stone-700 font-medium">{ifcPreview.software}</span></div>}
                {ifcPreview.schema && <div>Schema: <span className="text-stone-700 font-medium">{ifcPreview.schema}</span></div>}
              </div>

              <div className="mt-3">
                <h4 className="text-xs text-stone-500 mb-2">Element types:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ifcPreview.elementTypes).map(([type, count]) => (
                    <span key={type} className="text-xs px-2 py-1 rounded bg-stone-100 text-stone-700">
                      {type}: {count.toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <h4 className="text-xs text-stone-500 mb-2">Zones:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ifcPreview.zones).map(([zone, z]) => (
                    <span key={zone} className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-700">
                      {zone}: {z.elements} el / {z.weight_tons}t
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setIfcPreview(null); setFile(null); setFileType(null) }} className="px-4 py-2 rounded-lg bg-stone-100 text-sm text-stone-600 hover:bg-stone-200 transition-colors">
                Back
              </button>
              <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-teal-brand text-sm font-medium text-white hover:bg-teal-brand/90 transition-colors shadow-sm">
                {updateId ? 'Update BIM Data' : 'Save & View Dashboard'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && fileType === 'excel' && preview && (
          <div className="space-y-6">
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-800 mb-4">Data Preview</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{preview.progress.length}</div>
                  <div className="text-xs text-stone-500">Sequences</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {preview.errors.internal.byMonth.reduce((s, m) => s + m.total, 0)}
                  </div>
                  <div className="text-xs text-stone-500">Internal Errors</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{preview.rfi.summary.total}</div>
                  <div className="text-xs text-stone-500">RFIs</div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-xs text-stone-500 mb-2">Sequences found:</h4>
                <div className="flex flex-wrap gap-2">
                  {preview.progress.map(p => (
                    <span key={p.sequence} className="text-xs px-2 py-1 rounded bg-stone-100 text-stone-700">
                      {p.sequence}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {!updateId && (
              <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-stone-800 mb-3">Confirm Project</h3>
                <div className="space-y-2 text-sm text-stone-500">
                  <div>Name: <span className="text-stone-800 font-medium">{projectMeta.name || '(not set)'}</span></div>
                  <div>Client: <span className="text-stone-800 font-medium">{projectMeta.client || '(not set)'}</span></div>
                  <div>Domain: <span className="text-stone-800 font-medium">{projectMeta.domain === 'repair' ? 'Repair & Retrofit' : 'BIM / Structural'}</span></div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg bg-stone-100 text-sm text-stone-600 hover:bg-stone-200 transition-colors">
                Back
              </button>
              <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-teal-brand text-sm font-medium text-white hover:bg-teal-brand/90 transition-colors shadow-sm">
                {updateId ? 'Update Project Data' : 'Save & View Dashboard'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
