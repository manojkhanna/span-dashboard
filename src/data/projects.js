import amtrakProject from './amtrak/project.json'
import amtrakProgress from './amtrak/progress.json'
import amtrakErrors from './amtrak/errors.json'
import amtrakRfi from './amtrak/rfi.json'
import amtrakHistory from './amtrak/history.json'
import amtrakSchedule from './amtrak/schedule.json'
import amtrakIfc from './amtrak/ifc-summary.json'

import krishnaProject from './krishna-apra/project.json'
import krishnaProgress from './krishna-apra/progress.json'
import krishnaErrors from './krishna-apra/errors.json'
import krishnaRfi from './krishna-apra/rfi.json'
import krishnaHistory from './krishna-apra/history.json'
import krishnaSchedule from './krishna-apra/schedule.json'

import westValleyProject from './west-valley/project.json'
import westValleyProgress from './west-valley/progress.json'
import westValleyErrors from './west-valley/errors.json'
import westValleyRfi from './west-valley/rfi.json'
import westValleyHistory from './west-valley/history.json'
import westValleySchedule from './west-valley/schedule.json'
import westValleyIfc from './west-valley/ifc-summary.json'

const UPLOADED_KEY = 'span_uploaded_projects'
const OVERRIDES_KEY = 'span_project_overrides'

function loadUploaded() {
  try {
    const raw = localStorage.getItem(UPLOADED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUploaded(projects) {
  localStorage.setItem(UPLOADED_KEY, JSON.stringify(projects))
}

function loadOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveOverrides(overrides) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
}

const builtInProjects = {
  amtrak: {
    project: amtrakProject,
    progress: amtrakProgress,
    errors: amtrakErrors,
    rfi: amtrakRfi,
    history: amtrakHistory,
    schedule: amtrakSchedule,
    ifc: amtrakIfc,
  },
  'krishna-apra': {
    project: krishnaProject,
    progress: krishnaProgress,
    errors: krishnaErrors,
    rfi: krishnaRfi,
    history: krishnaHistory,
    schedule: krishnaSchedule,
  },
  'west-valley': {
    project: westValleyProject,
    progress: westValleyProgress,
    errors: westValleyErrors,
    rfi: westValleyRfi,
    history: westValleyHistory,
    schedule: westValleySchedule,
    ifc: westValleyIfc,
  },
}

export function getAllProjects() {
  const uploaded = loadUploaded()
  const all = Object.entries(builtInProjects).map(([id, data]) => ({
    id,
    ...data.project,
    builtin: true,
  }))
  uploaded.forEach(p => {
    all.push({ id: p.id, ...p.data.project, builtin: false })
  })
  return all
}

export function getProjectData(id) {
  if (builtInProjects[id]) {
    const overrides = loadOverrides()
    if (overrides[id]) return { ...builtInProjects[id], ...overrides[id] }
    return builtInProjects[id]
  }
  const uploaded = loadUploaded()
  const found = uploaded.find(p => p.id === id)
  return found ? found.data : null
}

export function addUploadedProject(id, data) {
  const uploaded = loadUploaded()
  uploaded.push({ id, data })
  saveUploaded(uploaded)
}

export function updateProjectData(id, partialData) {
  if (builtInProjects[id]) {
    const overrides = loadOverrides()
    overrides[id] = { ...overrides[id], ...partialData }
    saveOverrides(overrides)
  } else {
    const uploaded = loadUploaded()
    const idx = uploaded.findIndex(p => p.id === id)
    if (idx >= 0) {
      uploaded[idx].data = { ...uploaded[idx].data, ...partialData }
      saveUploaded(uploaded)
    }
  }
}

export function removeUploadedProject(id) {
  const uploaded = loadUploaded().filter(p => p.id !== id)
  saveUploaded(uploaded)
}
