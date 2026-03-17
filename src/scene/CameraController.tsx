import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export function CameraController() {
  const { camera } = useThree()

  useEffect(() => { camera.lookAt(0, 1, -1) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'p') return
      const p = camera.position
      console.log(`camera position: [${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [camera])

  return null
}
