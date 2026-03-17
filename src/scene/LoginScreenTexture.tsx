import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RenderTexture, Text, OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'

const W = 620
const H = 350

export function LoginScreenTexture() {
  const [password, setPassword] = useState('')
  const [active, setActive] = useState(false)
  const [blink, setBlink] = useState(true)
  const meshRef = useRef<THREE.Mesh>(null)
  const { gl, scene, camera } = useThree()

  const handleClick = useCallback((e: THREE.Event) => {
    e.stopPropagation()
    setActive(true)
  }, [])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        setPassword(p => p.slice(0, -1))
      } else if (e.key === 'Escape') {
        setActive(false)
      } else if (e.key.length === 1) {
        setPassword(p => p + e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onDown = () => setActive(false)
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  const dots = '•'.repeat(password.length)
  const cursor = active && blink ? '|' : ' '

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0.016]}
      onClick={handleClick}
      onPointerDown={e => e.stopPropagation()}
    >
      <boxGeometry args={[0.62, 0.35, 0.001]} />
      <meshStandardMaterial>
        <RenderTexture attach="map" width={W} height={H}>
          <OrthographicCamera
            makeDefault
            left={-W / 2}
            right={W / 2}
            top={H / 2}
            bottom={-H / 2}
            near={0.1}
            far={10}
            position={[0, 0, 1]}
          />
          <color attach="background" args={['#0a1218']} />

          {/* Title */}
          <Text
            position={[0, 90, 0]}
            fontSize={52}
            color="#BA1B1D"
            font={undefined}
            anchorX="center"
            anchorY="middle"
          >
            Prototyp
          </Text>

          {/* Subtitle */}
          <Text
            position={[0, 20, 0]}
            fontSize={18}
            color="#c8ccba"
            anchorX="center"
            anchorY="middle"
          >
            Passwort eingeben
          </Text>

          {/* Input box */}
          <mesh position={[0, -50, 0]}>
            <planeGeometry args={[300, 44]} />
            <meshBasicMaterial color={active ? '#1a2a1a' : '#111a11'} />
          </mesh>
          <mesh position={[0, -50, 0.01]}>
            <planeGeometry args={[298, 42]} />
            <meshBasicMaterial color="#0a1218" />
          </mesh>

          {/* Input border */}
          <lineSegments position={[0, -50, 0.02]}>
            <edgesGeometry args={[new THREE.BoxGeometry(300, 44, 0)]} />
            <lineBasicMaterial color={active ? '#BA1B1D' : '#3a4a3a'} />
          </lineSegments>

          {/* Password dots + cursor */}
          <Text
            position={[0, -50, 0.03]}
            fontSize={22}
            color="#e9edde"
            anchorX="center"
            anchorY="middle"
            maxWidth={280}
          >
            {dots + cursor}
          </Text>
        </RenderTexture>
      </meshStandardMaterial>
    </mesh>
  )
}
