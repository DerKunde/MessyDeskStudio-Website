import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useInputMode } from './hooks/useInputMode'
import { CameraController, type CameraZoom } from './scene/CameraController'
import { GrabController } from './scene/GrabController'
import { grab } from './scene/grab'
import { RESPAWN_FALL_Y } from './scene/constants'
import { respawnRegistry } from './scene/respawnRegistry'
import { PlayStation } from './scene/PlayStation'
import { CdDisc } from './scene/CdDisc'
import { CursorHint } from './scene/CursorHint'
import { LIGHT_CONE_VERTEX_SHADER, LIGHT_CONE_FRAGMENT_SHADER } from './shaders/lightConeShader'
import { CRT_SCREEN_VERTEX_SHADER, CRT_SCREEN_FRAGMENT_SHADER } from './shaders/crtScreenShader'
import './TutorialScene.css'

const CRT_TV_URL = '/models/crt_tv/scene.gltf'
const CRT_TV_ROTATION_Y = Math.PI
const TABLE_TOP_Y = 0.8
const TV_SCREEN_MATERIAL_NAME = 'TVScreen'
const TUTORIAL_LOOK_AT = new THREE.Vector3(0, 0.4, 0)
// Nah am Tisch tiefer und mit Blick auf die Tischplatte statt steil nach unten
const TUTORIAL_ZOOM: CameraZoom = {
  near: new THREE.Vector3(0, 1.35, 1.1),
  nearLookAt: new THREE.Vector3(0, 0.75, 0),
}

function createTestPatternTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 192
  const ctx = canvas.getContext('2d')!
  const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']
  const barWidth = canvas.width / bars.length
  bars.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.fillRect(i * barWidth, 0, barWidth, canvas.height)
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function TableBox() {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={[0, 0.4, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.8, 0.8]} />
        <meshStandardMaterial color="#C8A165" roughness={0.85} dithering />
      </mesh>
    </RigidBody>
  )
}

function CrtTv() {
  const { scene } = useGLTF(CRT_TV_URL)
  const testPattern = useMemo(() => createTestPatternTexture(), [])
  const screenMaterialRef = useRef<THREE.ShaderMaterial>(null)

  const screenUniforms = useMemo(() => ({
    uMap: { value: testPattern },
    uTime: { value: 0 },
  }), [testPattern])

  // Bounding-Box im Modell-Space – vor dem Mount berechnet, damit der feste Collider
  // direkt an der richtigen Stelle entsteht (Unterkante auf der Tischplatte)
  const bounds = useMemo(() => {
    scene.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(scene)
    if (scene.parent) box.applyMatrix4(scene.parent.matrixWorld.clone().invert())
    return {
      center: box.getCenter(new THREE.Vector3()),
      halfSize: box.getSize(new THREE.Vector3()).multiplyScalar(0.5),
      minY: box.min.y,
    }
  }, [scene])

  useFrame((_, delta) => {
    if (screenMaterialRef.current) screenMaterialRef.current.uniforms.uTime.value += delta
  })

  useEffect(() => {
    const crtMaterial = new THREE.ShaderMaterial({
      uniforms: screenUniforms,
      vertexShader: CRT_SCREEN_VERTEX_SHADER,
      fragmentShader: CRT_SCREEN_FRAGMENT_SHADER,
    })
    screenMaterialRef.current = crtMaterial

    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const matchIndex = materials.findIndex((mat) => mat.name === TV_SCREEN_MATERIAL_NAME)
      if (matchIndex === -1) return

      if (Array.isArray(mesh.material)) {
        mesh.material[matchIndex] = crtMaterial
      } else {
        mesh.material = crtMaterial
      }
    })

    return () => crtMaterial.dispose()
  }, [scene, screenUniforms])

  useEffect(() => () => testPattern.dispose(), [testPattern])

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[0, TABLE_TOP_Y - bounds.minY, 0]}
      rotation={[0, CRT_TV_ROTATION_Y, 0]}
    >
      <primitive object={scene} />
      <CuboidCollider
        args={[bounds.halfSize.x, bounds.halfSize.y, bounds.halfSize.z]}
        position={[bounds.center.x, bounds.center.y, bounds.center.z]}
      />
    </RigidBody>
  )
}

useGLTF.preload(CRT_TV_URL)

