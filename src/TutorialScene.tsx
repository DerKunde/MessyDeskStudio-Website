import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import './TutorialScene.css'

function TableBox() {
  return (
    <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.4, 0.8, 0.8]} />
      <meshStandardMaterial color="#C8A165" />
    </mesh>
  )
}

const ROOM_SIZE = 6
const WALL_HEIGHT = 3

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      <meshStandardMaterial color="#2a2a2a" />
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
        <meshStandardMaterial color="#3d3d3d" />
      </mesh>
      <mesh position={[0, y, half]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial color="#3d3d3d" />
      </mesh>
      <mesh position={[-half, y, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial color="#3d3d3d" />
      </mesh>
      <mesh position={[half, y, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial color="#3d3d3d" />
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
        <ambientLight intensity={0.2} />
        <spotLight
          position={[0, 4, 0]}
          angle={0.4}
          penumbra={0.5}
          intensity={30}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <TableBox />
        <Floor />
        <Walls />
      </Canvas>
      <div className="tutorial-scene-hint">Drücke <b>F</b>, um zur Hauptszene zu wechseln</div>
    </div>
  )
}

export default TutorialScene
