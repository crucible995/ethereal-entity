import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STAR_COUNT = 200

export function SpaceEnvironment() {
  return (
    <>
      <Stars />
      <Platform />
      <ambientLight intensity={0.03} />
    </>
  )
}

function Stars() {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)
    const phases = new Float32Array(STAR_COUNT)

    for (let i = 0; i < STAR_COUNT; i++) {
      // Distribute stars on a sphere around the scene
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 80 + Math.random() * 40

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      sizes[i] = Math.random() * 1.5 + 0.5
      phases[i] = Math.random() * Math.PI * 2
    }

    return { positions, sizes, phases }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
    return geo
  }, [positions, sizes, phases])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        varying float vPhase;
        varying float vSize;

        void main() {
          vPhase = phase;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vPhase;
        varying float vSize;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;

          float twinkle = 0.5 + 0.5 * sin(uTime * 1.5 + vPhase);
          float alpha = (1.0 - dist * 2.0) * twinkle * 0.8;

          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}

function Platform() {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;

          // Edge glow
          float edge = smoothstep(0.7, 1.0, dist);
          float glow = (1.0 - dist) * 0.15;

          // Subtle grid pattern
          float gridX = abs(fract(vPosition.x * 0.5) - 0.5);
          float gridY = abs(fract(vPosition.z * 0.5) - 0.5);
          float grid = smoothstep(0.48, 0.5, max(gridX, gridY)) * 0.05;

          // Pulse
          float pulse = 0.5 + 0.5 * sin(uTime * 0.5);

          vec3 baseColor = vec3(0.05, 0.05, 0.1);
          vec3 edgeColor = vec3(0.1, 0.15, 0.3);
          vec3 gridColor = vec3(0.2, 0.3, 0.5);

          vec3 color = baseColor + edge * edgeColor * pulse + grid * gridColor;
          float alpha = (1.0 - dist * 0.8) * 0.5;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  }, [])

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, -5, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={material}
    >
      <circleGeometry args={[12, 64]} />
    </mesh>
  )
}
