import { useRef } from 'react'
import { RigidBody, CylinderCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { useHoverCursor } from './useHoverCursor'
import { RESPAWN_DELAY } from './constants'

const RADIUS      = 0.06
const HOLE_RADIUS = 0.0075
const LABEL_INNER = 0.02
const THICKNESS   = 0.003
// Collider etwas dicker als die sichtbare Scheibe – sehr dünne Collider zittern oder rutschen durch den Tisch
const COLLIDER_HALF_HEIGHT = THICKNESS / 2 + 0.001

function ringShape(outer: number, inner: number) {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

// Extrusion entlang z → nach dem Drehen liegt die Scheibe flach, Oberseite zeigt nach +y
const DISC_GEOMETRY = new THREE.ExtrudeGeometry(ringShape(RADIUS, HOLE_RADIUS), {
  depth: THICKNESS,
  bevelEnabled: false,
  curveSegments: 48,
})
  .translate(0, 0, -THICKNESS / 2)
  .rotateX(-Math.PI / 2)

const LABEL_GEOMETRY = new THREE.ShapeGeometry(ringShape(RADIUS - 0.001, LABEL_INNER), 48)
  .rotateX(-Math.PI / 2)

export function CdDisc({ position, color }: {
  position: [number, number, number]
  color: string
}) {
  const rbRef = useRef<RapierRigidBody>(null)
  useRespawn(rbRef, position, { delay: RESPAWN_DELAY })
  const grabCursor = useHoverCursor('grab')

  return (
    <RigidBody
      ref={rbRef}
      colliders={false}
      restitution={0.1}
      friction={0.6}
      ccd
      // Kontakte schon vor dem Aufprall suchen – sonst steckt die dünne Scheibe beim Fallen/Greifen kurz im Tisch
      softCcdPrediction={0.1}
      position={position}
    >
      <CylinderCollider args={[COLLIDER_HALF_HEIGHT, RADIUS]} mass={0.02} />
      <group
        {...grabCursor}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation()
          grab.start(rbRef.current, e.distance)
        }}
      >
        {/* Scheibe – schwarze Datenseite wie bei PS1-Discs */}
        <mesh geometry={DISC_GEOMETRY} castShadow receiveShadow>
          <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.8} dithering />
        </mesh>
        {/* Label auf der Oberseite */}
        <mesh geometry={LABEL_GEOMETRY} position={[0, THICKNESS / 2 + 0.0002, 0]} receiveShadow>
          <meshStandardMaterial color={color} roughness={0.6} dithering />
        </mesh>
      </group>
    </RigidBody>
  )
}
