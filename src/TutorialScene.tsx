import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { CameraController } from './scene/CameraController'
import { LIGHT_CONE_VERTEX_SHADER, LIGHT_CONE_FRAGMENT_SHADER } from './shaders/lightConeShader'
import { CRT_SCREEN_VERTEX_SHADER, CRT_SCREEN_FRAGMENT_SHADER } from './shaders/crtScreenShader'
import './TutorialScene.css'

const CRT_TV_URL = '/models/crt_tv/scene.gltf'
const CRT_TV_ROTATION_Y = Math.PI
const TABLE_TOP_Y = 0.8
const TV_SCREEN_MATERIAL_NAME = 'TVScreen'
const TUTORIAL_LOOK_AT = new THREE.Vector3(0, 0.4, 0)

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
    <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.4, 0.8, 0.8]} />
      <meshStandardMaterial color="#C8A165" roughness={0.85} dithering />
    </mesh>
  )
}

function CrtTv() {
  const { scene } = useGLTF(CRT_TV_URL)
  const groupRef = useRef<THREE.Group>(null)
  const testPattern = useMemo(() => createTestPatternTexture(), [])
  const screenMaterialRef = useRef<THREE.ShaderMaterial>(null)

  const screenUniforms = useMemo(() => ({
    uMap: { value: testPattern },
    uTime: { value: 0 },
  }), [testPattern])

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

  useEffect(() => {
    if (!groupRef.current) return
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(scene)
    groupRef.current.position.y = TABLE_TOP_Y - box.min.y
  }, [scene])

  return (
    <group ref={groupRef} rotation={[0, CRT_TV_ROTATION_Y, 0]}>
      <primitive object={scene} />
    </group>
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      <meshStandardMaterial color="#2a2a2a" dithering />
    </mesh>
  )
}

function Walls() {
  const half = ROOM_SIZE / 2
  const y = WALL_HEIGHT / 2
  return (
    <>
      <mesh position={[0, y, -half]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial color="#2a2a2a" dithering />
      </mesh>
      <mesh position={[0, y, half]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial color="#2a2a2a" dithering />
      </mesh>
      <mesh position={[-half, y, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial color="#2a2a2a" dithering />
      </mesh>
      <mesh position={[half, y, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial color="#2a2a2a" dithering />
      </mesh>
    </>
  )
}

function TutorialScene({ onExit }: { onExit: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  return (
    <div className="tutorial-scene-container">
      <Canvas
        shadows
        camera={{ position: [0, 2.2, 3], fov: 50 }}
      >
        <fog attach="fog" args={['#0a0a0a', 0.1, 8]} />
        <CameraController lookAt={TUTORIAL_LOOK_AT} />
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
        <TableBox />
        <CrtTv />
        <Floor />
        <Walls />
      </Canvas>
      <div className="tutorial-scene-hint">Drücke <b>F</b>, um zur Hauptszene zu wechseln</div>
    </div>
  )
}

export default TutorialScene