const SPOT_HEIGHT = 4
const SPOT_ANGLE = 0.4

function LightCone() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const height = SPOT_HEIGHT - 0.4
  const radius = height * Math.tan(SPOT_ANGLE)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#d6d5d3') },
    uOpacity: { value: 0.06 },
  }), [])

  useFrame((_, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta
  })

  return (
    <mesh position={[0, SPOT_HEIGHT - height / 2, 0]}>
      <coneGeometry args={[radius, height, 32, 1, true]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={LIGHT_CONE_VERTEX_SHADER}
        fragmentShader={LIGHT_CONE_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        dithering
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendEquation={THREE.AddEquation}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneFactor}
      />
    </mesh>
  )
}

const ROOM_SIZE = 6
const WALL_HEIGHT = 3

function Floor() {
  return (
    <RigidBody type="fixed" colliders="cuboid" rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color="#2a2a2a" dithering />
      </mesh>
    </RigidBody>
  )
}

function Walls() {
  const half = ROOM_SIZE / 2
  const y = WALL_HEIGHT / 2
  const walls: { position: [number, number, number]; rotationY: number }[] = [
    { position: [0, y, -half], rotationY: 0 },
    { position: [0, y, half], rotationY: Math.PI },
    { position: [-half, y, 0], rotationY: Math.PI / 2 },
    { position: [half, y, 0], rotationY: -Math.PI / 2 },
  ]
  return (
    <>
      {walls.map(({ position, rotationY }) => (
        <RigidBody key={rotationY} type="fixed" colliders="cuboid" position={position} rotation={[0, rotationY, 0]}>
          <mesh receiveShadow>
            <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
            <meshStandardMaterial color="#2a2a2a" dithering />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}

function TutorialScene({ onExit }: { onExit: () => void }) {
  const inputMode = useInputMode()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  // grab ist global – beim Szenenwechsel keine Referenz auf einen entfernten Körper zurücklassen
  useEffect(() => () => { grab.body = null }, [])

  return (
    <div className="tutorial-scene-container">
      <Canvas
        shadows
        camera={{ position: [0, 1.84, 2.4], fov: 50 }}
      >
        <fog attach="fog" args={['#0a0a0a', 0.1, 8]} />
        <CameraController lookAt={TUTORIAL_LOOK_AT} zoom={TUTORIAL_ZOOM} />
        <ambientLight intensity={0.2} />
        <spotLight
          position={[0, SPOT_HEIGHT, 0]}
          angle={SPOT_ANGLE}
          penumbra={0.5}
          intensity={30}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <LightCone />

        {/* 120 Hz statt 60 Hz – dünne CDs dringen beim Aufprall sonst sichtbar in den Tisch ein */}
        <Physics gravity={[0, -9.81, 0]} timeStep={1 / 120}>
          <TableBox />
          <CrtTv />
          <Floor />
          <Walls />

          <PlayStation position={[0.45, TABLE_TOP_Y + 0.03, 0.1]} rotation={[0, THREE.MathUtils.degToRad(-35), 0]} />
          <CdDisc position={[-0.45, TABLE_TOP_Y + 0.01, 0.15]} color="#6320EE" />
          <CdDisc position={[-0.41, TABLE_TOP_Y + 0.03, 0.18]} color="#41521F" />

          <GrabController />

          {/* Respawn-Sensor: unsichtbarer Boden, löst Respawn aus wenn Objekte darunter fallen */}
          <RigidBody
            type="fixed"
            sensor
            position={[0, RESPAWN_FALL_Y, 0]}
            onIntersectionEnter={({ other }) => {
              if (!other.rigidBody) return
              respawnRegistry.get(other.rigidBody)?.()
            }}
          >
            <CuboidCollider args={[50, 0.1, 50]} />
          </RigidBody>
        </Physics>
      </Canvas>
      <div className="tutorial-scene-hint">
        {inputMode === 'touch'
          ? 'Tippen = greifen · 2 Finger (beim Greifen) = drehen & Abstand'
          : <>LMB = greifen · RMB (beim Greifen) = drehen · Scroll = Zoom / Abstand (beim Greifen) ·<b>Leertaste</b> = interagieren · <b>F</b> = Hauptszene</>}
      </div>
      <CursorHint persistent />
    </div>
  )
}

export default TutorialScene
