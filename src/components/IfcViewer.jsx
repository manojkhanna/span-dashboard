import { useRef, useState, useEffect, useCallback } from 'react'

export default function IfcViewer() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const cleanupRef = useRef(null)
  const [state, setState] = useState('idle')
  const [progress, setProgress] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [stats, setStats] = useState(null)

  const loadModel = useCallback(async (file) => {
    setState('loading')
    setProgress('Initializing 3D engine...')

    try {
      const [THREE, { OrbitControls }, { mergeGeometries }, WebIFC] = await Promise.all([
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
        import('three/examples/jsm/utils/BufferGeometryUtils.js'),
        import('web-ifc'),
      ])

      const ifcApi = new WebIFC.IfcAPI()
      ifcApi.SetWasmPath('/')
      await ifcApi.Init()

      setProgress('Reading IFC file...')
      await new Promise(r => setTimeout(r, 30))

      const buffer = await file.arrayBuffer()
      const modelID = ifcApi.OpenModel(new Uint8Array(buffer))

      setProgress('Extracting geometry from model...')
      await new Promise(r => setTimeout(r, 30))

      const geometryBuckets = new Map()
      let elementCount = 0

      ifcApi.StreamAllMeshes(modelID, (mesh) => {
        const placed = mesh.geometries
        for (let i = 0; i < placed.size(); i++) {
          const pg = placed.get(i)
          const geo = ifcApi.GetGeometry(modelID, pg.geometryExpressID)

          const rawVerts = ifcApi.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize())
          const rawIndices = ifcApi.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize())

          if (rawVerts.length === 0 || rawIndices.length === 0) {
            geo.delete()
            return
          }

          const vertexCount = rawVerts.length / 6
          const positions = new Float32Array(vertexCount * 3)
          const normals = new Float32Array(vertexCount * 3)
          for (let j = 0; j < vertexCount; j++) {
            const src = j * 6
            const dst = j * 3
            positions[dst] = rawVerts[src]
            positions[dst + 1] = rawVerts[src + 1]
            positions[dst + 2] = rawVerts[src + 2]
            normals[dst] = rawVerts[src + 3]
            normals[dst + 1] = rawVerts[src + 4]
            normals[dst + 2] = rawVerts[src + 5]
          }

          const bufGeo = new THREE.BufferGeometry()
          bufGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
          bufGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
          bufGeo.setIndex(new THREE.BufferAttribute(rawIndices, 1))

          const matrix = new THREE.Matrix4().fromArray(pg.flatTransformation)
          bufGeo.applyMatrix4(matrix)

          const c = pg.color
          const key = `${(c.x * 255) | 0}_${(c.y * 255) | 0}_${(c.z * 255) | 0}_${(c.w * 100) | 0}`
          if (!geometryBuckets.has(key)) {
            geometryBuckets.set(key, { geometries: [], color: { r: c.x, g: c.y, b: c.z, a: c.w } })
          }
          geometryBuckets.get(key).geometries.push(bufGeo)

          geo.delete()
          elementCount++
        }
      })

      setProgress(`Building scene — ${elementCount.toLocaleString()} elements in ${geometryBuckets.size} material groups...`)
      await new Promise(r => setTimeout(r, 30))

      const container = containerRef.current
      if (!container) return

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf0ede6)

      const width = container.clientWidth
      const height = 500

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100000)

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      if (canvasRef.current && container.contains(canvasRef.current)) {
        container.removeChild(canvasRef.current)
      }
      container.appendChild(renderer.domElement)
      canvasRef.current = renderer.domElement

      scene.add(new THREE.AmbientLight(0xffffff, 0.5))
      const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
      dirLight1.position.set(100, 200, 100)
      scene.add(dirLight1)
      const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3)
      dirLight2.position.set(-100, 50, -100)
      scene.add(dirLight2)

      let meshCount = 0
      for (const [, bucket] of geometryBuckets) {
        let finalGeo
        if (bucket.geometries.length === 1) {
          finalGeo = bucket.geometries[0]
        } else {
          try {
            finalGeo = mergeGeometries(bucket.geometries, false)
            bucket.geometries.forEach(g => g.dispose())
          } catch {
            finalGeo = bucket.geometries[0]
          }
        }
        if (!finalGeo) continue

        const material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(bucket.color.r, bucket.color.g, bucket.color.b),
          opacity: bucket.color.a,
          transparent: bucket.color.a < 0.99,
          side: THREE.DoubleSide,
        })

        scene.add(new THREE.Mesh(finalGeo, material))
        meshCount++
      }

      const box = new THREE.Box3().setFromObject(scene)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      camera.position.set(
        center.x + maxDim * 0.7,
        center.y + maxDim * 0.5,
        center.z + maxDim * 0.7
      )
      camera.lookAt(center)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.copy(center)
      controls.enableDamping = true
      controls.dampingFactor = 0.1
      controls.update()

      const gridHelper = new THREE.GridHelper(maxDim * 2, 20, 0xcccccc, 0xe0e0e0)
      gridHelper.position.y = box.min.y - 0.1
      gridHelper.position.x = center.x
      gridHelper.position.z = center.z
      scene.add(gridHelper)

      const axesHelper = new THREE.AxesHelper(maxDim * 0.08)
      axesHelper.position.copy(box.min)
      scene.add(axesHelper)

      let animId
      const animate = () => {
        animId = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      const handleResize = () => {
        const w = container.clientWidth
        camera.aspect = w / 500
        camera.updateProjectionMatrix()
        renderer.setSize(w, 500)
      }
      window.addEventListener('resize', handleResize)

      cleanupRef.current = () => {
        cancelAnimationFrame(animId)
        window.removeEventListener('resize', handleResize)
        controls.dispose()
        renderer.dispose()
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose()
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
            else obj.material.dispose()
          }
        })
      }

      ifcApi.CloseModel(modelID)
      setStats({ elements: elementCount, groups: meshCount })
      setState('ready')
      setProgress('')
    } catch (err) {
      setState('error')
      setErrorMsg(err.message)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  const handleFileSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ifc'
    input.onchange = (e) => {
      const f = e.target.files[0]
      if (f) loadModel(f)
    }
    input.click()
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden print:hidden">
      <div className="flex items-center justify-between p-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-800">3D Model Viewer</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Three.js</span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {stats
              ? `${stats.elements.toLocaleString()} elements · ${stats.groups} draw groups`
              : 'Isometric view from IFC model'}
          </p>
        </div>
        {state !== 'loading' && (
          <button
            onClick={handleFileSelect}
            className="px-3 py-1.5 rounded-lg bg-teal-brand text-xs font-medium text-white hover:bg-teal-brand/90 transition-colors shadow-sm"
          >
            {state === 'ready' ? 'Load Different Model' : 'Load IFC Model'}
          </button>
        )}
      </div>

      <div ref={containerRef} className="relative" style={{ minHeight: state === 'idle' ? 220 : 500 }}>
        {state === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.5">
                <path d="M12 3L2 8l10 5 10-5-10-5z" />
                <path d="M2 16l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <p className="text-sm text-stone-600 font-medium mb-1">Load IFC Model for 3D View</p>
            <p className="text-xs text-stone-400 mb-4">Select an IFC file from your computer to render the structural model</p>
            <button
              onClick={handleFileSelect}
              className="px-4 py-2 rounded-lg bg-teal-brand text-sm font-medium text-white hover:bg-teal-brand/90 transition-colors shadow-sm"
            >
              Select IFC File
            </button>
          </div>
        )}

        {state === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10">
            <div className="w-10 h-10 border-3 border-teal-brand/30 border-t-teal-brand rounded-full animate-spin mb-4" />
            <p className="text-sm text-stone-700 font-medium">{progress}</p>
            <p className="text-xs text-stone-400 mt-1">Large models may take 10–30 seconds</p>
          </div>
        )}

        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <p className="text-sm text-red-600 mb-2">Failed to load model</p>
            <p className="text-xs text-stone-500 mb-4">{errorMsg}</p>
            <button
              onClick={handleFileSelect}
              className="px-4 py-2 rounded-lg bg-stone-100 text-sm text-stone-600 hover:bg-stone-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {state === 'ready' && (
          <div className="absolute bottom-3 left-3 z-10 text-xs text-stone-400 bg-white/80 backdrop-blur px-2 py-1 rounded shadow-sm">
            Drag to rotate · Scroll to zoom · Right-drag to pan
          </div>
        )}
      </div>
    </div>
  )
}
