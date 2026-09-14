import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LIGHT_CONE_VERTEX_SHADER, LIGHT_CONE_FRAGMENT_SHADER } from './shaders/lightConeShader'
import './TutorialScene.css'

function TableBox() {
  return (
    <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.4, 0.8, 0.8]} />
      <meshStandardMaterial color="#C8A165" roughness={0.85} dithering />
    </mesh>
  )
}

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
        onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
      >
        <fog attach="fog" args={['#0a0a0a', 0.1, 8]} />
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
        <Floor />
        <Walls />
      </Canvas>
      <div className="tutorial-scene-hint">Drücke <b>F</b>, um zur Hauptszene zu wechseln</div>
    </div>
  )
}

export default TutorialScene
