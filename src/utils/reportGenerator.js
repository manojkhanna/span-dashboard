import PptxGenJS from 'pptxgenjs'

// ── Brand palette ──────────────────────────────────────────────────────────────
const COLORS = {
  brand:    '0d9488',
  brandDk:  '0f766e',
  dark:     '1c1917',
  medium:   '78716c',
  lightBg:  'f5f5f4',
  white:    'FFFFFF',
  green:    '22c55e',
  amber:    'f59e0b',
  red:      'ef4444',
}

const MARGIN = 0.5          // inches – consistent on all sides
const FONT   = 'Arial'

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 75) return COLORS.green
  if (score >= 50) return COLORS.amber
  return COLORS.red
}

function severityColor(severity) {
  if (severity === 'critical') return COLORS.red
  if (severity === 'warning')  return COLORS.amber
  return COLORS.brand
}

function priorityLabel(priority) {
  if (priority === 'high')   return { text: 'HIGH',   color: COLORS.red }
  if (priority === 'medium') return { text: 'MED',    color: COLORS.amber }
  return { text: 'LOW', color: COLORS.green }
}

function pct(n) {
  return typeof n === 'number' ? `${Math.round(n)}%` : '-'
}

function today() {
  const d = new Date()
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Slide builders ─────────────────────────────────────────────────────────────

function addTitleSlide(pres, data) {
  const slide = pres.addSlide()

  // Teal bar across the top
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.6,
    fill: { color: COLORS.brand },
  })

  // Brand label in top bar
  slide.addText('SPAN', {
    x: MARGIN, y: 0.1, w: 3, h: 0.4,
    fontSize: 18, fontFace: FONT, bold: true,
    color: COLORS.white,
  })

  // Project name — large, centered
  slide.addText(data.project.name || 'Project Report', {
    x: MARGIN, y: 1.8, w: 9, h: 0.8,
    fontSize: 32, fontFace: FONT, bold: true,
    color: COLORS.dark,
  })

  // Subtitle
  slide.addText('Project Health Report', {
    x: MARGIN, y: 2.6, w: 9, h: 0.5,
    fontSize: 18, fontFace: FONT,
    color: COLORS.brand,
  })

  // Meta info
  const meta = [
    data.project.client ? `Client: ${data.project.client}` : null,
    data.project.projectManager ? `PM: ${data.project.projectManager}` : null,
    data.project.teamLeader ? `Team Lead: ${data.project.teamLeader}` : null,
  ].filter(Boolean).join('   |   ')

  if (meta) {
    slide.addText(meta, {
      x: MARGIN, y: 3.3, w: 9, h: 0.4,
      fontSize: 11, fontFace: FONT,
      color: COLORS.medium,
    })
  }

  // Date
  slide.addText(today(), {
    x: MARGIN, y: 4.2, w: 9, h: 0.3,
    fontSize: 10, fontFace: FONT,
    color: COLORS.medium,
  })
}

