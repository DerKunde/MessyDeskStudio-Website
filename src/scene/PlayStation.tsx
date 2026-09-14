import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { grab } from './grab'
import { cdRegistry, insertedDisc } from './cdRegistry'
import { useHoverCursor } from './useHoverCursor'
import { CD_THICKNESS } from './constants'
import { HOLO_VERTEX_SHADER, HOLO_FRAGMENT_SHADER } from '../shaders/holoShader'

const W   = 0.27
const H   = 0.06
const D   = 0.19
const TOP = H / 2

const LID_RADIUS     = 0.07
const LID_THICKNESS  = 0.004
const LID_X          = -0.025
const LID_Z          = -0.015
const LID_OPEN_ANGLE = 1.2   // ~70°
// The lid only approaches 0 asymptotically – below this it counts as closed (~0.5 s after closing)
const LID_CLOSED_EPSILON = 0.02
// Hinge at the top back edge – so the lid doesn't dip into the housing when opening
const HINGE_Y = TOP + LID_THICKNESS
const HINGE_Z = LID_Z - LID_RADIUS

const BODY_RADIUS  = 0.006
const TRAY_DEPTH   = 0.015
// Tray smaller than the lid – so the rounded hole edge stays hidden when the lid is closed
const TRAY_RADIUS  = LID_RADIUS - BODY_RADIUS - 0.002
const TRAY_FLOOR_Y = TOP - TRAY_DEPTH

// Inserted CD sits just above the tray floor so its underside doesn't z-fight with the floor
const CD_REST_Y     = TRAY_FLOOR_Y + CD_THICKNESS / 2 + 0.0005
// Max. horizontal distance CD center ↔ tray center on release – slightly beyond the holo cylinder
const SNAP_DISTANCE = TRAY_RADIUS + 0.02
const SNAP_HEIGHT   = 0.3    // max. height above the housing on release
const SNAP_DURATION = 0.25   // s

const HOLO_HEIGHT = 0.05     // from the tray floor

const BODY_COLOR      = '#BDBBB5'
const DETAIL_COLOR    = '#A3A19B'
const PORT_COLOR      = '#2a2a2a'

// Blue = CD grabbed, purple = CD would snap in on release
const HIGHLIGHT_IDLE_COLOR = new THREE.Color('#3AB0FF')
const HIGHLIGHT_SNAP_COLOR = new THREE.Color('#6320EE')
const HIGHLIGHT_FADE_RATE  = 20   // ~0.15 s crossfade

// Kinematic (position-driven) so the CD really sits in the tray – the housing collider is a solid box
const BODY_TYPE_DYNAMIC   = 0
const BODY_TYPE_KINEMATIC = 2

type SnapAnimation = {
  body: RapierRigidBody
  fromPos: THREE.Vector3
  fromRot: THREE.Quaternion
  t: number
}

const _local     = new THREE.Vector3()
const _targetPos = new THREE.Vector3()
const _targetRot = new THREE.Quaternion()
const _pos       = new THREE.Vector3()
const _rot       = new THREE.Quaternion()

// Highlight meshes ignore raycasts – three.js doesn't check visibility, so the invisible
// holo cylinder above the tray would otherwise catch hover (space) and clicks
const noRaycast = () => null

// Housing built like drei's RoundedBox (tiny corner arcs + bevel = rounded edges),
// but with a round hole for the CD tray. Extruded in the XY plane, then stood up: shape y becomes world −z
function createBodyGeometry() {
  const eps = 0.00001
  const hx  = W / 2 - BODY_RADIUS
  const hz  = D / 2 - BODY_RADIUS

  const shape = new THREE.Shape()
  shape.absarc( hx, -hz, eps, -Math.PI / 2, 0)
  shape.absarc( hx,  hz, eps, 0, Math.PI / 2)
  shape.absarc(-hx,  hz, eps, Math.PI / 2, Math.PI)
  shape.absarc(-hx, -hz, eps, Math.PI, Math.PI * 1.5)

  // Hole as a polygon instead of absarc – curveSegments would otherwise also apply to the corner arcs.
  // The bevel narrows the hole by BODY_RADIUS, so it's made larger here
  const holeRadius = TRAY_RADIUS + BODY_RADIUS
  const hole = new THREE.Path().setFromPoints(Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2
    return new THREE.Vector2(LID_X + Math.cos(a) * holeRadius, -LID_Z + Math.sin(a) * holeRadius)
  }))
  shape.holes.push(hole)

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: H - BODY_RADIUS * 2,
    bevelEnabled: true,
    bevelThickness: BODY_RADIUS,
    bevelSize: BODY_RADIUS - eps,
    bevelSegments: 8,
    curveSegments: 4,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.center()
  return toCreasedNormals(geometry, 0.4)
}

