import { useLayoutEffect, useMemo, useRef, useState, useEffect, type ReactNode } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import * as ReactDOMClient from 'react-dom/client'
import * as THREE from 'three'
import './Html3D.css'

// ─── Renderer setup ──────────────────────────────────────────────────────────

export function Html3DRenderer({ children }: { children: ReactNode }) {
  const { gl } = useThree()
  const renderer = useMemo(() => new CSS3DRenderer(), [])

  useLayoutEffect(() => {
    const dom = renderer.domElement
    dom.classList.add('html3d-layer')
    gl.domElement.classList.add('html3d-canvas')

    gl.domElement.parentElement?.appendChild(dom)
    return () => {
      gl.domElement.parentElement?.removeChild(dom)
      gl.domElement.classList.remove('html3d-canvas')
    }
  }, [renderer, gl])

  useFrame(({ scene: sc, camera: cam }) => {
    renderer.setSize(gl.domElement.clientWidth, gl.domElement.clientHeight)
    renderer.render(sc, cam)
  }, 1)

  return <>{children}</>
}

// ─── Html3D component ────────────────────────────────────────────────────────

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
  /** Width in world units */
  width: number
  /** Height in world units */
  height: number
}

// 1 CSS pixel = SCALE world units
// A div of width/SCALE × height/SCALE pixels → the CSS3DObject appears at the correct world size
// CSS3DRenderer uses the real camera matrix → geometrically correct on all screen sizes
const SCALE = 0.001

export function Html3D({ children, width, height }: Html3DProps) {
  const pxW = Math.round(width  / SCALE)
  const pxH = Math.round(height / SCALE)

  const [el] = useState<HTMLDivElement>(() => {
    const div = document.createElement('div')
    div.style.width  = `${pxW}px`
    div.style.height = `${pxH}px`
    return div
  })

  const rootRef     = useRef<ReactDOMClient.Root | null>(null)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el]) // children updates are handled by the useEffect below

  useEffect(() => {
    rootRef.current?.render(<>{children}</>)
  }, [children])

  return (
    <>
      {/*
        Occluder mesh: transparent shader + NoBlending
        → punches a hole into the WebGL canvas where the HTML should be visible.
        PlaneGeometry (FrontSide): no hole from behind → the back side is covered automatically.
        Other 3D objects render over the hole normally via the depth test → real occlusion.
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

      {/* Rendered by the CSS3DRenderer on the z-index 5 layer */}
      <primitive object={css3DObject} />
    </>
  )
}
