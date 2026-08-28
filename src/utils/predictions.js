const DIMENSION_LABELS = {
  overall: 'Overall Health',
  progress: 'Progress',
  quality: 'Quality',
  rfi: 'RFI',
  changeOrder: 'Change Orders',
  resource: 'Resources',
}

function linearTrend(points) {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: points[0] || 0 }
  const xs = points.map((_, i) => i)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = points.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (points[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  return { slope, intercept: meanY - slope * meanX }
}

function stddev(values) {
  const n = values.length
  if (n < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1)
  return Math.sqrt(variance)
}

function holtSmooth(values, alpha = 0.3, beta = 0.1) {
  if (!values || values.length === 0) {
    return { level: 0, trend: 0, forecast: () => 0 }
  }
  if (values.length === 1) {
    return { level: values[0], trend: 0, forecast: () => values[0] }
  }

  let level = values[0]
  let trend = values[1] - values[0]

  for (let i = 1; i < values.length; i++) {
    const newLevel = alpha * values[i] + (1 - alpha) * (level + trend)
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend
    level = newLevel
    trend = newTrend
  }

  return {
    level,
    trend,
    forecast: (steps) => level + trend * steps,
  }
}

export function forecastHealth(history, monthsAhead = 3) {
  if (!history || history.length < 2) return []

  const dims = ['overall', 'progress', 'quality', 'rfi', 'changeOrder', 'resource']
  const forecasts = []
  const lastMonth = history[history.length - 1].month
  const [year, month] = lastMonth.split('-').map(Number)

  for (let m = 1; m <= monthsAhead; m++) {
    const futureMonth = month + m
    const fYear = year + Math.floor((futureMonth - 1) / 12)
    const fMonth = ((futureMonth - 1) % 12) + 1
    const entry = { month: `${fYear}-${String(fMonth).padStart(2, '0')}`, forecast: true, method: 'holt' }

    dims.forEach(dim => {
      const values = history.map(h => h[dim])
      const smooth = holtSmooth(values)
      const projected = Math.round(smooth.forecast(m))
      const sd = stddev(values)
      const band = sd * Math.sqrt(m)
      entry[dim] = Math.max(0, Math.min(100, projected))
      entry[`${dim}_upper`] = Math.max(0, Math.min(100, Math.round(projected + band)))
      entry[`${dim}_lower`] = Math.max(0, Math.min(100, Math.round(projected - band)))
    })

    forecasts.push(entry)
  }

  return forecasts
}

export function detectRisks(history, scores) {
  const risks = []
  if (!history || history.length < 3) return risks

  const dims = ['progress', 'quality', 'rfi', 'changeOrder', 'resource']

  dims.forEach(dim => {
    const values = history.map(h => h[dim])
    const recent = values.slice(-3)
    const { slope } = linearTrend(values)
    const current = scores[dim]
    const label = DIMENSION_LABELS[dim]

    if (slope < -2 && current < 75) {
      risks.push({
        dimension: dim,
        label,
        severity: current < 50 ? 'critical' : 'warning',
        type: 'declining',
        message: `${label} declining at ${Math.abs(slope).toFixed(1)} pts/month`,
        detail: `Score dropped from ${recent[0]} to ${current} over the last 3 months. At this rate, it will reach ${Math.max(0, Math.round(current + slope * 3))} in 3 months.`,
        score: current,
        trend: slope,
      })
    }

    if (current < 50 && slope <= 0) {
      const existing = risks.find(r => r.dimension === dim)
      if (!existing) {
        risks.push({
          dimension: dim,
          label,
          severity: current < 30 ? 'critical' : 'warning',
          type: 'below-threshold',
          message: `${label} is in the red zone (${current})`,
          detail: `Score has been below the healthy threshold (75) and is not recovering. Immediate attention needed.`,
          score: current,
          trend: slope,
        })
      }
    }

    if (slope > 0 && current < 50) {
      const monthsToGreen = slope > 0 ? Math.ceil((75 - current) / slope) : Infinity
      if (monthsToGreen > 6) {
        risks.push({
          dimension: dim,
          label,
          severity: 'info',
          type: 'slow-recovery',
          message: `${label} recovering slowly — ~${monthsToGreen} months to green`,
          detail: `Current improvement rate of ${slope.toFixed(1)} pts/month is insufficient. Would take ${monthsToGreen} months to reach a healthy score.`,
          score: current,
          trend: slope,
        })
      }
    }
  })

  risks.sort((a, b) => {
    const sevOrder = { critical: 0, warning: 1, info: 2 }
    return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3)
  })

  return risks
}

