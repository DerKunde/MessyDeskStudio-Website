import { useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { grab } from './grab'
import { respawnRegistry } from './respawnRegistry'

interface RespawnOptions {
  delay?: number     // ms, default 0
  onRespawn?: () => void
}

function useRespawn(
  rbRef: RefObject<RapierRigidBody | null>,
  spawnPosition: [number, number, number],
  options: RespawnOptions = {}
) {
  const spawnRef     = useRef(spawnPosition)
  const delayRef     = useRef(options.delay ?? 0)
  const onRespawnRef = useRef(options.onRespawn)
  useLayoutEffect(() => { onRespawnRef.current = options.onRespawn })

  useEffect(() => {
    const body = rbRef.current
    if (!body) return

    const respawn = () => {
      if (grab.body === body) return

      const [x, y, z] = spawnRef.current

      const doRespawn = () => {
        const b = rbRef.current
        if (!b) return
        b.setBodyType(2, true)
        b.setTranslation({ x, y, z }, true)
        b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        b.setLinvel({ x: 0, y: 0, z: 0 }, true)
        b.setAngvel({ x: 0, y: 0, z: 0 }, true)
        b.setBodyType(0, true)
        onRespawnRef.current?.()
      }

      if (delayRef.current > 0) { setTimeout(doRespawn, delayRef.current) }
      else { doRespawn() }
    }

    respawnRegistry.set(body, respawn)
    return () => { respawnRegistry.delete(body) }
  }, [rbRef])
}

export default useRespawn
