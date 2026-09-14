import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useInputMode } from './hooks/useInputMode'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics, CuboidCollider, RigidBody } from '@react-three/rapier'
import { EffectComposer, SMAA, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import './MessyDeskScene.css'

import { RESPAWN_FALL_Y } from './scene/constants'
import { respawnRegistry } from './scene/respawnRegistry'
import { EditorCtx, Editable, TransformGizmo } from './scene/EditorContext'
import { CameraController } from './scene/CameraController'
import { GrabController } from './scene/GrabController'
import { Room } from './scene/Room'
import { Desk } from './scene/Desk'
import { Monitor } from './scene/Monitor'
import { PcTower } from './scene/PcTower'
import { Keyboard } from './scene/Keyboard'
import { Mug } from './scene/Mug'
import { Book } from './scene/Book'
import { Ashtray } from './scene/Ashtray'
import { NeonSign } from './scene/NeonSign'
import { Bottle } from './scene/Bottle'
import { Binder } from './scene/Binder'
import { Html3DRenderer } from './scene/Html3D'
import { CursorHint } from './scene/CursorHint'

// Only on local dev and the dev deployment – checks VITE_ENV because the dev deployment is a production build too
const EDITOR_ENABLED = import.meta.env.VITE_ENV === 'development'

const WARMUP_SMOOTH_FRAMES = 10     // consecutive smooth frames required before the scene counts as ready
const WARMUP_MAX_FRAME_S   = 0.034  // ~30 fps – slower frames count as stutter
const WARMUP_TIMEOUT_MS    = 5000   // weak devices never reach smooth frames – don't stay black forever

// Lives in the same Suspense boundary as the scene content, so it only mounts once nothing is loading anymore.
// Loaded doesn't mean smooth yet: shader compilation, texture uploads, the shadow map and the
// trimesh collider cost the first frames. So precompile shaders first, then wait for smooth frames
function SceneWarmup({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree()
  const compiled     = useRef(false)
  const smoothFrames = useRef(0)
  const done         = useRef(false)

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    onReady()
  }, [onReady])

  useEffect(() => {
    let cancelled = false
    gl.compileAsync(scene, camera)
      .catch(console.error)   // compilation then happens on first render instead – waiting for smooth frames covers that
      .finally(() => { if (!cancelled) compiled.current = true })
    const timeout = setTimeout(finish, WARMUP_TIMEOUT_MS)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [gl, scene, camera, finish])

  useFrame((_, delta) => {
    if (!compiled.current || done.current) return
    smoothFrames.current = delta < WARMUP_MAX_FRAME_S ? smoothFrames.current + 1 : 0
    if (smoothFrames.current >= WARMUP_SMOOTH_FRAMES) finish()
  })

  return null
}

function MessyDeskScene() {
  const inputMode = useInputMode()
  const [hint, setHint] = useState(true)
  const [sceneReady, setSceneReady] = useState(false)
  // Physics only starts once the overlay is fully gone – otherwise objects fall unseen
  const [overlayHidden, setOverlayHidden] = useState(false)

  const handleReady = useCallback(() => setSceneReady(true), [])

  useEffect(() => {
    if (inputMode !== 'touch') return
    const hide = () => setHint(false)
    window.addEventListener('touchstart', hide, { once: true })
    return () => window.removeEventListener('touchstart', hide)
  }, [inputMode])

  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<THREE.Object3D | null>(null)
  const [gizmoMode, setGizmoMode] = useState<'translate' | 'rotate' | 'scale'>('translate')

  useEffect(() => {
    if (!EDITOR_ENABLED) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2')        setEditMode(v => { if (v) setSelected(null); return !v })
      if (e.key === 't' || e.key === 'T') setGizmoMode('translate')
      if (e.key === 'r' || e.key === 'R') setGizmoMode('rotate')
      if (e.key === 's' || e.key === 'S') setGizmoMode('scale')
      if (e.key === 'Escape')    setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <EditorCtx.Provider value={{ editMode, select: setSelected }}>
      <div className="messy-desk-scene-container">
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          camera={{ position: [0.050, 1.255, 0.404], fov: 90, near: 0.01, far: 100 }}
          gl={{ antialias: true, alpha: true }}
        >
          {/* Own Suspense boundary: without it r3f passes loading content up as Suspense.
              The boundary in App (lazy) would then hide the canvas – and r3f destroys the WebGL context in the process */}
          <Suspense fallback={null}>
          <SceneWarmup onReady={handleReady} />
          <Html3DRenderer>
          <CameraController />

          <ambientLight intensity={0.15} />
          <directionalLight castShadow position={[2, 4, 2]} intensity={0.6} shadow-mapSize={[2048, 2048]} />
          <pointLight position={[0, 3.5, -1]} intensity={1.2} color="#ffe4cc" distance={6} decay={2} />

          <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.1} intensity={2} mipmapBlur radius={0.3} />
          </EffectComposer>

          <Physics gravity={[0, -9.81, 0]} paused={!overlayHidden}>
            <Room />
            <Desk />

            <Editable label="monitor-left" position={[-0.566, 1.120, -0.503]} rotation={[0.000, 0.380, 0.000]} scale={[1.000, 0.741, 1.000]}>
              <Monitor />
            </Editable>
            <Editable label="monitor-center" position={[0.146, 1.120, -0.631]} scale={[1.204, 0.752, 1.000]}>
              <Monitor showLogin />
            </Editable>
            <Editable label="monitor-right" position={[0.672, 1.066, -0.546]} rotation={[0.000, -0.555, 0.000]} scale={[0.481, 1.287, 1.000]}>
              <Monitor />
            </Editable>

            <Editable label="pc-tower" position={[0.935, 0.992, -0.280]} scale={[1, 0.379, 1]}>
              <PcTower />
            </Editable>

            <Keyboard position={[0, 2, -0.15]}/>
            <Mug position={[-0.2, 2, -0.5]} />
            <Ashtray position={[-0.48, 2, -0.18]} />
            <Book position={[0.2, 2, -0.25]} color="#41521F" />
            <Book position={[-0.4, 2, -0.30]} color="#BA1B1D" />
            <Book position={[0.3, 2, -0.20]} color="#6320EE" />
            <Bottle position={[0.735, 2, -0.280]} scale={0.5}/>
            <Binder position={[-0.4, 2, -0.1]} />

            <NeonSign />
            <GrabController />

            {/* Respawn sensor: invisible floor that triggers a respawn when objects fall below it */}
            <RigidBody
              type="fixed"
              sensor
              position={[0, RESPAWN_FALL_Y, 0]}
              onIntersectionEnter={({ other }) => {
                if (!other.rigidBody) return
                respawnRegistry.get(other.rigidBody)?.()
              }}
            >
              <CuboidCollider args={[50, 0.1, 50]} />
            </RigidBody>
          </Physics>

          <TransformGizmo selected={selected} mode={gizmoMode} />
          </Html3DRenderer>
          </Suspense>
        </Canvas>

        {/* Covers the empty, transparent canvas until everything is ready – no progress bar of its own,
            the TV in the tutorial shows the loading progress */}
        {!overlayHidden && (
          <div
            className={`messy-desk-scene-loading${sceneReady ? ' messy-desk-scene-loading--done' : ''}`}
            onTransitionEnd={() => setOverlayHidden(true)}
          />
        )}

        {editMode && (
          <div className="messy-desk-scene-editor-bar">
            EDITOR · <b>[T]</b> Verschieben &nbsp;<b>[R]</b> Drehen &nbsp;<b>[S]</b> Skalieren &nbsp;<b>[F2]</b> Beenden &nbsp;<b>[ESC]</b> Abwählen
            &nbsp;— Koordinaten in der Konsole
          </div>
        )}
        {!editMode && hint && (
          <div className="messy-desk-scene-hint">
            {inputMode === 'touch'
              ? 'Tippen = greifen · 2 Finger (beim Greifen) = drehen & Abstand'
              : 'LMB = greifen · RMB (beim Greifen) = drehen · Scroll = Abstand'
            }
          </div>
        )}
        <CursorHint />
      </div>
    </EditorCtx.Provider>
  )
}

export default MessyDeskScene