function addExecutiveSummary(pres, data) {
  const slide = pres.addSlide()

  // Header bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.5,
    fill: { color: COLORS.brand },
  })
  slide.addText('Executive Summary', {
    x: MARGIN, y: 0.05, w: 5, h: 0.4,
    fontSize: 14, fontFace: FONT, bold: true,
    color: COLORS.white,
  })

  // Overall health score — big number
  const overall = data.overall ?? 0
  slide.addShape(pres.ShapeType.rect, {
    x: MARGIN, y: 0.8, w: 2.2, h: 1.8,
    fill: { color: COLORS.lightBg },
    rectRadius: 0.1,
  })
  slide.addText(String(overall), {
    x: MARGIN, y: 0.9, w: 2.2, h: 1.0,
    fontSize: 48, fontFace: FONT, bold: true,
    color: scoreColor(overall),
    align: 'center',
  })
  slide.addText('Overall Health', {
    x: MARGIN, y: 1.9, w: 2.2, h: 0.3,
    fontSize: 10, fontFace: FONT,
    color: COLORS.medium,
    align: 'center',
  })
  slide.addText(overall >= 75 ? 'GREEN' : overall >= 50 ? 'AMBER' : 'RED', {
    x: MARGIN, y: 2.2, w: 2.2, h: 0.25,
    fontSize: 9, fontFace: FONT, bold: true,
    color: scoreColor(overall),
    align: 'center',
  })

  // Five dimension scores in a row
  const dims = [
    { key: 'progress',    label: 'Progress\n(30%)',       score: data.scores?.progress ?? 0 },
    { key: 'quality',     label: 'Quality\n(25%)',        score: data.scores?.quality ?? 0 },
    { key: 'rfi',         label: 'RFI\n(20%)',            score: data.scores?.rfi ?? 0 },
    { key: 'changeOrder', label: 'Change Orders\n(10%)', score: data.scores?.changeOrder ?? 0 },
    { key: 'resource',    label: 'Resources\n(15%)',      score: data.scores?.resource ?? 0 },
  ]
  const boxW = 1.3
  const gap = 0.15
  const startX = 3.0
  dims.forEach((dim, i) => {
    const x = startX + i * (boxW + gap)
    slide.addShape(pres.ShapeType.rect, {
      x, y: 0.8, w: boxW, h: 1.8,
      fill: { color: COLORS.lightBg },
      rectRadius: 0.1,
    })
    slide.addText(String(dim.score), {
      x, y: 0.95, w: boxW, h: 0.7,
      fontSize: 28, fontFace: FONT, bold: true,
      color: scoreColor(dim.score),
      align: 'center',
    })
    slide.addText(dim.label, {
      x, y: 1.7, w: boxW, h: 0.7,
      fontSize: 8, fontFace: FONT,
      color: COLORS.medium,
      align: 'center',
    })
  })

  // Key stats row
  const totalSequences = data.progress?.length ?? 0
  const totalWeight = data.project?.totalWeight ?? '-'
  const rfiTotal = data.rfi?.summary?.total ?? data.project?.rfiSummary?.total ?? 0
  const rfiClosed = data.rfi?.summary?.closed ?? data.project?.rfiSummary?.closed ?? 0
  const closureRate = rfiTotal > 0 ? Math.round((rfiClosed / rfiTotal) * 100) : 0

  const stats = [
    { label: 'Total Sequences', value: String(totalSequences) },
    { label: 'Total Weight (tons)', value: String(totalWeight) },
    { label: 'RFI Closure Rate', value: `${closureRate}%` },
  ]

  slide.addShape(pres.ShapeType.rect, {
    x: MARGIN, y: 3.1, w: 9, h: 0.8,
    fill: { color: COLORS.lightBg },
    rectRadius: 0.1,
  })

  stats.forEach((st, i) => {
    const x = MARGIN + 0.3 + i * 3.0
    slide.addText(st.value, {
      x, y: 3.15, w: 2.5, h: 0.4,
      fontSize: 18, fontFace: FONT, bold: true,
      color: COLORS.dark,
    })
    slide.addText(st.label, {
      x, y: 3.55, w: 2.5, h: 0.25,
      fontSize: 9, fontFace: FONT,
      color: COLORS.medium,
    })
  })
}

function addProgressOverview(pres, data) {
  const slide = pres.addSlide()

  // Header bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.5,
    fill: { color: COLORS.brand },
  })
  slide.addText('Progress Overview', {
    x: MARGIN, y: 0.05, w: 5, h: 0.4,
    fontSize: 14, fontFace: FONT, bold: true,
    color: COLORS.white,
  })

  const rows = (data.progress || []).map(seq => [
    { text: seq.sequence || '-', options: { fontSize: 9, fontFace: FONT, color: COLORS.dark } },
    { text: String(seq.weight ?? '-'), options: { fontSize: 9, fontFace: FONT, color: COLORS.dark, align: 'right' } },
    { text: pct(seq.approvalPct), options: { fontSize: 9, fontFace: FONT, color: COLORS.dark, align: 'right' } },
    { text: pct(seq.fabPct), options: { fontSize: 9, fontFace: FONT, color: COLORS.dark, align: 'right' } },
    { text: pct(seq.erectionPct), options: { fontSize: 9, fontFace: FONT, color: COLORS.dark, align: 'right' } },
    { text: pct(seq.totalProgress), options: {
      fontSize: 9, fontFace: FONT, bold: true,
      color: scoreColor(seq.totalProgress ?? 0),
      align: 'right',
    }},
  ])

  const headerRow = [
    { text: 'Sequence', options: { fontSize: 9, fontFace: FONT, bold: true, color: COLORS.white, fill: { color: COLORS.brand } } },
    { text: 'Weight', options: { fontSize: 9, fontFace: FONT, bold: true, color: COLORS.white, fill: { color: COLORS.brand }, align: 'right' } },
    { text: 'Approval %', options: { fontSize: 9, fontFace: FONT, bold: true, color: COLORS.white, fill: { color: COLORS.brand }, align: 'right' } },
    { text: 'Fab %', options: { fontSize: 9, fontFace: FONT, bold: true, color: COLORS.white, fill: { color: COLORS.brand }, align: 'right' } },
    { text: 'Erection %', options: { fontSize: 9, fontFace: FONT, bold: true, color: COLORS.white, fill: { color: COLORS.brand }, align: 'right' } },
    { text: 'Total Progress', options: { fontSize: 9, fontFace: FONT, bold: true, color: COLORS.white, fill: { color: COLORS.brand }, align: 'right' } },
  ]

  const tableData = [headerRow, ...rows]

  // Alternate row shading
  const altBg = rows.map((_, i) => ({
    fill: { color: i % 2 === 0 ? COLORS.white : COLORS.lightBg },
  }))

  slide.addTable(tableData, {
    x: MARGIN, y: 0.75, w: 9,
    colW: [2.0, 1.2, 1.3, 1.1, 1.3, 1.1],
    border: { type: 'solid', pt: 0.5, color: 'e5e5e5' },
    rowH: 0.3,
    autoPage: true,
    autoPageRepeatHeader: true,
  })
}

