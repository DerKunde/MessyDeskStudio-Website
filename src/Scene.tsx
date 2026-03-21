import { useState, useEffect } from 'react'
import { useInputMode } from './hooks/useInputMode'
import { Canvas } from '@react-three/fiber'
import { Physics, CuboidCollider, RigidBody } from '@react-three/rapier'
import { EffectComposer, SMAA, SelectiveBloom } from '@react-three/postprocessing'
import { Selection, Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import './Scene.css'

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

function Scene() {
  const inputMode = useInputMode()
  const [hint, setHint] = useState(true)

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
      <div className="scene-container">
        <Canvas
          shadows
          camera={{ position: [0.050, 1.255, 0.404], fov: 90, near: 0.01, far: 100 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.15} />
          <directionalLight castShadow position={[2, 4, 2]} intensity={0.6} shadow-mapSize={[2048, 2048]} />
          <pointLight position={[0, 3.5, -1]} intensity={1.2} color="#ffe4cc" distance={6} decay={2} />

          <CameraController />

          <Selection>
          <EffectComposer multisampling={0}>
            <SMAA />
            <SelectiveBloom luminanceThreshold={0.2} luminanceSmoothing={0.1} intensity={2} mipmapBlur radius={0.3} />
          </EffectComposer>

          <Physics gravity={[0, -9.81, 0]}>
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
            <Mug position={[0.2, 2, 0]} />
            <Ashtray position={[-0.48, 2, -0.18]} />
            <Book position={[0.2, 2, -0.25]} color="#41521F" />
            <Book position={[-0.4, 2, -0.30]} color="#BA1B1D" />
            <Book position={[0.3, 2, -0.20]} color="#6320EE" />

            <Select enabled><NeonSign /></Select>
            <GrabController />

            {/* Respawn-Sensor: unsichtbarer Boden, löst Respawn aus wenn Objekte darunter fallen */}
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
          </Selection>

          <TransformGizmo selected={selected} mode={gizmoMode} />
        </Canvas>

        {editMode && (
          <div className="scene-editor-bar">
            EDITOR · <b>[T]</b> Verschieben &nbsp;<b>[R]</b> Drehen &nbsp;<b>[S]</b> Skalieren &nbsp;<b>[F2]</b> Beenden &nbsp;<b>[ESC]</b> Abwählen
            &nbsp;— Koordinaten in der Konsole
          </div>
        )}
        {!editMode && hint && (
          <div className="scene-hint">
            {inputMode === 'touch'
              ? 'Tippen = greifen · 2 Finger (beim Greifen) = drehen & Abstand'
              : 'LMB = greifen · RMB (beim Greifen) = drehen · Scroll = Abstand · F2 = Editor'
            }
          </div>
        )}
      </div>
    </EditorCtx.Provider>
  )
}

export default Scene
