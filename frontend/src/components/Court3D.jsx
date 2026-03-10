import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, PresentationControls, ContactShadows } from '@react-three/drei';

function PremiumScale(props) {
    const group = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        // A slow, authoritative rotation
        group.current.rotation.y = t * 0.1;
    });

    return (
        <group ref={group} {...props} dispose={null}>
            {/* Heavy Wood Base */}
            <mesh position={[0, -2.2, 0]}>
                <cylinderGeometry args={[1.8, 2.0, 0.4, 64]} />
                <meshStandardMaterial color="#3a2318" roughness={0.7} metalness={0.1} />
            </mesh>
            <mesh position={[0, -1.9, 0]}>
                <cylinderGeometry args={[1.4, 1.8, 0.3, 64]} />
                <meshStandardMaterial color="#503120" roughness={0.6} metalness={0.1} />
            </mesh>

            {/* Central Brass Pillar */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.4, 4.2, 32]} />
                <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.9} />
            </mesh>

            {/* Intricate Top Finial */}
            <mesh position={[0, 2.2, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color="#e6c15d" roughness={0.1} metalness={1} />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
                <cylinderGeometry args={[0.01, 0.1, 0.4, 16]} />
                <meshStandardMaterial color="#e6c15d" roughness={0.1} metalness={1} />
            </mesh>

            {/* Main Horizontal Beam */}
            <mesh position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.15, 0.15, 4.6, 32]} />
                <meshStandardMaterial color="#b8860b" roughness={0.3} metalness={0.8} />
            </mesh>

            {/* Center Pivot Joint */}
            <mesh position={[0, 1.8, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
                <meshStandardMaterial color="#8a6205" roughness={0.4} metalness={0.7} />
            </mesh>

            {/* Left Pan Assembly */}
            <group position={[-2.3, 1.8, 0]}>
                {/* Hanger Hook */}
                <mesh position={[0, -0.2, 0]}>
                    <torusGeometry args={[0.1, 0.03, 16, 32]} />
                    <meshStandardMaterial color="#b8860b" roughness={0.3} metalness={0.8} />
                </mesh>
                {/* Strings */}
                <mesh position={[-0.4, -1.5, 0]} rotation={[0, 0, -0.2]}>
                    <cylinderGeometry args={[0.01, 0.01, 2.7, 8]} />
                    <meshStandardMaterial color="#e6c15d" />
                </mesh>
                <mesh position={[0.4, -1.5, 0]} rotation={[0, 0, 0.2]}>
                    <cylinderGeometry args={[0.01, 0.01, 2.7, 8]} />
                    <meshStandardMaterial color="#e6c15d" />
                </mesh>
                <mesh position={[0, -1.5, 0.4]} rotation={[0.2, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 2.7, 8]} />
                    <meshStandardMaterial color="#e6c15d" />
                </mesh>
                <mesh position={[0, -1.5, -0.4]} rotation={[-0.2, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 2.7, 8]} />
                    <meshStandardMaterial color="#e6c15d" />
                </mesh>
                {/* Pan */}
                <mesh position={[0, -2.8, 0]}>
                    <sphereGeometry args={[0.8, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.9} side={2} />
                </mesh>
            </group>

            {/* Right Pan Assembly */}
            <group position={[2.3, 1.8, 0]}>
                {/* Hanger Hook */}
                <mesh position={[0, -0.2, 0]}>
                    <torusGeometry args={[0.1, 0.03, 16, 32]} />
                    <meshStandardMaterial color="#b8860b" roughness={0.3} metalness={0.8} />
                </mesh>
                {/* Strings */}
                <mesh position={[-0.4, -1.5, 0]} rotation={[0, 0, -0.2]}>
                    <cylinderGeometry args={[0.01, 0.01, 2.7, 8]} />
                    <meshStandardMaterial color="#e6c15d" />
                </mesh>
                <mesh position={[0.4, -1.5, 0]} rotation={[0, 0, 0.2]}>
                    <cylinderGeometry args={[0.01, 0.01, 2.7, 8]} />
                    <meshStandardMaterial color="#e6c15d" />
                </mesh>
                <mesh position={[0, -1.5, 0.4]} rotation={[0.2, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 2.7, 8]} />
                    <meshStandardMaterial color="#e6c15d" />
                </mesh>
                <mesh position={[0, -1.5, -0.4]} rotation={[-0.2, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 2.7, 8]} />
                    <meshStandardMaterial color="#e6c15d" />
                </mesh>
                {/* Pan */}
                <mesh position={[0, -2.8, 0]}>
                    <sphereGeometry args={[0.8, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.9} side={2} />
                </mesh>
            </group>
        </group>
    );
}

export default function Court3D({ className }) {
    return (
        <div className={`cursor-grab active:cursor-grabbing ${className || 'h-[300px] w-full'}`}>
            <Canvas camera={{ position: [0, 1, 9], fov: 45 }}>
                <ambientLight intensity={0.4} />
                {/* Key Lighting mimicking courtroom chandeliers */}
                <directionalLight position={[10, 12, 10]} intensity={1.5} color="#fff1d6" castShadow />
                <pointLight position={[-10, 2, -10]} intensity={0.8} color="#f5d985" />

                <PresentationControls
                    global
                    config={{ mass: 2, tension: 500 }}
                    snap={{ mass: 4, tension: 1500 }}
                    rotation={[0, 0.2, 0]}
                    polar={[-Math.PI / 4, Math.PI / 4]}
                    azimuth={[-Math.PI / 1.5, Math.PI / 1.5]}
                >
                    <Float
                        speed={1.5}
                        rotationIntensity={0.2}
                        floatIntensity={0.4}
                        floatingRange={[-0.1, 0.1]}
                    >
                        <PremiumScale scale={0.9} position={[0, 0, 0]} />
                    </Float>
                </PresentationControls>
                <ContactShadows position={[0, -3.5, 0]} opacity={0.5} scale={15} blur={2.5} far={4} color="#2d231f" />
                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