function addRfiChangeOrders(pres, data) {
  const slide = pres.addSlide()

  // Header bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.5,
    fill: { color: COLORS.brand },
  })
  slide.addText('RFI & Change Orders', {
    x: MARGIN, y: 0.05, w: 5, h: 0.4,
    fontSize: 14, fontFace: FONT, bold: true,
    color: COLORS.white,
  })

  // ── RFI Section ──────────────────────────────────────────────────────────────
  slide.addText('RFI Summary', {
    x: MARGIN, y: 0.7, w: 4, h: 0.35,
    fontSize: 13, fontFace: FONT, bold: true,
    color: COLORS.dark,
  })

  const rfiSummary = data.rfi?.summary ?? data.project?.rfiSummary ?? {}
  const rfiTotal  = rfiSummary.total ?? 0
  const rfiClosed = rfiSummary.closed ?? 0
  const rfiOpen   = rfiSummary.open ?? 0
  const closureRate = rfiTotal > 0 ? Math.round((rfiClosed / rfiTotal) * 100) : 0

  const rfiStats = [
    { label: 'Total',        value: String(rfiTotal) },
    { label: 'Closed',       value: String(rfiClosed) },
    { label: 'Open',         value: String(rfiOpen) },
    { label: 'Closure Rate', value: `${closureRate}%` },
  ]

  rfiStats.forEach((st, i) => {
    const x = MARGIN + i * 2.1
    slide.addShape(pres.ShapeType.rect, {
      x, y: 1.15, w: 1.9, h: 0.85,
      fill: { color: COLORS.lightBg },
      rectRadius: 0.08,
    })
    slide.addText(st.value, {
      x, y: 1.2, w: 1.9, h: 0.45,
      fontSize: 22, fontFace: FONT, bold: true,
      color: st.label === 'Closure Rate' ? scoreColor(closureRate) : COLORS.dark,
      align: 'center',
    })
    slide.addText(st.label, {
      x, y: 1.65, w: 1.9, h: 0.25,
      fontSize: 9, fontFace: FONT,
      color: COLORS.medium,
      align: 'center',
    })
  })

  // ── Change Orders Section ────────────────────────────────────────────────────
  slide.addText('Change Orders', {
    x: MARGIN, y: 2.35, w: 4, h: 0.35,
    fontSize: 13, fontFace: FONT, bold: true,
    color: COLORS.dark,
  })

  const co = data.project?.changeOrders ?? {}
  const coStats = [
    { label: 'Submitted', value: String(co.submitted ?? 0), color: COLORS.dark },
    { label: 'Approved',  value: String(co.approved ?? 0),  color: COLORS.green },
    { label: 'Rejected',  value: String(co.rejected ?? 0),  color: COLORS.red },
  ]

  coStats.forEach((st, i) => {
    const x = MARGIN + i * 2.1
    slide.addShape(pres.ShapeType.rect, {
      x, y: 2.8, w: 1.9, h: 0.85,
      fill: { color: COLORS.lightBg },
      rectRadius: 0.08,
    })
    slide.addText(st.value, {
      x, y: 2.85, w: 1.9, h: 0.45,
      fontSize: 22, fontFace: FONT, bold: true,
      color: st.color,
      align: 'center',
    })
    slide.addText(st.label, {
      x, y: 3.3, w: 1.9, h: 0.25,
      fontSize: 9, fontFace: FONT,
      color: COLORS.medium,
      align: 'center',
    })
  })
}