// Is the body (horizontally) over the tray? Computed in the PlayStation's local space so its rotation doesn't matter
function isOverTray(group: THREE.Group, body: RapierRigidBody) {
  const p     = body.translation()
  const local = group.worldToLocal(_local.set(p.x, p.y, p.z))
  return Math.hypot(local.x - LID_X, local.z - LID_Z) <= SNAP_DISTANCE && local.y <= TOP + SNAP_HEIGHT
}

export function PlayStation({ position, rotation }: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  const groupRef     = useRef<THREE.Group>(null)
  const lidRef       = useRef<THREE.Group>(null)
  const lidAngle     = useRef(0)
  const lidOpen      = useRef(false)
  const hovered      = useRef(false)
  const snapped      = useRef<RapierRigidBody | null>(null)
  const snapAnim     = useRef<SnapAnimation | null>(null)
  const highlightRef = useRef<THREE.Group>(null)
  const highlightMat = useRef<THREE.MeshBasicMaterial>(null)
  const holoMat      = useRef<THREE.ShaderMaterial>(null)
  const snapBlend    = useRef(0)
  const interactCursor = useHoverCursor('interact')
  const bodyGeometry   = useMemo(() => createBodyGeometry(), [])

  const holoUniforms = useMemo(() => ({
    uTime:      { value: 0 },
    uPhase:     { value: 0 },
    uIntensity: { value: 1 },
    uColor:     { value: HIGHLIGHT_IDLE_COLOR.clone() },
  }), [])

  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry])

  // Space toggles the lid like the binder – the PlayStation can't be grabbed, so hovering counts instead of holding
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !hovered.current) return
      e.preventDefault()
      if (!e.repeat) lidOpen.current = !lidOpen.current
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Insert the CD on release over the open tray, take it out on grab
  useEffect(() => {
    const offStart = grab.onStart((body) => {
      if (body !== snapped.current) return
      body.setBodyType(BODY_TYPE_DYNAMIC, true)
      snapped.current  = null
      snapAnim.current = null
    })
    const offRelease = grab.onRelease((body) => {
      const group = groupRef.current
      if (!group || !lidOpen.current || snapped.current || !cdRegistry.has(body)) return
      if (!isOverTray(group, body)) return
      const p = body.translation()
      const r = body.rotation()
      body.setBodyType(BODY_TYPE_KINEMATIC, true)
      snapped.current  = body
      snapAnim.current = {
        body,
        fromPos: new THREE.Vector3(p.x, p.y, p.z),
        fromRot: new THREE.Quaternion(r.x, r.y, r.z, r.w),
        t: 0,
      }
    })
    // insertedDisc is global – don't leave an inserted CD behind on scene change
    return () => { offStart(); offRelease(); insertedDisc.current = null }
  }, [])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    if (lidRef.current) {
      const target = lidOpen.current ? -LID_OPEN_ANGLE : 0
      lidAngle.current += (target - lidAngle.current) * (1 - Math.exp(-delta * 8))
      lidRef.current.rotation.x = lidAngle.current
    }

    // The TV only detects the CD once the lid has fully closed – not already on key press
    const lidClosed = !lidOpen.current && Math.abs(lidAngle.current) < LID_CLOSED_EPSILON
    insertedDisc.current = lidClosed && snapped.current ? cdRegistry.get(snapped.current) ?? null : null

    // Snap animation: from the release position flat onto the tray floor, matching the PlayStation's rotation
    const anim = snapAnim.current
    if (anim) {
      anim.t = Math.min(1, anim.t + delta / SNAP_DURATION)
      const k = anim.t * anim.t * (3 - 2 * anim.t)
      group.localToWorld(_targetPos.set(LID_X, CD_REST_Y, LID_Z))
      group.getWorldQuaternion(_targetRot)
      anim.body.setNextKinematicTranslation(_pos.lerpVectors(anim.fromPos, _targetPos, k))
      anim.body.setNextKinematicRotation(_rot.slerpQuaternions(anim.fromRot, _targetRot, k))
      if (anim.t >= 1) snapAnim.current = null
    }

    // Highlight: lid open + CD grabbed + tray empty – brighter once the CD would snap in on release
    const highlight = highlightRef.current
    const material  = highlightMat.current
    const holo      = holoMat.current
    if (!highlight || !material || !holo) return
    const held   = grab.body
    const active = held !== null && lidOpen.current && !snapped.current && cdRegistry.has(held)
    highlight.visible = active
    if (!active) {
      snapBlend.current = 0   // next highlight starts blue again
      return
    }

    // 0 = blue (grabbed), 1 = purple (would snap in) – blended smoothly so it doesn't flicker at the zone boundary
    const target = isOverTray(group, held) ? 1 : 0
    snapBlend.current += (target - snapBlend.current) * (1 - Math.exp(-delta * HIGHLIGHT_FADE_RATE))
    const b     = snapBlend.current
    const pulse = Math.sin(state.clock.elapsedTime * 4)

    material.color.lerpColors(HIGHLIGHT_IDLE_COLOR, HIGHLIGHT_SNAP_COLOR, b)
    material.opacity = THREE.MathUtils.lerp(0.3 + 0.15 * pulse, 0.9, b)
    holo.uniforms.uColor.value.lerpColors(HIGHLIGHT_IDLE_COLOR, HIGHLIGHT_SNAP_COLOR, b)
    holo.uniforms.uIntensity.value = THREE.MathUtils.lerp(0.9 + 0.3 * pulse, 1.8, b)
    holo.uniforms.uPhase.value    += delta * THREE.MathUtils.lerp(0.8, 2, b)
    holo.uniforms.uTime.value     += delta
  })

  return (
    <RigidBody type="fixed" colliders={false} friction={0.8} position={position} rotation={rotation}>
      <CuboidCollider args={[W / 2, H / 2, D / 2]} />
      {/* Hover on the group so the whole object incl. lid/buttons counts as interactive.
          pointerdown is swallowed – otherwise an inserted CD could be grabbed through the closed lid */}
      <group
        ref={groupRef}
        onPointerOver={(e) => {
          interactCursor.onPointerOver(e)
          hovered.current = true
        }}
        onPointerOut={() => {
          interactCursor.onPointerOut()
          hovered.current = false
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Housing with the hole for the CD tray */}
        <mesh geometry={bodyGeometry} castShadow receiveShadow>
          <meshStandardMaterial color={BODY_COLOR} roughness={0.7} dithering />
        </mesh>

        {/* Tray floor – the hole goes through the whole housing, this cylinder fills it up to tray depth.
            Slightly wider than the hole so no gap shows at the wall */}
        <mesh position={[LID_X, (-H / 2 + TRAY_FLOOR_Y) / 2, LID_Z]} receiveShadow>
          <cylinderGeometry args={[TRAY_RADIUS + 0.0005, TRAY_RADIUS + 0.0005, TRAY_FLOOR_Y + H / 2, 48]} />
          <meshStandardMaterial color={BODY_COLOR} roughness={0.7} dithering />
        </mesh>

        {/* Highlight: ring on the tray floor + holo cylinder above – visibility and strength are driven by useFrame */}
        <group ref={highlightRef} position={[LID_X, TRAY_FLOOR_Y, LID_Z]} visible={false}>
          <mesh position={[0, 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
            <ringGeometry args={[0.012, TRAY_RADIUS, 48]} />
            <meshBasicMaterial
              ref={highlightMat}
              color={HIGHLIGHT_IDLE_COLOR}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, HOLO_HEIGHT / 2, 0]} raycast={noRaycast}>
            <cylinderGeometry args={[TRAY_RADIUS, TRAY_RADIUS, HOLO_HEIGHT, 48, 1, true]} />
            <shaderMaterial
              ref={holoMat}
              vertexShader={HOLO_VERTEX_SHADER}
              fragmentShader={HOLO_FRAGMENT_SHADER}
              uniforms={holoUniforms}
              transparent
              dithering
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>

        {/* Spindle */}
        <mesh position={[LID_X, TRAY_FLOOR_Y + 0.0015, LID_Z]}>
          <cylinderGeometry args={[0.007, 0.007, 0.003, 24]} />
          <meshStandardMaterial color={DETAIL_COLOR} roughness={0.6} dithering />
        </mesh>

        {/* Disc lid */}
        <group ref={lidRef} position={[LID_X, HINGE_Y, HINGE_Z]}>
          <mesh position={[0, -LID_THICKNESS / 2, LID_RADIUS]} castShadow receiveShadow>
            <cylinderGeometry args={[LID_RADIUS, LID_RADIUS, LID_THICKNESS, 48]} />
            <meshStandardMaterial color={DETAIL_COLOR} roughness={0.65} dithering />
          </mesh>
        </group>

        {/* Open button */}
        <mesh position={[0.085, TOP + 0.002, -0.03]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.004, 32]} />
          <meshStandardMaterial color={DETAIL_COLOR} roughness={0.6} dithering />
        </mesh>

        {/* Reset and power buttons */}
        {[0.065, 0.105].map((x) => (
          <mesh key={x} position={[x, TOP + 0.0015, 0.055]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.003, 24]} />
            <meshStandardMaterial color={DETAIL_COLOR} roughness={0.6} dithering />
          </mesh>
        ))}

        {/* Power LED */}
        <mesh position={[0.105, TOP + 0.001, 0.075]}>
          <boxGeometry args={[0.006, 0.002, 0.004]} />
          <meshStandardMaterial color="#39ff14" emissive="#39ff14" emissiveIntensity={2} />
        </mesh>

        {/* Controller ports + memory card slots (front) */}
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
