import { useRef, useEffect, useState, createContext, useContext } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import { Physics, RigidBody } from '@react-three/rapier'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import deskUrl from './assets/desk.fbx?url'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import './Scene.css'

const MOVE_SPEED = 4

// ─── Editor context ───────────────────────────────────────────────────────────
type EditorCtxType = { editMode: boolean; select: (obj: THREE.Object3D | null) => void }
const EditorCtx = createContext<EditorCtxType>({ editMode: false, select: () => {} })

// ─── Module-level grab state (shared between components) ─────────────────────
const grab = {
  body: null as RapierRigidBody | null,
  distance: 0,
  start(body: RapierRigidBody | null, distance: number) {
    this.body = body
    this.distance = distance
    body?.setBodyType(2, true) // 2 = KinematicPositionBased → ignoriert Gravity
  },
  release() {
    this.body?.setBodyType(0, true) // 0 = Dynamic → Gravity aktiv
    this.body = null
  },
}

// ─── PC Tower (with integrated RGB light) ────────────────────────────────────
function PcTower() {
  const hue = useRef(0)
  const glassRef = useRef<THREE.MeshStandardMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame((_, delta) => {
    hue.current = (hue.current + delta * 0.15) % 1
    glassRef.current?.emissive.setHSL(hue.current, 1, 0.4)
    lightRef.current?.color.setHSL(hue.current, 1, 0.02)
  })

  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.96, 0.48]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* glass panel – linke Seite */}
      <mesh position={[-0.112, 0, 0]}>
        <boxGeometry args={[0.004, 0.92, 0.44]} />
        <meshStandardMaterial
          ref={glassRef}
          color="#050505"
          emissive="#ff00ff"
          emissiveIntensity={0.6}
          transparent
          opacity={0.55}
          roughness={0}
          metalness={0.1}
        />
      </mesh>
      {/* RGB light shines left out of the glass panel */}
      <pointLight ref={lightRef} position={[-0.18, 0, 0]} intensity={4} distance={2.2} decay={2} />
    </group>
  )
}

// ─── Editable wrapper: click to select in editor mode ────────────────────────
function Editable({ label, position, rotation, scale, children }: {
  label: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  children: React.ReactNode
}) {
  const { editMode, select } = useContext(EditorCtx)
  const groupRef = useRef<THREE.Group>(null)
  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={editMode ? (e) => { e.stopPropagation(); select(groupRef.current); console.info(`[${label}] selected`) } : undefined}
    >
      {children}
    </group>
  )
}

// ─── TransformGizmo (inside Canvas) ──────────────────────────────────────────
function TransformGizmo({ selected, mode }: { selected: THREE.Object3D | null; mode: 'translate' | 'rotate' | 'scale' }) {
  if (!selected) return null
  return (
    <TransformControls
      object={selected}
      mode={mode}
      onObjectChange={() => {
        if (!selected) return
        const p = selected.position
        const r = selected.rotation
        const s = selected.scale
        console.log(`position: [${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]  rotation: [${r.x.toFixed(3)}, ${r.y.toFixed(3)}, ${r.z.toFixed(3)}]  scale: [${s.x.toFixed(3)}, ${s.y.toFixed(3)}, ${s.z.toFixed(3)}]`)
      }}
    />
  )
}

