import { RigidBody } from '@react-three/rapier'
import { LoginScreenTexture } from './LoginScreenTexture'

interface MonitorProps {
  showLogin?: boolean
}

export function Monitor({ showLogin }: MonitorProps) {
  return (
    <RigidBody type="fixed" colliders="cuboid">
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.68, 0.40, 0.03]} />
        <meshStandardMaterial color="#111111" roughness={0.4} metalness={0.5} />
      </mesh>
      {showLogin ? (
        <LoginScreenTexture />
      ) : (
        <mesh position={[0, 0, 0.016]}>
          <boxGeometry args={[0.62, 0.35, 0.001]} />
          <meshStandardMaterial color="#1a2a3a" emissive="#1a3a5a" emissiveIntensity={0.8} />
        </mesh>
      )}
      <mesh castShadow position={[0, -0.3, 0.04]}>
        <boxGeometry args={[0.04, 0.2, 0.04]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, -0.42, 0.06]}>
        <boxGeometry args={[0.22, 0.025, 0.14]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
    </RigidBody>
  )
}
