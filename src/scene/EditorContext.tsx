import { createContext, useContext, useRef } from 'react'
import type { ReactNode } from 'react'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'

export type EditorCtxType = { editMode: boolean; select: (obj: THREE.Object3D | null) => void }

export const EditorCtx = createContext<EditorCtxType>({ editMode: false, select: () => {} })

export function Editable({ label, position, rotation, scale, children }: {
  label: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  children: ReactNode
}) {
  const { editMode, select } = useContext(EditorCtx)
  const groupRef = useRef<THREE.Group>(null)
  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={editMode ? (e) => { e.stopPropagation(); select(groupRef.current); console.info(`[${label}] selected`) } : undefined}
    >
      {children}
    </group>
  )
}

export function TransformGizmo({ selected, mode }: { selected: THREE.Object3D | null; mode: 'translate' | 'rotate' | 'scale' }) {
  if (!selected) return null
  return (
    <TransformControls
      object={selected}
      mode={mode}
      onObjectChange={() => {
        if (!selected) return
        const p = selected.position
        const r = selected.rotation
        const s = selected.scale
        console.log(`position: [${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]  rotation: [${r.x.toFixed(3)}, ${r.y.toFixed(3)}, ${r.z.toFixed(3)}]  scale: [${s.x.toFixed(3)}, ${s.y.toFixed(3)}, ${s.z.toFixed(3)}]`)
      }}
    />
  )
}