// ─── Monitor ─────────────────────────────────────────────────────────────────
function Monitor() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.68, 0.40, 0.03]} />
        <meshStandardMaterial color="#111111" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.016]}>
        <boxGeometry args={[0.62, 0.35, 0.001]} />
        <meshStandardMaterial color="#1a2a3a" emissive="#1a3a5a" emissiveIntensity={0.8} />
      </mesh>
      <mesh castShadow position={[0, -0.3, 0.04]}>
        <boxGeometry args={[0.04, 0.2, 0.04]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, -0.42, 0.06]}>
        <boxGeometry args={[0.22, 0.025, 0.14]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

// ─── Keyboard ────────────────────────────────────────────────────────────────
function Keyboard({ position }: { position: [number, number, number] }) {
  const rbRef = useRef<RapierRigidBody>(null)
  return (
    <RigidBody ref={rbRef} colliders="cuboid" mass={0.6} restitution={0.1} friction={0.8} ccd
      position={position}>
      <mesh
        castShadow
        onPointerDown={(e) => { e.stopPropagation(); grab.start(rbRef.current, e.distance) }}
      >
        <boxGeometry args={[0.44, 0.025, 0.15]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.3} />
      </mesh>
    </RigidBody>
  )
}

// ─── Mug ─────────────────────────────────────────────────────────────────────
function Mug({ position }: { position: [number, number, number] }) {
  const rbRef = useRef<RapierRigidBody>(null)
  return (
    <RigidBody ref={rbRef} colliders="hull" mass={0.4} restitution={0.2} friction={0.7} ccd position={position}>
      <mesh
        castShadow
        onPointerDown={(e) => { e.stopPropagation(); grab.start(rbRef.current, e.distance) }}
      >
        <cylinderGeometry args={[0.038, 0.032, 0.1, 16]} />
        <meshStandardMaterial color="#333" roughness={0.6} />
      </mesh>
    </RigidBody>
  )
}

// ─── Book ────────────────────────────────────────────────────────────────────
function Book({ position, color }: { position: [number, number, number]; color: string }) {
  const rbRef = useRef<RapierRigidBody>(null)
  return (
    <RigidBody ref={rbRef} colliders="cuboid" mass={0.5} restitution={0.05} friction={0.9} ccd position={position}>
      <mesh
        castShadow
        onPointerDown={(e) => { e.stopPropagation(); grab.start(rbRef.current, e.distance) }}
      >
        <boxGeometry args={[0.12, 0.02, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </RigidBody>
  )
}

// ─── Desk (FBX model) ────────────────────────────────────────────────────────
function Desk() {
  const fbx = useLoader(FBXLoader, deskUrl)

  // Schatten auf allen Meshes des Modells aktivieren
  fbx.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  return (
    // position/scale hier anpassen falls das Modell nicht passt
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={fbx} scale={0.002} rotation={[0, Math.PI / 2, 0]} />
    </RigidBody>
  )
}

// ─── Camera controller: WASD / Q+E / MMB pan ─────────────────────────────────
function CameraController() {
  const { camera, gl } = useThree()

  // Initiale Blickrichtung — lookAt(x, y, z) anpassen
  useEffect(() => { camera.lookAt(0, 1, -1) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'p') return
      const p = camera.position
      console.log(`camera position: [${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [camera])
  const keys    = useRef<Set<string>>(new Set())
  const mmb     = useRef(false)
  const lastXY  = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code)
    const onKeyUp   = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    const canvas = gl.domElement

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      mmb.current = true
      lastXY.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!mmb.current) return
      const dx = e.clientX - lastXY.current.x
      const dy = e.clientY - lastXY.current.y
      lastXY.current = { x: e.clientX, y: e.clientY }

      const right = new THREE.Vector3()
      camera.getWorldDirection(right)         // reuse as temp
      right.crossVectors(right, new THREE.Vector3(0, 1, 0)).normalize()

      camera.position.addScaledVector(right,                    -dx * 0.005)
      camera.position.addScaledVector(new THREE.Vector3(0,1,0),  dy * 0.005)
    }
    const onMouseUp = (e: MouseEvent) => { if (e.button === 1) mmb.current = false }

    canvas.addEventListener('mousedown',     onMouseDown)
    window.addEventListener('mousemove',     onMouseMove)
    window.addEventListener('mouseup',       onMouseUp)
    canvas.addEventListener('contextmenu',   (e) => e.preventDefault())

    return () => {
      window.removeEventListener('keydown',    onKeyDown)
      window.removeEventListener('keyup',      onKeyUp)
      canvas.removeEventListener('mousedown',  onMouseDown)
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('mouseup',    onMouseUp)
    }
  }, [camera, gl])

  useFrame((_, delta) => {
    const forward = new THREE.Vector3()
    const right   = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0))

    const dir = new THREE.Vector3()
    if (keys.current.has('KeyW')) dir.add(forward)
    if (keys.current.has('KeyS')) dir.sub(forward)
    if (keys.current.has('KeyA')) dir.sub(right)
    if (keys.current.has('KeyD')) dir.add(right)
    if (keys.current.has('KeyQ')) dir.y -= 1
    if (keys.current.has('KeyE')) dir.y += 1
    if (dir.lengthSq() > 0) camera.position.addScaledVector(dir.normalize(), MOVE_SPEED * delta)
  })

  return null
}

// ─── Room ────────────────────────────────────────────────────────────────────
function Room() {
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid" rotation={[-Math.PI / 2, 0, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[12, 10]} />
          <meshStandardMaterial color="#1a1520" roughness={0.9} />
        </mesh>
      </RigidBody>
      <mesh receiveShadow position={[0, 2, -2.2]}>
        <boxGeometry args={[12, 4, 0.1]} />
        <meshStandardMaterial color="#161016" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[-3, 2, 0]}>
        <boxGeometry args={[0.1, 4, 10]} />
        <meshStandardMaterial color="#141014" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[4, 2, 0]}>
        <boxGeometry args={[0.1, 4, 10]} />
        <meshStandardMaterial color="#141014" roughness={0.95} />
      </mesh>
    </group>
  )
}

// ─── Grab controller ─────────────────────────────────────────────────────────
function GrabController() {
  const { camera, gl } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  useEffect(() => {
    const canvas = gl.domElement

    const onMove = (e: PointerEvent) => {
      if (!grab.body) return
      mouse.current.x = (e.clientX / canvas.clientWidth) * 2 - 1
      mouse.current.y = -(e.clientY / canvas.clientHeight) * 2 + 1
      raycaster.current.setFromCamera(mouse.current, camera)
      const target = new THREE.Vector3()
      raycaster.current.ray.at(grab.distance, target)
      grab.body.setTranslation({ x: target.x, y: target.y, z: target.z }, true)
      grab.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      grab.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    const onUp = () => { grab.release() }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
    }
  }, [camera, gl])

  return null
}

// ─── Scene root ──────────────────────────────────────────────────────────────
function Scene() {
  const [hint, setHint] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<THREE.Object3D | null>(null)
  const [gizmoMode, setGizmoMode] = useState<'translate' | 'rotate' | 'scale'>('translate')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2')        setEditMode(v => { if (v) setSelected(null); return !v })
      if (e.key === 't' || e.key === 'T') setGizmoMode('translate')
      if (e.key === 'r' || e.key === 'R') setGizmoMode('rotate')
      if (e.key === 's' || e.key === 'S') setGizmoMode('scale')
      if (e.key === 'Escape')    setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const editorCtx: EditorCtxType = { editMode, select: setSelected }

  return (
    <EditorCtx.Provider value={editorCtx}>
      <div className="scene-container" onClick={() => setHint(false)}>
        <Canvas
          shadows
          camera={{ position: [0.050, 1.255, 0.404], fov: 90, near: 0.01, far: 100 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.15} />
          <directionalLight castShadow position={[2, 4, 2]} intensity={0.6} shadow-mapSize={[2048, 2048]} />
          <pointLight position={[0, 3.5, -1]} intensity={1.2} color="#ffe4cc" distance={6} decay={2} />

          <CameraController />

          <Physics gravity={[0, -9.81, 0]}>
            <Room />
            <Desk />

            <Editable label="monitor-left" position={[-0.566, 1.120, -0.503]} rotation={[0.000, 0.380, 0.000]} scale={[1.000, 0.741, 1.000]}>
              <Monitor />
            </Editable>
            <Editable label="monitor-center" position={[0.146, 1.120, -0.631]} scale={[1.204, 0.752, 1.000]}>
              <Monitor />
            </Editable>
            <Editable label="monitor-right" position={[0.672, 1.066, -0.546]} rotation={[0.000, -0.555, 0.000]} scale={[0.481, 1.287, 1.000]}>
              <Monitor />
            </Editable>

            <Editable label="pc-tower" position={[0.935, 0.992, -0.280]} scale={[1, 0.379, 1]}>
              <PcTower />
            </Editable>

            <Keyboard position={[0, 2, -0.15]}/>
            <Mug position={[0.2, 2, 0]} />
            <Book position={[0.2, 2, -0.25]} color="#41521F" />
            <Book position={[-0.4, 2, -0.30]} color="#BA1B1D" />
            <Book position={[0.3, 2, -0.20]} color="#6320EE" />

            <GrabController />
          </Physics>

          <TransformGizmo selected={selected} mode={gizmoMode} />
        </Canvas>

        {editMode && (
          <div className="scene-editor-bar">
            EDITOR · <b>[T]</b> Verschieben &nbsp;<b>[R]</b> Drehen &nbsp;<b>[S]</b> Skalieren &nbsp;<b>[F2]</b> Beenden &nbsp;<b>[ESC]</b> Abwählen
            &nbsp;— Koordinaten in der Konsole
          </div>
        )}
        {!editMode && hint && (
          <div className="scene-hint">LMB = greifen · WASD = bewegen · Q/E = hoch/runter · MMB = pan · F2 = Editor</div>
        )}
      </div>
    </EditorCtx.Provider>
  )
}

export default Scene
