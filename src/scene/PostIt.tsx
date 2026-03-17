import { Text } from '@react-three/drei'

export function PostIt({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0.12]}>
      {/* Post-it Zettel */}
      <mesh>
        <planeGeometry args={[0.09, 0.07]} />
        <meshStandardMaterial color="#FFE84D" roughness={0.9} />
      </mesh>

      {/* Handschrift */}
      <Text
        position={[0, 0, 0.001]}
        fontSize={0.018}
        color="#2a2015"
        font="/Caveat.ttf"
        anchorX="center"
        anchorY="middle"
        rotation={[0, 0, -0.1]}
      >
        pcw123
      </Text>
    </group>
  )
}
