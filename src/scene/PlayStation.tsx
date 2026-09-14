import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { useHoverCursor } from './useHoverCursor'
import { RESPAWN_DELAY } from './constants'

const W   = 0.27   // Breite
const H   = 0.06   // Höhe
const D   = 0.19   // Tiefe
const TOP = H / 2

const LID_RADIUS     = 0.07
const LID_THICKNESS  = 0.004
const LID_X          = -0.025
const LID_Z          = -0.015
const LID_OPEN_ANGLE = 1.2   // ~70°
// Scharnier an der oberen Hinterkante – so taucht der Deckel beim Öffnen nicht ins Gehäuse ein
const HINGE_Y = TOP + LID_THICKNESS
const HINGE_Z = LID_Z - LID_RADIUS

const BODY_COLOR   = '#BDBBB5'
const DETAIL_COLOR = '#A3A19B'
const PORT_COLOR   = '#2a2a2a'

export function PlayStation({ position }: { position: [number, number, number] }) {
  const rbRef    = useRef<RapierRigidBody>(null)
  const lidRef   = useRef<THREE.Group>(null)
  const lidAngle = useRef(0)
  const [lidOpen, setLidOpen] = useState(false)
  useRespawn(rbRef, position, { delay: RESPAWN_DELAY, onRespawn: () => setLidOpen(false) })
  const grabCursor     = useHoverCursor('grab')
  const interactCursor = useHoverCursor('interact')

  useFrame((_, delta) => {
    if (!lidRef.current) return
    const target = lidOpen ? -LID_OPEN_ANGLE : 0
    lidAngle.current += (target - lidAngle.current) * (1 - Math.exp(-delta * 8))
    lidRef.current.rotation.x = lidAngle.current
  })

  return (
    <RigidBody
      ref={rbRef}
      colliders={false}
      restitution={0.05}
      friction={0.8}
      ccd
      position={position}
    >
      <CuboidCollider args={[W / 2, H / 2, D / 2]} mass={1.5} />
      {/* Handler auf der Gruppe, damit auch Klicks auf Deckel/Tasten greifen – außer Open-Taste */}
      <group
        {...grabCursor}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation()
          grab.start(rbRef.current, e.distance)
        }}
      >
        {/* Gehäuse */}
        <RoundedBox args={[W, H, D]} radius={0.006} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color={BODY_COLOR} roughness={0.7} dithering />
        </RoundedBox>

        {/* CD-Fach + Spindel – bei geschlossenem Deckel verdeckt */}
        <mesh position={[LID_X, TOP + 0.001, LID_Z]} receiveShadow>
          <cylinderGeometry args={[LID_RADIUS - 0.005, LID_RADIUS - 0.005, 0.001, 48]} />
          <meshStandardMaterial color={PORT_COLOR} roughness={0.9} dithering />
        </mesh>
        <mesh position={[LID_X, TOP + 0.002, LID_Z]}>
          <cylinderGeometry args={[0.007, 0.007, 0.003, 24]} />
          <meshStandardMaterial color={DETAIL_COLOR} roughness={0.6} dithering />
        </mesh>

        {/* Disc-Deckel */}
        <group ref={lidRef} position={[LID_X, HINGE_Y, HINGE_Z]}>
          <mesh position={[0, -LID_THICKNESS / 2, LID_RADIUS]} castShadow receiveShadow>
            <cylinderGeometry args={[LID_RADIUS, LID_RADIUS, LID_THICKNESS, 48]} />
            <meshStandardMaterial color={DETAIL_COLOR} roughness={0.65} dithering />
          </mesh>
        </group>

        {/* Open-Taste */}
        <mesh
          position={[0.085, TOP + 0.002, -0.03]}
          castShadow
          {...interactCursor}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.stopPropagation()
            setLidOpen((open) => !open)
          }}
        >
          <cylinderGeometry args={[0.018, 0.018, 0.004, 32]} />
          <meshStandardMaterial color={DETAIL_COLOR} roughness={0.6} dithering />
        </mesh>

        {/* Reset- und Power-Taste */}
        {[0.065, 0.105].map((x) => (
          <mesh key={x} position={[x, TOP + 0.0015, 0.055]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.003, 24]} />
            <meshStandardMaterial color={DETAIL_COLOR} roughness={0.6} dithering />
          </mesh>
        ))}

        {/* Power-LED */}
        <mesh position={[0.105, TOP + 0.001, 0.075]}>
          <boxGeometry args={[0.006, 0.002, 0.004]} />
          <meshStandardMaterial color="#39ff14" emissive="#39ff14" emissiveIntensity={2} />
        </mesh>

        {/* Controller-Ports + Memory-Card-Slots (Front) */}
        {[-0.055, 0.055].map((x) => (
          <group key={x} position={[x, 0, D / 2]}>
            <mesh position={[0, -0.008, 0]}>
              <boxGeometry args={[0.05, 0.016, 0.002]} />
              <meshStandardMaterial color={PORT_COLOR} roughness={0.9} dithering />
            </mesh>
            <mesh position={[0, 0.012, 0]}>
              <boxGeometry args={[0.04, 0.005, 0.002]} />
              <meshStandardMaterial color={PORT_COLOR} roughness={0.9} dithering />
            </mesh>
          </group>
        ))}
      </group>
    </RigidBody>
  )
}
