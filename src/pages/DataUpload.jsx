import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { addUploadedProject, updateProjectData, getProjectData } from '../data/projects'

function parseProgress(ws) {
  const rows = XLSX.utils.sheet_to_json(ws)
  return rows
    .filter(r => {
      const seq = r.Sequence || r.sequence || r['Sequence/Area/Tier'] || ''
      return seq && String(seq).toLowerCase() !== 'total'
    })
    .map(r => ({
      sequence: r.Sequence || r.sequence || r['Sequence/Area/Tier'] || '',
      weight: Number(r.Weight || r.weight || r['Estimated Weight'] || r['Estimated Weight (Tons)'] || 0),
      area: Number(r.Area || r.area || 0),
      contribution: Number(r.Contribution || r.contribution || r['Contribution To Project'] || r['Contribution To Project '] || 0),
      modelProgress: Number(r['Model Progress'] || r['Model Wise Progress'] || r.modelProgress || r.Progress || r['Model \nwise Progress'] || 0),
      approvalPct: Number(r['Approval %'] || r.approvalPct || r.APP || r['APP\n(45%)'] || 0),
      reApprovalPct: Number(r['Re-Approval %'] || r.reApprovalPct || 0),
      fabPct: Number(r['Fab %'] || r.fabPct || r.FAB || r['FAB\n(45%)'] || 0),
      erectionPct: Number(r['Erection %'] || r.erectionPct || r['GA/FW'] || r['E-sheet/FB'] || r['E-sheet/FB\n(10%)'] || 0),
      totalProgress: Number(r['Total Progress'] || r.totalProgress || r.Progress || r.Total || 0),
      overallProgress: Number(r['Overall Progress'] || r.overallProgress || r['Total Overall progress'] || 0),
      phase: r.Phase || r.phase || r.Status || 'In Progress',
    }))
}

