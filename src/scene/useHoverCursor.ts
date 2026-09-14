import { useEffect, useId, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { cursor } from './cursor'
import type { HoverCursor } from './cursor'

// Returns onPointerOver/onPointerOut to spread onto a mesh or group.
// stopPropagation: only the frontmost object determines the cursor, not what's behind it
export function useHoverCursor(kind: HoverCursor) {
  const id = useId()

  useEffect(() => () => cursor.unhover(id), [id])

  return useMemo(() => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      cursor.hover(id, kind)
    },
    onPointerOut: () => cursor.unhover(id),
  }), [id, kind])
}
