import { useEffect, useId, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { cursor } from './cursor'
import type { HoverCursor } from './cursor'

// Liefert onPointerOver/onPointerOut zum Spreaden auf das Mesh bzw. die Gruppe.
// stopPropagation: nur das vorderste Objekt bestimmt den Cursor, nicht was dahinter liegt
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
