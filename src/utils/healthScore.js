function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

export function getHealthStatus(score) {
  if (score >= 75) return { label: 'Green', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' }
  if (score >= 50) return { label: 'Amber', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  return { label: 'Red', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

export function computeProgressScore(progressData) {
  const weightedProgress = progressData.reduce((sum, seq) => {
    return sum + seq.contribution * (seq.totalProgress / 10) * 100
  }, 0)
  return clamp(Math.round(weightedProgress), 0, 100)
}

export function computeQualityScore(errorsData) {
  const externalCount = errorsData.external.length
  const catACount = errorsData.external.filter(e => e.category === 'A').length
  const penalty = catACount * 15 + (externalCount - catACount) * 5
  return clamp(100 - penalty, 0, 100)
}

export function computeRfiScore(rfiData) {
  const { total, closed } = rfiData.summary
  const closureRate = total > 0 ? (closed / total) * 100 : 100
  const openPenalty = rfiData.summary.open * 3
  return clamp(Math.round(closureRate - openPenalty), 0, 100)
}

export function computeChangeOrderScore(projectData) {
  const { submitted, approved, rejected } = projectData.changeOrders
  if (submitted === 0) return 100
  const approvalRate = (approved / submitted) * 100
  const rejectionPenalty = rejected * 10
  return clamp(Math.round(approvalRate - rejectionPenalty), 0, 100)
}

export function computeResourceScore(projectData) {
  const counts = projectData.manCount.map(m => m.count)
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length
  const stability = Math.max(0, 100 - variance * 2)
  return clamp(Math.round(stability), 0, 100)
}

export function computeOverallHealth(data) {
  const { project, progress, errors, rfi } = data
  const weights = {
    progress: 0.30,
    quality: 0.25,
    rfi: 0.20,
    changeOrder: 0.10,
    resource: 0.15,
  }
  const scores = {
    progress: computeProgressScore(progress),
    quality: computeQualityScore(errors),
    rfi: computeRfiScore(rfi),
    changeOrder: computeChangeOrderScore(project),
    resource: computeResourceScore(project),
  }
  const overall = Math.round(
    Object.entries(weights).reduce((sum, [key, w]) => sum + scores[key] * w, 0)
  )
  return { overall, scores, weights }
}
