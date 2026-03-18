import { RigidBody } from '@react-three/rapier'

export function Room() {
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid" rotation={[-Math.PI / 2, 0, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[12, 10]} />
          <meshStandardMaterial color="#1a1520" roughness={0.9} />
        </mesh>
      </RigidBody>
      <mesh receiveShadow position={[0, 2, -2.2]}>
        <boxGeometry args={[12, 4, 0.1]} />
        <meshStandardMaterial color="#161016" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[-3, 2, 0]}>
        <boxGeometry args={[0.1, 4, 10]} />
        <meshStandardMaterial color="#141014" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[4, 2, 0]}>
        <boxGeometry args={[0.1, 4, 10]} />
        <meshStandardMaterial color="#141014" roughness={0.95} />
      </mesh>
    </group>
  )
}
