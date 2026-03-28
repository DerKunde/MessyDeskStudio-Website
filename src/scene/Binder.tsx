import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import type { ThreeEvent } from '@react-three/fiber'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { RESPAWN_DELAY } from './constants'
import { Html3D } from './Html3D'
import './Binder.css'

const SPINE_W = 0.025
const PAGE_W  = 0.175
const PAGE_H  = 0.245
const COVER_D = 0.004

// Collider offen: beide Seiten aufgeklappt
const COL_HX_OPEN   = (SPINE_W + 2 * PAGE_W) / 2
const COL_HY        = PAGE_H / 2
const COL_HZ        = (COVER_D + 0.002) / 2

// Collider geschlossen: linker Deckel liegt über rechtem
// Binder spannt von x=-SPINE_W/2 bis x=SPINE_W/2+PAGE_W
const COL_HX_CLOSED = (SPINE_W + PAGE_W) / 2
const COL_X_CLOSED  = PAGE_W / 2

export function Binder({ position }: { position: [number, number, number] }) {
  const rbRef         = useRef<RapierRigidBody>(null)
  const [isOpen, setIsOpen] = useState(false)
  const leftCoverRef  = useRef<THREE.Group>(null)
  const angleRef      = useRef(Math.PI) // startet zugeklappt

  useRespawn(rbRef, position, { delay: RESPAWN_DELAY })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (grab.body !== rbRef.current) return
      e.preventDefault()
      setIsOpen(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const [colliderOpen, setColliderOpen] = useState(false)

  useFrame((_, delta) => {
    if (!leftCoverRef.current) return
    const target = isOpen ? 0 : Math.PI
    angleRef.current += (target - angleRef.current) * (1 - Math.exp(-delta * 8))
    leftCoverRef.current.rotation.y = angleRef.current

    // Collider erst wechseln wenn Animation fast abgeschlossen (< 5°)
    const remaining = Math.abs(angleRef.current - target)
    if (remaining < 0.087) {
      setColliderOpen(isOpen)
    }
  })

  const onGrab = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0) return
    e.stopPropagation()
    grab.start(rbRef.current, e.distance)
  }

  return (
    <RigidBody
      ref={rbRef}
      colliders={false}
      ccd={true}
      mass={0.3}
      restitution={0.05}
      friction={0.9}
      position={position}
    >
      <CuboidCollider
        args={colliderOpen ? [COL_HX_OPEN, COL_HY, COL_HZ] : [COL_HX_CLOSED, COL_HY, COL_HZ]}
        position={colliderOpen ? [0, 0, 0] : [COL_X_CLOSED, 0, 0]}
      />

      {/* Linke Seite – Scharnier am Rücken (pivot bei x = -SPINE_W/2) */}
      <group position={[-SPINE_W / 2, 0, 0]}>
        <group ref={leftCoverRef}>
          <mesh castShadow position={[-PAGE_W / 2, 0, 0]} onPointerDown={onGrab}>
            <boxGeometry args={[PAGE_W, PAGE_H, COVER_D]} />
            <meshStandardMaterial color="#1a1020" roughness={0.7} metalness={0.1} />
          </mesh>
        </group>
      </group>

      {/* Rücken */}
      <mesh castShadow position={[0, 0, 0]} onPointerDown={onGrab}>
        <boxGeometry args={[SPINE_W, PAGE_H, COVER_D + 0.002]} />
        <meshStandardMaterial color="#6320EE" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Rechte Seite */}
      <mesh castShadow position={[(SPINE_W / 2 + PAGE_W / 2), 0, 0]} onPointerDown={onGrab}>
        <boxGeometry args={[PAGE_W, PAGE_H, COVER_D]} />
        <meshStandardMaterial color="#1a1020" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* HTML-Seite: nur wenn geöffnet */}
      {isOpen && (
        <group position={[SPINE_W / 2 + PAGE_W / 2, 0, COVER_D / 2 + 0.001]}>
          <Html3D width={PAGE_W} height={PAGE_H}>
            <div className="binder-page">
              <h2 className="binder-page__title">Notizen</h2>
              <p className="binder-page__text">
                Hier könnte dein Inhalt stehen. Diese Seite ist echtes HTML/CSS
                innerhalb der 3D-Szene.
              </p>
              <ul className="binder-page__list">
                <li>Punkt 1</li>
                <li>Punkt 2</li>
                <li>Punkt 3</li>
              </ul>
            </div>
          </Html3D>
        </group>
      )}
    </RigidBody>
  )
}
