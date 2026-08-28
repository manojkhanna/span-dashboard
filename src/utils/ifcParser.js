import * as WebIFC from 'web-ifc'

const STRUCTURAL_NAMES = new Set([
  'BEAM', 'COLUMN', 'BRACE', 'ANGLE', 'ANGLE BRACE', 'VERTICAL BRACE',
  'KICKER BRACE', 'ELEVATOR BEAM', 'ELEVATOR POST', 'POST', 'FRAME',
  'HSS BEAM', 'HANDRAIL', 'SCREEN', 'BRB', 'EMBED CHANNEL',
  'DOOR JAMB ANGLE', 'DECK ANGLE', 'STOCK ANGLE',
])

function nameToCategory(name) {
  const n = (name || '').toUpperCase()
  if (['BEAM', 'HSS BEAM', 'ELEVATOR BEAM', 'HANDRAIL'].includes(n)) return 'beams'
  if (['COLUMN', 'POST', 'ELEVATOR POST'].includes(n)) return 'columns'
  return 'members'
}

export async function parseIfcFile(arrayBuffer) {
  const ifcApi = new WebIFC.IfcAPI()
  await ifcApi.Init()

  const data = new Uint8Array(arrayBuffer)
  const modelID = ifcApi.OpenModel(data)

  const summary = {
    source: 'Uploaded IFC Model',
    software: '',
    schema: '',
    totalElements: 0,
    totalWeightTons: 0,
    elementTypes: { beams: 0, columns: 0, members: 0 },
    zones: {},
    memberTypes: {},
  }

  try {
    const header = ifcApi.GetHeaderLine(modelID, WebIFC.FILE_NAME)
    if (header?.arguments) {
      summary.source = header.arguments[0]?.value || 'IFC Model'
      summary.software = header.arguments[5]?.value || ''
    }
  } catch {}

  try {
    const schema = ifcApi.GetHeaderLine(modelID, WebIFC.FILE_SCHEMA)
    if (schema?.arguments?.[0]?.[0]?.value) {
      summary.schema = schema.arguments[0][0].value
    }
  } catch {}

  const isTekla = summary.software.toLowerCase().includes('tekla')
    || await detectTeklaByProps(ifcApi, modelID)

  if (isTekla) {
    parseTeklaModel(ifcApi, modelID, summary)
  } else {
    parseSds2Model(ifcApi, modelID, summary)
  }

  ifcApi.CloseModel(modelID)
  return summary
}

function parseSds2Model(ifcApi, modelID, summary) {
  const typeMap = {
    [WebIFC.IFCBEAM]: 'beams',
    [WebIFC.IFCCOLUMN]: 'columns',
    [WebIFC.IFCMEMBER]: 'members',
  }

  const structuralTypes = Object.keys(typeMap).map(Number)
  const seqData = {}
  let totalWeightLbs = 0

  for (const ifcType of structuralTypes) {
    const ids = ifcApi.GetLineIDsWithType(modelID, ifcType)
    const category = typeMap[ifcType]

    for (let i = 0; i < ids.size(); i++) {
      const id = ids.get(i)
      summary.totalElements++
      summary.elementTypes[category]++

      const props = getElementProperties(ifcApi, modelID, id)
      const seq = props.Sequence || props.sequence || 'Unknown'
      const memberType = props.Member_Type || props.member_type || ''

      if (!seqData[seq]) {
        seqData[seq] = { elements: 0, weight_tons: 0, beams: 0, columns: 0, members: 0, braces: 0 }
      }
      const sd = seqData[seq]
      sd.elements++

      const weight = props.Net_Weight || props.Member_Net_Weight || props.net_weight || 0
      if (typeof weight === 'number' && weight > 0) {
        sd.weight_tons += weight / 2000
        totalWeightLbs += weight
      }

      if (category === 'beams') sd.beams++
      else if (category === 'columns') sd.columns++
      else if (category === 'members') sd.members++

      if (memberType) {
        const mt = memberType.toUpperCase()
        summary.memberTypes[mt] = (summary.memberTypes[mt] || 0) + 1
        if (mt.includes('BRACE')) sd.braces++
      }
    }
  }

  summary.totalWeightTons = Math.round(totalWeightLbs / 2000 * 10) / 10
  finalizeSummary(seqData, summary)
}

