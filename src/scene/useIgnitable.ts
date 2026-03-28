import { useState, useEffect, useCallback, useRef } from 'react'
import type { RefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { burningBodies, ignitableRegistry } from './fireRegistry'

const IGNITE_THRESHOLD = 4 // Sekunden Kontakt bis Feuer fängt

export function useIgnitable(rbRef: RefObject<RapierRigidBody | null>, defaultBurning = false) {
  const [burning, setBurning] = useState(defaultBurning)

  const burningContacts = useRef(new Set<RapierRigidBody>())
  const contactTime = useRef(0)

  useEffect(() => {
    const rb = rbRef.current
    if (!rb) return
    ignitableRegistry.set(rb, () => setBurning(true))
    return () => { ignitableRegistry.delete(rb) }
  }, [rbRef])

  useEffect(() => {
    if (!burning) return
    const rb = rbRef.current
    if (!rb) return
    burningBodies.add(rb)
    return () => { burningBodies.delete(rb) }
  }, [burning, rbRef])

  useFrame((_, delta) => {
    if (burning) return
    if (burningContacts.current.size === 0) {
      contactTime.current = 0
      return
    }
    contactTime.current += delta
    if (contactTime.current >= IGNITE_THRESHOLD) setBurning(true)
  })

  const onCollisionEnter = useCallback(({ other }: { other: { rigidBody?: RapierRigidBody } }) => {
    if (!other.rigidBody) return
    if (burningBodies.has(other.rigidBody)) burningContacts.current.add(other.rigidBody)
  }, [])

  const onCollisionExit = useCallback(({ other }: { other: { rigidBody?: RapierRigidBody } }) => {
    if (!other.rigidBody) return
    burningContacts.current.delete(other.rigidBody)
  }, [])

  const reset = useCallback(() => {
    setBurning(false)
    burningContacts.current.clear()
    contactTime.current = 0
  }, [])

  return { burning, onCollisionEnter, onCollisionExit, reset }
}