function parseErrors(ws) {
  if (!ws) {
    return {
      external: [{ month: '', type: 'None', category: 'C', count: 0 }],
      internal: { byMonth: [], byResourceType: [] },
    }
  }
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
    const status = String(r.Status || r.status || '').toLowerCase().trim()
    const rawDate = r.Month || r.month || r['Date Sent'] || r['Date Received'] || ''
    const isClosed = status === 'closed' || status === 'resolved'

    if (!bySeq[seq]) bySeq[seq] = { sequence: seq, total: 0, closed: 0, open: 0 }
    bySeq[seq].total++
    if (isClosed) { bySeq[seq].closed++; totalClosed++ }
    else { bySeq[seq].open++; totalOpen++ }

    if (rawDate) {
      let mKey = ''
      const dateStr = String(rawDate).trim()
      if (dateStr.match(/^\d{2}-\d{2}-\d{2,4}$/)) {
        const parts = dateStr.split('-')
        const yr = parts[2].length === 2 ? '20' + parts[2] : parts[2]
        mKey = `${yr}-${parts[0]}`
      } else if (dateStr.length >= 7) {
        mKey = dateStr.slice(0, 7)
      }
      if (mKey) {
        if (!byMonth[mKey]) byMonth[mKey] = { month: mKey, sent: 0, resolved: 0 }
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

function parseChangeOrders(coSummaryWs, coLogWs) {
  let submitted = 0, approved = 0, rejected = 0
  if (coSummaryWs) {
    const rows = XLSX.utils.sheet_to_json(coSummaryWs)
    rows.forEach(r => {
      const summary = String(r['Change Order Summary'] || r['Change Order Summary  '] || '').toLowerCase().trim()
      const total = Number(r['Total till Date'] || r.Total || r.total || 0)
      if (summary.includes('submitted')) submitted = total
      else if (summary.includes('approved')) approved = total
      else if (summary.includes('rejected')) rejected = total
    })
  }
  return { submitted, approved, rejected }
}

function parseManCount(ws) {
  if (!ws) return [{ week: new Date().toISOString().slice(0, 10), count: 10 }]
  const rows = XLSX.utils.sheet_to_json(ws)
  return rows
    .filter(r => r['Week Of'] || r.week || r.Week)
    .map(r => {
      let week = r['Week Of'] || r.week || r.Week || ''
      if (week instanceof Date || (typeof week === 'number' && week > 40000)) {
        const d = typeof week === 'number'
          ? new Date((week - 25569) * 86400 * 1000)
          : week
        week = d.toISOString().slice(0, 10)
      } else {
        week = String(week).slice(0, 10)
      }
      return { week, count: Number(r['Man Count'] || r.count || r.Count || 0) }
    })
    .filter(r => r.week && r.count > 0)
}

function autoMapSheets(sheetNames) {
  const map = { progress: '', errors: '', rfi: '', changeOrder: '', manCount: '' }
  sheetNames.forEach(name => {
    const lower = name.toLowerCase().trim()
    if (lower.includes('progress') || lower.includes('progess') || lower.includes('sequence')) map.progress = name
    if (lower.includes('error') || lower.includes('quality') || lower.includes('defect') || lower.includes('ncr')) map.errors = name
    if (lower.includes('rfi') && (lower.includes('log') || lower.includes('status'))) map.rfi = name
    else if (lower.includes('rfi') && !map.rfi) map.rfi = name
    if (lower === 'change order' || lower.includes('change order') || lower === 'co summary') map.changeOrder = name
    if (lower.includes('man count') || lower.includes('mancount') || lower.includes('resource') || lower.includes('headcount')) map.manCount = name
  })
  return map
}

export default function DataUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const updateId = searchParams.get('update')

  const [step, setStep] = useState(1)
  const [projectMeta, setProjectMeta] = useState({
    name: '', client: '', projectManager: '', teamLeader: '', domain: 'bim',
  })
  const [excelFiles, setExcelFiles] = useState([])
  const [ifcFile, setIfcFile] = useState(null)
  const [allSheets, setAllSheets] = useState([])
  const [mapping, setMapping] = useState({ progress: '', errors: '', rfi: '', changeOrder: '', manCount: '' })
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

  const handleFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setError(null)
    setIfcPreview(null)
    setPreview(null)

    const excels = []
    let ifc = null

    for (const f of files) {
      const ext = f.name.split('.').pop().toLowerCase()
      if (ext === 'ifc') ifc = f
      else excels.push(f)
    }

    setIfcFile(ifc)
    setExcelFiles(excels)

    if (ifc && excels.length === 0) {
      setParsing(true)
      try {
        const { parseIfcFile } = await import('../utils/ifcParser.js')
        const buffer = await ifc.arrayBuffer()
        const ifcData = await parseIfcFile(buffer)
        ifcData.source = ifc.name
        setIfcPreview(ifcData)
        setStep(3)
      } catch (err) {
        setError(`IFC parsing failed: ${err.message}`)
      } finally {
        setParsing(false)
      }
      return
    }

    if (ifc) {
      setParsing(true)
      try {
        const { parseIfcFile } = await import('../utils/ifcParser.js')
        const buffer = await ifc.arrayBuffer()
        const ifcData = await parseIfcFile(buffer)
        ifcData.source = ifc.name
        setIfcPreview(ifcData)
      } catch (err) {
        setError(`IFC parsing warning: ${err.message}. Excel data will still be processed.`)
      } finally {
        setParsing(false)
      }
    }

    if (excels.length > 0) {
      const mergedSheets = []
      for (const f of excels) {
        try {
          const buf = await f.arrayBuffer()
          const wb = XLSX.read(buf, { type: 'array' })
          wb.SheetNames.forEach(name => {
            const tag = excels.length > 1 ? `${name} [${f.name.replace(/\.xlsx?$/i, '')}]` : name
            mergedSheets.push({ display: tag, file: f, sheetName: name })
          })
        } catch {
          setError(`Could not parse ${f.name}`)
        }
      }
      setAllSheets(mergedSheets)

      const plainNames = mergedSheets.map(s => s.display)
      const auto = autoMapSheets(plainNames)
      if (!auto.progress) {
        const fallback = autoMapSheets(mergedSheets.map(s => s.sheetName))
        Object.keys(fallback).forEach(k => {
          if (fallback[k] && !auto[k]) {
            const match = mergedSheets.find(s => s.sheetName === fallback[k])
            if (match) auto[k] = match.display
          }
        })
      }
      setMapping(auto)
      setStep(2)
    }
  }, [])

  const handleMapping = useCallback(async () => {
    if (!mapping.progress) {
      setError('Please map at least the Progress sheet.')
      return
    }
    setError(null)

    try {
      const sheetDataCache = new Map()

      async function readSheet(displayName) {
        if (!displayName) return null
        const entry = allSheets.find(s => s.display === displayName)
        if (!entry) return null

        const key = entry.file.name
        if (!sheetDataCache.has(key)) {
          const buf = await entry.file.arrayBuffer()
          sheetDataCache.set(key, XLSX.read(buf, { type: 'array' }))
        }
        return sheetDataCache.get(key).Sheets[entry.sheetName]
      }

      const progressWs = await readSheet(mapping.progress)
      const errorsWs = await readSheet(mapping.errors)
      const rfiWs = await readSheet(mapping.rfi)
      const coWs = await readSheet(mapping.changeOrder)
      const mcWs = await readSheet(mapping.manCount)

      const progress = parseProgress(progressWs)
      const errors = parseErrors(errorsWs)
      const rfi = rfiWs ? parseRfi(rfiWs) : { summary: { total: 0, closed: 0, open: 0 }, bySequence: [], monthlyTrend: [] }
      const changeOrders = parseChangeOrders(coWs, null)
      const manCount = parseManCount(mcWs)

      const totalContrib = progress.reduce((s, p) => s + p.contribution, 0)
      if (totalContrib === 0) {
        progress.forEach(p => { p.contribution = 1 / progress.length })
      }

      setPreview({ progress, errors, rfi, changeOrders, manCount })
      setStep(3)
    } catch (err) {
      setError(`Error parsing sheets: ${err.message}`)
    }
  }, [allSheets, mapping])

  const handleSubmit = useCallback(() => {
    if (!updateId && !projectMeta.name.trim()) {
      setError('Please enter a project name.')
      return
    }

    if (updateId) {
      const partial = {}
      if (ifcPreview) partial.ifc = ifcPreview
      if (preview) {
        partial.progress = preview.progress
        partial.errors = preview.errors
        partial.rfi = preview.rfi
        partial.project = {
          ...projectMeta,
          totalWeight: preview.progress.reduce((s, p) => s + (p.weight || 0), 0),
          totalArea: preview.progress.reduce((s, p) => s + (p.area || 0), 0),
          changeOrders: preview.changeOrders || { submitted: 0, approved: 0, rejected: 0 },
          rfiSummary: preview.rfi.summary,
          manCount: preview.manCount || [{ week: new Date().toISOString().slice(0, 10), count: 10 }],
        }
      }
      updateProjectData(updateId, partial)
      navigate(`/project/${updateId}`)
      return
    }

    const id = projectMeta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const projectData = {
      project: {
        ...projectMeta,
        totalWeight: (preview?.progress || []).reduce((s, p) => s + (p.weight || 0), 0),
        totalArea: (preview?.progress || []).reduce((s, p) => s + (p.area || 0), 0),
        changeOrders: preview?.changeOrders || { submitted: 0, approved: 0, rejected: 0 },
        rfiSummary: preview?.rfi?.summary || { total: 0, closed: 0, open: 0 },
        manCount: preview?.manCount || [{ week: new Date().toISOString().slice(0, 10), count: 10 }],
      },
      progress: preview?.progress || [],
      errors: preview?.errors || { external: [], internal: { byMonth: [], byResourceType: [] } },
      rfi: preview?.rfi || { summary: { total: 0, closed: 0, open: 0 }, bySequence: [], monthlyTrend: [] },
      history: [{ month: new Date().toISOString().slice(0, 7), overall: 50, progress: 50, quality: 75, rfi: 50, changeOrder: 80, resource: 60 }],
      schedule: (preview?.progress || []).map(p => {
        const prog = p.totalProgress || p.overallProgress || 0
        return { milestone: `${p.sequence} Complete`, sequence: p.sequence, planned: '2026-12-01', actual: prog >= 100 ? '2026-12-01' : null, status: prog >= 100 ? 'completed' : prog > 0 ? 'in-progress' : 'upcoming' }
      }),
    }

    if (ifcPreview) projectData.ifc = ifcPreview

    addUploadedProject(id, projectData)
    navigate(`/project/${id}`)
  }, [projectMeta, preview, ifcPreview, navigate, updateId])

  const hasExcel = excelFiles.length > 0
  const hasIfc = ifcFile !== null
  const ifcOnly = hasIfc && !hasExcel

  const fileLabel = () => {
    const names = [...excelFiles.map(f => f.name), ifcFile?.name].filter(Boolean)
    if (names.length === 0) return 'Click to upload files'
    if (names.length <= 2) return names.join(' + ')
    return `${names.length} files selected`
  }

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
              {updateId ? 'Replace or add data for this project' : 'Upload project data — Excel, CSV, and/or IFC files'}
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
                {s === 1 ? 'Upload' : s === 2 ? 'Map Sheets' : 'Review & Save'}
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
                      placeholder="e.g., West Valley Hospital"
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
                  Upload Excel/CSV to replace project data, IFC to add BIM model, or both together.
                </p>
              </div>
            )}

            <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-8 text-center hover:border-teal-brand/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.ifc"
                multiple
                onChange={handleFiles}
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
                  {parsing ? 'Parsing IFC model...' : fileLabel()}
                </p>
                <p className="text-xs text-stone-400">
                  {parsing
                    ? 'Extracting structural elements from BIM model'
                    : 'Select multiple files at once — Excel + IFC supported together'}
                </p>
              </label>

              {(hasExcel || hasIfc) && !parsing && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {excelFiles.map(f => (
                    <span key={f.name} className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                      {f.name}
                    </span>
                  ))}
                  {ifcFile && (
                    <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
                      {ifcFile.name}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h4 className="text-xs font-semibold text-stone-700 mb-3">Supported Formats</h4>
              <div className="space-y-3 text-xs text-stone-500">
                <div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium mr-2">Excel/CSV</span>
                  Progress, RFI, Change Orders, Man Count — auto-detects sheet names
                </div>
                <div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium mr-2">IFC</span>
                  BIM model — extracts element counts, weights, zones, and member types
                </div>
                <div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium mr-2">Multi-file</span>
                  Select multiple Excel files + IFC together — sheets from all files are combined
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-800 mb-1">Map Sheets</h3>
              <p className="text-xs text-stone-500 mb-4">
                Found {allSheets.length} sheet{allSheets.length !== 1 ? 's' : ''} across {excelFiles.length} file{excelFiles.length !== 1 ? 's' : ''}.
                Map each to a data category. Only Progress is required.
              </p>

              {[
                { key: 'progress', label: 'Progress', required: true },
                { key: 'rfi', label: 'RFI' },
                { key: 'errors', label: 'Errors / Quality' },
                { key: 'changeOrder', label: 'Change Orders' },
                { key: 'manCount', label: 'Man Count' },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-4 mb-3">
                  <span className="text-sm text-stone-700 w-28">
                    {item.label}
                    {item.required && <span className="text-red-400 ml-0.5">*</span>}
                  </span>
                  <select
                    value={mapping[item.key]}
                    onChange={e => setMapping(m => ({ ...m, [item.key]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 focus:border-teal-brand focus:outline-none"
                  >
                    <option value="">{item.required ? 'Select sheet...' : '(none)'}</option>
                    {allSheets.map(s => (
                      <option key={s.display} value={s.display}>{s.display}</option>
                    ))}
                  </select>
                  {mapping[item.key] && (
                    <span className="text-xs text-emerald-600 font-medium">Mapped</span>
                  )}
                </div>
              ))}

              {ifcPreview && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">IFC</span>
                    <span className="text-xs text-stone-600">
                      {ifcFile.name} — {ifcPreview.totalElements.toLocaleString()} elements, {ifcPreview.totalWeightTons.toLocaleString()}t
                    </span>
                  </div>
                </div>
              )}
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

        {step === 3 && ifcOnly && ifcPreview && (
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
              <button onClick={() => { setStep(1); setIfcPreview(null); setIfcFile(null); setExcelFiles([]) }} className="px-4 py-2 rounded-lg bg-stone-100 text-sm text-stone-600 hover:bg-stone-200 transition-colors">
                Back
              </button>
              <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-teal-brand text-sm font-medium text-white hover:bg-teal-brand/90 transition-colors shadow-sm">
                {updateId ? 'Update BIM Data' : 'Save & View Dashboard'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && !ifcOnly && preview && (
          <div className="space-y-6">
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-800 mb-4">Data Preview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{preview.progress.length}</div>
                  <div className="text-xs text-stone-500">Sequences</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{preview.rfi.summary.total}</div>
                  <div className="text-xs text-stone-500">RFIs</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{preview.changeOrders.submitted}</div>
                  <div className="text-xs text-stone-500">Change Orders</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{preview.manCount.length}</div>
                  <div className="text-xs text-stone-500">Weeks Tracked</div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-xs text-stone-500 mb-2">Sequences:</h4>
                <div className="flex flex-wrap gap-2">
                  {preview.progress.map(p => (
                    <span key={p.sequence} className="text-xs px-2 py-1 rounded bg-stone-100 text-stone-700">
                      {p.sequence} {p.weight > 0 ? `(${p.weight}t)` : ''}
                    </span>
                  ))}
                </div>
              </div>

              {preview.rfi.summary.total > 0 && (
                <div className="mt-3 text-xs text-stone-500">
                  RFIs: {preview.rfi.summary.closed} closed, {preview.rfi.summary.open} open
                </div>
              )}

              {ifcPreview && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">IFC</span>
                    <span className="text-xs text-stone-600 font-medium">
                      {ifcPreview.totalElements.toLocaleString()} elements, {ifcPreview.totalWeightTons.toLocaleString()} tons
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!updateId && (
              <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-stone-800 mb-3">Confirm Project</h3>
                <div className="space-y-2 text-sm text-stone-500">
                  <div>Name: <span className="text-stone-800 font-medium">{projectMeta.name || '(not set)'}</span></div>
                  <div>Client: <span className="text-stone-800 font-medium">{projectMeta.client || '(not set)'}</span></div>
                  <div>Domain: <span className="text-stone-800 font-medium">{projectMeta.domain === 'repair' ? 'Repair & Retrofit' : 'BIM / Structural'}</span></div>
                  <div>Weight: <span className="text-stone-800 font-medium">{preview.progress.reduce((s, p) => s + (p.weight || 0), 0).toLocaleString()} tons</span></div>
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