function parseTeklaModel(ifcApi, modelID, summary) {
  const propMap = buildPropertyMap(ifcApi, modelID)

  const assemblyIds = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCELEMENTASSEMBLY)
  const seqData = {}
  let totalWeightKg = 0

  for (let i = 0; i < assemblyIds.size(); i++) {
    const id = assemblyIds.get(i)
    const line = ifcApi.GetLine(modelID, id)
    const name = (line.Name?.value || '').toUpperCase()

    if (!STRUCTURAL_NAMES.has(name)) continue

    const category = nameToCategory(name)
    summary.totalElements++
    summary.elementTypes[category]++

    const props = propMap[id] || {}
    const weight = props['Assembly/Cast unit weight'] || props['Weight'] || 0
    const phase = props['Phase'] || 'Unknown'

    if (!seqData[phase]) {
      seqData[phase] = { elements: 0, weight_tons: 0, beams: 0, columns: 0, members: 0, braces: 0 }
    }
    const sd = seqData[phase]
    sd.elements++

    if (typeof weight === 'number' && weight > 0) {
      sd.weight_tons += weight / 1000
      totalWeightKg += weight
    }

    if (category === 'beams') sd.beams++
    else if (category === 'columns') sd.columns++
    else if (category === 'members') sd.members++

    summary.memberTypes[name] = (summary.memberTypes[name] || 0) + 1
    if (name.includes('BRACE')) sd.braces++
  }

  summary.totalWeightTons = Math.round(totalWeightKg / 1000 * 10) / 10
  finalizeSummary(seqData, summary)
}

function buildPropertyMap(ifcApi, modelID) {
  const map = {}
  const relIds = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES)

  for (let i = 0; i < relIds.size(); i++) {
    try {
      const rel = ifcApi.GetLine(modelID, relIds.get(i))
      const psetRef = rel.RelatingPropertyDefinition
      if (!psetRef) continue

      const psetId = psetRef.value || psetRef.expressID || psetRef
      if (typeof psetId !== 'number') continue

      const pset = ifcApi.GetLine(modelID, psetId)
      const psetName = pset.Name?.value || ''
      if (psetName !== 'Tekla Assembly' && psetName !== 'Tekla Common' && psetName !== 'Tekla Quantity') continue

      const psetProps = {}
      if (pset.HasProperties) {
        for (const propRef of pset.HasProperties) {
          const propId = propRef.value || propRef.expressID || propRef
          if (typeof propId !== 'number') continue
          try {
            const prop = ifcApi.GetLine(modelID, propId)
            if (prop.Name?.value && prop.NominalValue?.value !== undefined) {
              psetProps[prop.Name.value] = prop.NominalValue.value
            }
          } catch {}
        }
      }

      const objects = rel.RelatedObjects || []
      for (const objRef of objects) {
        const objId = objRef.value || objRef.expressID || objRef
        if (typeof objId !== 'number') continue
        if (!map[objId]) map[objId] = {}
        Object.assign(map[objId], psetProps)
      }
    } catch {}
  }

  return map
}

function finalizeSummary(seqData, summary) {
  for (const sd of Object.values(seqData)) {
    sd.weight_tons = Math.round(sd.weight_tons * 100) / 100
  }
  summary.zones = Object.fromEntries(
    Object.entries(seqData).sort((a, b) => b[1].weight_tons - a[1].weight_tons)
  )
  summary.memberTypes = Object.fromEntries(
    Object.entries(summary.memberTypes).sort((a, b) => b[1] - a[1])
  )
}

async function detectTeklaByProps(ifcApi, modelID) {
  try {
    const relIds = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES)
    for (let i = 0; i < Math.min(20, relIds.size()); i++) {
      const rel = ifcApi.GetLine(modelID, relIds.get(i))
      const psetRef = rel.RelatingPropertyDefinition
      if (!psetRef) continue
      const psetId = psetRef.value || psetRef.expressID || psetRef
      if (typeof psetId !== 'number') continue
      const pset = ifcApi.GetLine(modelID, psetId)
      if (pset.Name?.value?.startsWith('Tekla')) return true
    }
  } catch {}
  return false
}

function getElementProperties(ifcApi, modelID, elementId) {
  const props = {}
  try {
    const psets = ifcApi.GetPropertySets(modelID, elementId)
    for (const pset of psets) {
      if (pset.HasProperties) {
        for (const prop of pset.HasProperties) {
          if (prop.Name?.value && prop.NominalValue?.value !== undefined) {
            props[prop.Name.value] = prop.NominalValue.value
          }
        }
      }
    }
  } catch {}
  return props
}