function addRisksAndRecommendations(pres, data) {
  const slide = pres.addSlide()

  // Header bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.5,
    fill: { color: COLORS.brand },
  })
  slide.addText('Risk Flags & Recommendations', {
    x: MARGIN, y: 0.05, w: 6, h: 0.4,
    fontSize: 14, fontFace: FONT, bold: true,
    color: COLORS.white,
  })

  // ── Risk Flags ───────────────────────────────────────────────────────────────
  slide.addText('Risk Flags', {
    x: MARGIN, y: 0.65, w: 4, h: 0.3,
    fontSize: 12, fontFace: FONT, bold: true,
    color: COLORS.dark,
  })

  const risks = data.risks || []
  if (risks.length === 0) {
    slide.addText('No active risk flags.', {
      x: MARGIN, y: 1.0, w: 9, h: 0.3,
      fontSize: 10, fontFace: FONT, italic: true,
      color: COLORS.medium,
    })
  } else {
    const riskRows = risks.slice(0, 5).map(risk => {
      const sevLabel = (risk.severity || 'info').toUpperCase()
      return [
        { text: sevLabel, options: {
          fontSize: 8, fontFace: FONT, bold: true,
          color: COLORS.white,
          fill: { color: severityColor(risk.severity) },
          align: 'center',
        }},
        { text: risk.label || '-', options: { fontSize: 9, fontFace: FONT, bold: true, color: COLORS.dark } },
        { text: risk.message || '', options: { fontSize: 9, fontFace: FONT, color: COLORS.medium } },
      ]
    })

    slide.addTable(riskRows, {
      x: MARGIN, y: 1.0,
      w: 9,
      colW: [0.9, 1.6, 6.5],
      border: { type: 'solid', pt: 0.5, color: 'e5e5e5' },
      rowH: 0.32,
    })
  }

  // ── Recommendations ──────────────────────────────────────────────────────────
  const recsY = risks.length > 0 ? 1.05 + Math.min(risks.length, 5) * 0.35 + 0.3 : 1.6
  slide.addText('Recommendations', {
    x: MARGIN, y: recsY, w: 4, h: 0.3,
    fontSize: 12, fontFace: FONT, bold: true,
    color: COLORS.dark,
  })

  const recs = data.recommendations || []
  if (recs.length === 0) {
    slide.addText('No recommendations at this time.', {
      x: MARGIN, y: recsY + 0.35, w: 9, h: 0.3,
      fontSize: 10, fontFace: FONT, italic: true,
      color: COLORS.medium,
    })
  } else {
    const recRows = recs.slice(0, 5).map(rec => {
      const p = priorityLabel(rec.priority)
      return [
        { text: p.text, options: {
          fontSize: 8, fontFace: FONT, bold: true,
          color: COLORS.white,
          fill: { color: p.color },
          align: 'center',
        }},
        { text: rec.title || '-', options: { fontSize: 9, fontFace: FONT, bold: true, color: COLORS.dark } },
        { text: rec.description || '', options: { fontSize: 8, fontFace: FONT, color: COLORS.medium } },
      ]
    })

    slide.addTable(recRows, {
      x: MARGIN, y: recsY + 0.35,
      w: 9,
      colW: [0.7, 2.2, 6.1],
      border: { type: 'solid', pt: 0.5, color: 'e5e5e5' },
      rowH: 0.38,
    })
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Generate a comprehensive PPTX project health report and trigger a download.
 *
 * @param {Object} data
 * @param {Object} data.project      - Project metadata (name, client, PM, etc.)
 * @param {Array}  data.progress     - Sequence-level progress rows
 * @param {Object} data.errors       - Error data (internal / external)
 * @param {Object} data.rfi          - RFI data with summary and breakdowns
 * @param {Array}  data.history      - Monthly health history
 * @param {Array}  data.schedule     - Milestone schedule
 * @param {Object} data.ifc          - IFC / BIM model metadata
 * @param {Object} data.scores       - Five dimension scores (0-100 each)
 * @param {number} data.overall      - Overall weighted health score
 * @param {Array}  data.risks        - Active risk flags
 * @param {Array}  data.recommendations - Prioritized recommendations
 * @returns {Promise<string>} The generated filename
 */
export async function generateProjectReport(data) {
  const pres = new PptxGenJS()

  // Presentation metadata
  const projectName = data.project?.name || 'Project'
  pres.author  = 'SPAN Dashboard'
  pres.subject = `${projectName} Health Report`
  pres.title   = `${projectName} — SPAN Report`

  // Default slide size (10 x 5.63 inches — standard 16:9)
  pres.layout = 'LAYOUT_WIDE'

  // Slide master with consistent footer
  pres.defineSlideMaster({
    title: 'SPAN_MASTER',
    objects: [
      { text: {
        text: `SPAN  |  ${projectName}  |  ${today()}`,
        options: {
          x: MARGIN, y: 5.2, w: 9, h: 0.3,
          fontSize: 7, fontFace: FONT,
          color: COLORS.medium,
        },
      }},
    ],
  })

  // Build slides
  addTitleSlide(pres, data)
  addExecutiveSummary(pres, data)
  addProgressOverview(pres, data)
  addRfiChangeOrders(pres, data)
  addRisksAndRecommendations(pres, data)

  // Apply the master to content slides (skip title slide)
  pres.slides.forEach((slide, idx) => {
    if (idx > 0) slide.masterName = 'SPAN_MASTER'
  })

  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `SPAN_Report_${safeName}.pptx`

  await pres.writeFile({ fileName })
  return fileName
}