export function generateRecommendations(data) {
  const { scores, risks, rfi, errors, project, progress, schedule } = data
  const recs = []

  if (scores.rfi < 50) {
    const openPct = rfi?.summary ? Math.round((rfi.summary.open / rfi.summary.total) * 100) : 0
    recs.push({
      priority: 'high',
      category: 'RFI Management',
      title: 'Accelerate RFI closure process',
      description: `${openPct}% of RFIs remain open. Implement weekly triage meetings and assign dedicated owners to each open RFI to reduce backlog.`,
      impact: 'Could improve RFI score by 15-20 points within 2 months',
    })
  }

  if (scores.quality < 50) {
    const totalErrors = errors?.internal?.byMonth?.reduce((s, m) => s + m.total, 0) || 0
    recs.push({
      priority: 'high',
      category: 'Quality Control',
      title: 'Implement additional QA checkpoints',
      description: `${totalErrors} internal errors detected. Add peer review gates before submission and introduce automated validation checks.`,
      impact: 'Expected 30-40% reduction in error rate within one cycle',
    })
  }

  if (scores.progress < 50) {
    const stalled = progress?.filter(p => p.totalProgress < 30).length || 0
    recs.push({
      priority: 'high',
      category: 'Progress',
      title: 'Review resource allocation and blockers',
      description: `${stalled} sequence${stalled !== 1 ? 's' : ''} below 30% progress. Identify bottlenecks and consider rebalancing team allocation across sequences.`,
      impact: 'Unblocking stalled sequences can accelerate overall progress by 10-15%',
    })
  }

  if (scores.changeOrder < 75 && project?.changeOrders?.rejected > 0) {
    recs.push({
      priority: 'medium',
      category: 'Scope Management',
      title: 'Improve change order documentation',
      description: `${project.changeOrders.rejected} change order(s) rejected. Strengthen justification documentation and pre-approval review process.`,
      impact: 'Higher approval rates stabilize scope and reduce rework',
    })
  }

  const delayedMilestones = schedule?.filter(m => m.status === 'delayed').length || 0
  if (delayedMilestones > 0) {
    recs.push({
      priority: 'high',
      category: 'Schedule',
      title: 'Address delayed milestones',
      description: `${delayedMilestones} milestone${delayedMilestones !== 1 ? 's are' : ' is'} delayed. Review critical path and allocate resources to bring schedule back on track.`,
      impact: 'Prevents cascade delays to downstream milestones',
    })
  }

  const decliningRisks = risks?.filter(r => r.type === 'declining') || []
  if (decliningRisks.length > 0) {
    const dims = decliningRisks.map(r => r.label).join(', ')
    recs.push({
      priority: 'medium',
      category: 'Trend Analysis',
      title: 'Investigate declining metrics',
      description: `${dims} showing downward trend. Conduct root-cause analysis to identify systemic issues before scores drop further.`,
      impact: 'Early intervention prevents metrics from reaching critical thresholds',
    })
  }

  if (scores.resource < 75) {
    recs.push({
      priority: 'medium',
      category: 'Team Management',
      title: 'Optimize team utilization',
      description: 'Resource score indicates potential understaffing or skill gaps. Review team capacity and consider augmentation for critical sequences.',
      impact: 'Proper staffing improves velocity and reduces burnout risk',
    })
  }

  const externalCount = errors?.external?.reduce((s, e) => s + e.count, 0) || 0
  if (externalCount > 5) {
    recs.push({
      priority: 'medium',
      category: 'Client Coordination',
      title: 'Reduce client-side errors',
      description: `${externalCount} external errors from client input. Establish clearer submission guidelines and pre-validation checklists for client deliverables.`,
      impact: 'Reducing external errors decreases rework and improves quality scores',
    })
  }

  if (recs.length === 0) {
    recs.push({
      priority: 'low',
      category: 'General',
      title: 'Maintain current trajectory',
      description: 'All metrics are within healthy ranges. Continue current practices and monitor for any emerging trends.',
      impact: 'Sustain project health through consistent execution',
    })
  }

  recs.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 }
    return (p[a.priority] || 3) - (p[b.priority] || 3)
  })

  return recs
}

export function computeSequenceForecasts(progress, history) {
  if (!progress || !history || history.length < 2) return []

  const progressSmooth = holtSmooth(history.map(h => h.progress))
  const monthlyGain = Math.max(progressSmooth.trend, 0.5)
  const velocity = +(monthlyGain * 0.8).toFixed(1)

  // Detect data format: when totalProgress ≈ modelProgress for all sequences,
  // it's the raw completion % (Amtrak). Otherwise totalProgress is the weighted
  // project contribution (contribution × completion) and needs normalizing.
  const withProgress = progress.filter(s => (s.totalProgress || 0) > 0)
  const isDirectProgress = withProgress.length > 0 &&
    withProgress.every(s => Math.abs((s.totalProgress || 0) - (s.modelProgress || 0)) < 2)

  return progress.map(seq => {
    let completion
    if (isDirectProgress) {
      completion = seq.totalProgress || seq.modelProgress || 0
    } else if (seq.contribution > 0) {
      completion = Math.min(100, (seq.totalProgress || 0) / seq.contribution)
    } else {
      completion = seq.modelProgress || 0
    }

    const current = Math.round(completion * 10) / 10
    const remaining = 100 - current
    const monthsToComplete = remaining <= 0 ? 0 : Math.ceil(remaining / velocity)
    const now = new Date()
    const estComplete = new Date(now.getFullYear(), now.getMonth() + monthsToComplete, 1)

    return {
      sequence: seq.sequence,
      currentProgress: current,
      velocity,
      monthsToComplete,
      estimatedCompletion: estComplete.toISOString().slice(0, 7),
      phase: seq.phase,
    }
  })
}
