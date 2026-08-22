const connectors = [
  {
    id: 'procore',
    name: 'Procore',
    description: 'Project management platform for construction. Syncs schedule milestones, RFIs, and change orders into SPAN for unified health tracking.',
    icon: '\u{1F3D7}',
    status: 'connected',
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    syncFrequency: 'hourly',
    dataTypes: ['Schedule', 'RFIs', 'Change Orders', 'Daily Logs'],
    syncLog: [
      { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 47, details: '12 RFIs, 8 COs, 27 schedule items' },
      { timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 31, details: '9 RFIs, 5 COs, 17 schedule items' },
      { timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 52, details: '15 RFIs, 10 COs, 27 schedule items' },
      { timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), status: 'warning', itemsSynced: 38, details: '11 RFIs, 7 COs, 20 schedule items — 3 items skipped (validation)' },
      { timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 44, details: '13 RFIs, 9 COs, 22 schedule items' },
    ],
    config: {
      projectId: 'PRC-2024-0847',
      apiEndpoint: 'https://api.procore.com/rest/v1.1',
      companyId: '194520',
      syncSchedule: true,
      syncRFIs: true,
      syncChangeOrders: true,
      syncDailyLogs: false,
    },
  },
  {
    id: 'primavera-p6',
    name: 'Primavera P6',
    description: 'Oracle Primavera P6 schedule management. Syncs WBS hierarchy, activity progress, and resource assignments for schedule health analysis.',
    icon: '\u{1F4C5}',
    status: 'connected',
    lastSync: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    syncFrequency: 'daily',
    dataTypes: ['WBS', 'Activities', 'Resource Assignments', 'Baselines'],
    syncLog: [
      { timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 284, details: '3 WBS levels, 241 activities, 40 resources' },
      { timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 279, details: '3 WBS levels, 238 activities, 38 resources' },
      { timestamp: new Date(Date.now() - 54 * 60 * 60 * 1000).toISOString(), status: 'error', itemsSynced: 0, details: 'Connection timeout — P6 server unreachable' },
      { timestamp: new Date(Date.now() - 78 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 271, details: '3 WBS levels, 232 activities, 36 resources' },
      { timestamp: new Date(Date.now() - 102 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 265, details: '3 WBS levels, 228 activities, 34 resources' },
    ],
    config: {
      projectId: 'P6-METRO-2024',
      apiEndpoint: 'https://p6cloud.oracle.com/api/restapi',
      databaseId: 'PROD_P6',
      syncWBS: true,
      syncActivities: true,
      syncResources: true,
      syncBaselines: false,
    },
  },
  {
    id: 'bim360',
    name: 'Autodesk BIM 360',
    description: 'BIM collaboration platform. Syncs 3D model versions, field issues, and markup annotations for quality and coordination tracking.',
    icon: '\u{1F4D0}',
    status: 'disconnected',
    lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    syncFrequency: 'manual',
    dataTypes: ['Models', 'Issues', 'Markups', 'Clash Reports'],
    syncLog: [
      { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 18, details: '2 model versions, 11 issues, 5 markups' },
      { timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 23, details: '1 model version, 14 issues, 8 markups' },
      { timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), status: 'warning', itemsSynced: 15, details: '1 model version, 10 issues, 4 markups — 2 clashes unresolved' },
      { timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 21, details: '3 model versions, 12 issues, 6 markups' },
      { timestamp: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(), status: 'success', itemsSynced: 19, details: '2 model versions, 13 issues, 4 markups' },
    ],
    config: {
      projectId: 'BIM-ACC-2024-039',
      apiEndpoint: 'https://developer.api.autodesk.com',
      hubId: 'b.a1b2c3d4-e5f6',
      syncModels: true,
      syncIssues: true,
      syncMarkups: true,
      syncClashReports: false,
    },
  },
]

export function getConnectors() {
  return connectors.map(c => ({ ...c }))
}

export function getConnectorById(id) {
  const c = connectors.find(c => c.id === id)
  return c ? { ...c } : null
}

export function simulateSync(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const connector = connectors.find(c => c.id === id)
      if (!connector) {
        resolve(null)
        return
      }

      const now = new Date().toISOString()
      const itemsSynced = Math.floor(Math.random() * 40) + 15

      const detailsMap = {
        procore: `${Math.floor(itemsSynced * 0.3)} RFIs, ${Math.floor(itemsSynced * 0.2)} COs, ${Math.floor(itemsSynced * 0.5)} schedule items`,
        'primavera-p6': `3 WBS levels, ${Math.floor(itemsSynced * 0.85)} activities, ${Math.floor(itemsSynced * 0.15)} resources`,
        bim360: `${Math.ceil(itemsSynced * 0.1)} model versions, ${Math.floor(itemsSynced * 0.6)} issues, ${Math.floor(itemsSynced * 0.3)} markups`,
      }

      const newEntry = {
        timestamp: now,
        status: 'success',
        itemsSynced,
        details: detailsMap[id] || `${itemsSynced} items synced`,
      }

      connector.lastSync = now
      connector.status = 'connected'
      connector.syncLog.unshift(newEntry)
      if (connector.syncLog.length > 10) connector.syncLog.pop()

      resolve({
        ...connector,
        latestSync: newEntry,
      })
    }, 2000)
  })
}
