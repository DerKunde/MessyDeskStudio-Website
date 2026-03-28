import { useRef } from 'react'
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

const COL_HX = (SPINE_W + 2 * PAGE_W) / 2
const COL_HY = PAGE_H / 2
const COL_HZ = (COVER_D + 0.002) / 2

export function Binder({ position }: { position: [number, number, number] }) {
  const rbRef = useRef<RapierRigidBody>(null)

  useRespawn(rbRef, position, { delay: RESPAWN_DELAY })

  const onGrab = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0) return
    e.stopPropagation()
    grab.start(rbRef.current, e.distance)
  }

  return (
    <RigidBody
      ref={rbRef}
      colliders={false}
      mass={0.3}
      restitution={0.05}
      friction={0.9}
      position={position}
    >
      <CuboidCollider args={[COL_HX, COL_HY, COL_HZ]} />

      {/* Linke Seite */}
      <mesh castShadow position={[-(SPINE_W / 2 + PAGE_W / 2), 0, 0]} onPointerDown={onGrab}>
        <boxGeometry args={[PAGE_W, PAGE_H, COVER_D]} />
        <meshStandardMaterial color="#1a1020" roughness={0.7} metalness={0.1} />
      </mesh>

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

      {/* HTML-Seite: Occluder + CSS3DObject, leicht vor der rechten Seite */}
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
    </RigidBody>
  )
}
