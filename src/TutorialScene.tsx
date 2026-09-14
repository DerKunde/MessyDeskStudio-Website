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
import { useTvScreen, tvScreenState } from './scene/useTvScreen'
import { LIGHT_CONE_VERTEX_SHADER, LIGHT_CONE_FRAGMENT_SHADER } from './shaders/lightConeShader'
import { CRT_SCREEN_VERTEX_SHADER, CRT_SCREEN_FRAGMENT_SHADER } from './shaders/crtScreenShader'
import './TutorialScene.css'

const CRT_TV_URL = '/models/crt_tv/scene.glb'
const CRT_TV_ROTATION_Y = Math.PI
const TABLE_TOP_Y = 0.8
const TV_SCREEN_MATERIAL_NAME = 'TVScreen'
const TUTORIAL_LOOK_AT = new THREE.Vector3(0, 0.4, 0)
// Close to the table: lower and looking at the tabletop instead of steeply down
const TUTORIAL_ZOOM: CameraZoom = {
  near: new THREE.Vector3(0, 1.35, 1.1),
  nearLookAt: new THREE.Vector3(0, 0.75, 0),
}

// Table, floor and walls use explicit colliders instead of colliders="cuboid": auto colliders are only
// created one render after mount, and a slow first frame would let the CDs fall through before they exist
const TABLE_W = 1.4
const TABLE_D = 0.8

function TableBox() {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, TABLE_TOP_Y / 2, 0]}>
      <CuboidCollider args={[TABLE_W / 2, TABLE_TOP_Y / 2, TABLE_D / 2]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[TABLE_W, TABLE_TOP_Y, TABLE_D]} />
        <meshStandardMaterial color="#C8A165" roughness={0.85} dithering />
      </mesh>
    </RigidBody>
  )
}

function CrtTv() {
  const { scene } = useGLTF(CRT_TV_URL)
  const screenTexture = useTvScreen()
  const screenMaterialRef = useRef<THREE.ShaderMaterial>(null)

  const screenUniforms = useMemo(() => ({
    uMap: { value: screenTexture },
    uTime: { value: 0 },
  }), [screenTexture])

  // Bounding box in model space – computed before mount so the fixed collider
  // is created in the right place right away (bottom edge on the tabletop)
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
// Floor and walls are planes – their colliders get thickness behind the visible surface (local −z)
const SURFACE_HALF_THICKNESS = 0.05

function Floor() {
  return (
    <RigidBody type="fixed" colliders={false} rotation={[-Math.PI / 2, 0, 0]}>
      <CuboidCollider
        args={[ROOM_SIZE / 2, ROOM_SIZE / 2, SURFACE_HALF_THICKNESS]}
        position={[0, 0, -SURFACE_HALF_THICKNESS]}
      />
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
        <RigidBody key={rotationY} type="fixed" colliders={false} position={position} rotation={[0, rotationY, 0]}>
          <CuboidCollider
            args={[ROOM_SIZE / 2, WALL_HEIGHT / 2, SURFACE_HALF_THICKNESS]}
            position={[0, 0, -SURFACE_HALF_THICKNESS]}
          />
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
      // Only once the TV shows "Press F to play" – CD inserted and main scene fully loaded
      if ((e.key === 'f' || e.key === 'F') && tvScreenState.readyToPlay) onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  // grab is global – don't leave a reference to a removed body behind on scene change
  useEffect(() => () => { grab.body = null }, [])

  return (
    <div className="tutorial-scene-container">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
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

        {/* 120 Hz instead of 60 Hz – otherwise thin CDs visibly sink into the table on impact */}
        <Physics gravity={[0, -9.81, 0]} timeStep={1 / 120}>
          <TableBox />
          <CrtTv />
          <Floor />
          <Walls />

          <PlayStation position={[0.45, TABLE_TOP_Y + 0.03, 0.1]} rotation={[0, THREE.MathUtils.degToRad(-35), 0]} />
          <CdDisc position={[-0.45, TABLE_TOP_Y + 0.01, 0.15]} color="#6320EE" name="PURPLE" screenColor="#9D6BFF" />
          <CdDisc position={[-0.41, TABLE_TOP_Y + 0.03, 0.18]} color="#41521F" name="GREEN" screenColor="#7CC43A" />

          <GrabController />

          {/* Respawn sensor: invisible floor that triggers a respawn when objects fall below it */}
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
          : <>LMB = greifen · RMB (beim Greifen) = drehen · Scroll = Zoom / Abstand (beim Greifen) ·<b>Leertaste</b> = interagieren · <b>F</b> = Hauptszene (sobald geladen)</>}
      </div>
      <CursorHint persistent />
    </div>
  )
}

export default TutorialScene
