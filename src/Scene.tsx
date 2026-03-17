import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import './Scene.css'

const MOVE_SPEED = 4

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

// ─── RGB cycling light from PC ───────────────────────────────────────────────
function RgbLight() {
  const lightRef = useRef<THREE.PointLight>(null)
  const hue = useRef(0)

  useFrame((_, delta) => {
    if (!lightRef.current) return
    hue.current = (hue.current + delta * 0.15) % 1
    lightRef.current.color.setHSL(hue.current, 1, 0.5)
  })

  return <pointLight ref={lightRef} position={[3.2, 0.85, -0.3]} intensity={4} distance={2.2} decay={2} />
}

// ─── PC Tower ────────────────────────────────────────────────────────────────
function PcTower() {
  const hue = useRef(0)
  const glassRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((_, delta) => {
    if (!glassRef.current) return
    hue.current = (hue.current + delta * 0.15) % 1
    glassRef.current.emissive.setHSL(hue.current, 1, 0.4)
  })

  return (
    <group position={[3.1, 0.48, -0.55]}>
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.96, 0.48]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.7} />
      </mesh>
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
    </group>
  )
}

// ─── Monitor ─────────────────────────────────────────────────────────────────
function Monitor({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
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
function Keyboard() {
  const rbRef = useRef<RapierRigidBody>(null)
  return (
    <RigidBody ref={rbRef} colliders="cuboid" mass={0.6} restitution={0.1} friction={0.8}
      position={[0, 0.775, 0.25]}>
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
    <RigidBody ref={rbRef} colliders="hull" mass={0.4} restitution={0.2} friction={0.7} position={position}>
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
    <RigidBody ref={rbRef} colliders="cuboid" mass={0.5} restitution={0.05} friction={0.9} position={position}>
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

// ─── Desk ────────────────────────────────────────────────────────────────────
function Desk() {
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid" position={[0, 0.75, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.04, 0.9]} />
          <meshStandardMaterial color="#2e1f0f" roughness={0.7} metalness={0.05} />
        </mesh>
      </RigidBody>
      {([ [-1.72, 0], [1.72, 0], [-1.72, -0.84], [1.72, -0.84] ] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.365, z]}>
          <boxGeometry args={[0.06, 0.73, 0.06]} />
          <meshStandardMaterial color="#1a1005" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Camera controller: WASD / Q+E / MMB pan ─────────────────────────────────
function CameraController() {
  const { camera, gl } = useThree()
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

  return (
    <div className="scene-container" onClick={() => setHint(false)}>
      <Canvas
        shadows
        camera={{ position: [0, 1.8, 1.1], fov: 90, near: 0.01, far: 100 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.15} />
        <directionalLight castShadow position={[2, 4, 2]} intensity={0.6} shadow-mapSize={[2048, 2048]} />
        <pointLight position={[0, 3.5, -1]} intensity={1.2} color="#ffe4cc" distance={6} decay={2} />

        <RgbLight />
        <CameraController />

        <Physics gravity={[0, -9.81, 0]}>
          <Room />
          <Desk />

          <Monitor position={[-1.1, 1.12, -0.62]} rotation={[0, 0.38, 0]} />
          <Monitor position={[0,    1.12, -0.68]} />
          <Monitor position={[1.1,  1.12, -0.62]} rotation={[0, -0.38, 0]} />

          <PcTower />

          <Keyboard />
          <Mug position={[-1.4, 0.82, -0.15]} />
          <Book position={[1.3, 0.78, -0.2]} color="#41521F" />
          <Book position={[1.3, 0.80, -0.2]} color="#BA1B1D" />
          <Book position={[1.3, 0.82, -0.2]} color="#6320EE" />

          <GrabController />
        </Physics>
      </Canvas>

      {hint && (
        <div className="scene-hint">LMB = greifen · WASD = bewegen · Q/E = hoch/runter · MMB = pan</div>
      )}
    </div>
  )
}

export default Scene
