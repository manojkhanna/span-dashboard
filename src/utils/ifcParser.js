import * as WebIFC from 'web-ifc'

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

  for (const [seq, sd] of Object.entries(seqData)) {
    sd.weight_tons = Math.round(sd.weight_tons * 100) / 100
  }
  summary.zones = Object.fromEntries(
    Object.entries(seqData).sort((a, b) => b[1].weight_tons - a[1].weight_tons)
  )

  summary.memberTypes = Object.fromEntries(
    Object.entries(summary.memberTypes).sort((a, b) => b[1] - a[1])
  )

  ifcApi.CloseModel(modelID)

  return summary
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
