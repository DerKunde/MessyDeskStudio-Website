import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import './TutorialScene.css'

function SpinningBox() {
  const meshRef = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += delta * 0.4
    meshRef.current.rotation.y += delta * 0.6
  })
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#6320ee" />
    </mesh>
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
      <Canvas camera={{ position: [0, 1, 3], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 4, 2]} intensity={1} />
        <SpinningBox />
      </Canvas>
      <div className="tutorial-scene-hint">Drücke <b>F</b>, um zur Hauptszene zu wechseln</div>
    </div>
  )
}

export default TutorialScene
