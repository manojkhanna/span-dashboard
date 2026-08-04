import amtrakProject from './amtrak/project.json'
import amtrakProgress from './amtrak/progress.json'
import amtrakErrors from './amtrak/errors.json'
import amtrakRfi from './amtrak/rfi.json'
import amtrakHistory from './amtrak/history.json'
import amtrakSchedule from './amtrak/schedule.json'

import krishnaProject from './krishna-apra/project.json'
import krishnaProgress from './krishna-apra/progress.json'
import krishnaErrors from './krishna-apra/errors.json'
import krishnaRfi from './krishna-apra/rfi.json'
import krishnaHistory from './krishna-apra/history.json'
import krishnaSchedule from './krishna-apra/schedule.json'

const UPLOADED_KEY = 'span_uploaded_projects'

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

const builtInProjects = {
  amtrak: {
    project: amtrakProject,
    progress: amtrakProgress,
    errors: amtrakErrors,
    rfi: amtrakRfi,
    history: amtrakHistory,
    schedule: amtrakSchedule,
  },
  'krishna-apra': {
    project: krishnaProject,
    progress: krishnaProgress,
    errors: krishnaErrors,
    rfi: krishnaRfi,
    history: krishnaHistory,
    schedule: krishnaSchedule,
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
  if (builtInProjects[id]) return builtInProjects[id]
  const uploaded = loadUploaded()
  const found = uploaded.find(p => p.id === id)
  return found ? found.data : null
}

export function addUploadedProject(id, data) {
  const uploaded = loadUploaded()
  uploaded.push({ id, data })
  saveUploaded(uploaded)
}

export function removeUploadedProject(id) {
  const uploaded = loadUploaded().filter(p => p.id !== id)
  saveUploaded(uploaded)
}
