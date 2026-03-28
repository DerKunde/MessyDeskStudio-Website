import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import * as ReactDOMClient from 'react-dom/client'
import * as THREE from 'three'

// ─── Renderer-Setup ──────────────────────────────────────────────────────────

const CSS3DContext = createContext<CSS3DRenderer | null>(null)

export function Html3DRenderer({ children }: { children: ReactNode }) {
  const { gl, scene, camera, size } = useThree()
  const renderer = useMemo(() => new CSS3DRenderer(), [])

  useLayoutEffect(() => {
    const dom = renderer.domElement
    dom.style.position = 'absolute'
    dom.style.top = '0'
    dom.style.left = '0'
    dom.style.pointerEvents = 'none'
    dom.style.zIndex = '5'

    // WebGL-Canvas über CSS3D-Layer legen — pointer-events bleibt 'auto' (Grab-Mechanik)
    gl.domElement.style.position = 'absolute'
    gl.domElement.style.top = '0'
    gl.domElement.style.left = '0'
    gl.domElement.style.zIndex = '10'

    gl.domElement.parentElement?.appendChild(dom)
    return () => {
      gl.domElement.parentElement?.removeChild(dom)
      gl.domElement.style.position = ''
      gl.domElement.style.zIndex = ''
    }
  }, [renderer, gl])

  useLayoutEffect(() => {
    renderer.setSize(size.width, size.height)
  }, [renderer, size.width, size.height])

  // CSS3D nach WebGL rendern (useFrame mit priority 1 läuft nach dem Standard-Render)
  useFrame(() => {
    renderer.render(scene, camera)
  }, 1)

  return <CSS3DContext.Provider value={renderer}>{children}</CSS3DContext.Provider>
}

// ─── Html3D-Komponente ────────────────────────────────────────────────────────

// 1 CSS-Pixel = SCALE World-Units → Div bei PAGE_W/SCALE × PAGE_H/SCALE px
const SCALE = 0.001

const OCCLUDER_VERT = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const OCCLUDER_FRAG = `
  void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  }
`

interface Html3DProps {
  children: ReactNode
  /** Breite in World-Units */
  width: number
  /** Höhe in World-Units */
  height: number
}

export function Html3D({ children, width, height }: Html3DProps) {
  // Einmaliger Container-Div — Größe entspricht den World-Unit-Dimensionen in Pixeln
  const [el] = useState<HTMLDivElement>(() => {
    const div = document.createElement('div')
    div.style.width  = `${Math.round(width  / SCALE)}px`
    div.style.height = `${Math.round(height / SCALE)}px`
    return div
  })

  const rootRef = useRef<ReactDOMClient.Root | null>(null)

  const css3DObject = useMemo(() => {
    const obj = new CSS3DObject(el)
    obj.scale.setScalar(SCALE)
    return obj
  }, [el])

  useLayoutEffect(() => {
    rootRef.current = ReactDOMClient.createRoot(el)
    rootRef.current.render(<>{children}</>)
    return () => {
      rootRef.current?.unmount()
      rootRef.current = null
    }
  }, [el])

  // Children aktualisieren wenn sie sich ändern
  useEffect(() => {
    rootRef.current?.render(<>{children}</>)
  }, [children])

  return (
    <>
      {/*
        Occluder-Mesh: transparenter Shader + NoBlending
        → stanzt ein Loch in den WebGL-Canvas (alpha=0) wo das HTML sichtbar sein soll.
        PlaneGeometry mit Frontface-Culling: von hinten kein Loch → Rückseite automatisch verdeckt.
        Andere 3D-Objekte rendern normal über das Loch via Depth-Test → echte Verdeckung.
      */}
      <mesh renderOrder={0}>
        <planeGeometry args={[width, height]} />
        <shaderMaterial
          blending={THREE.NoBlending}
          vertexShader={OCCLUDER_VERT}
          fragmentShader={OCCLUDER_FRAG}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* CSS3DObject wird vom CSS3DRenderer auf Layer z-index 5 gerendert */}
      <primitive object={css3DObject} />
    </>
  )
}

export function useHtml3DRenderer() {
  return useContext(CSS3DContext)
}
