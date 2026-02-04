import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EntityState, TransitionState } from '../hooks/useEntityState'
import { getInterpolatedValue } from '../hooks/useEntityState'

interface OphanimEntityProps {
  currentState: EntityState
  transition: TransitionState
}

// Ring configuration
const RING_COUNT = 4
const PARTICLES_PER_RING = 180
const EYE_COUNT = 8
const PARTICLES_PER_EYE = 30

// Colors
const COLORS = {
  base: new THREE.Color('#4a9eff'),
  thinking: new THREE.Color('#7b68ee'),
  acting: new THREE.Color('#00ffff'),
  eye: new THREE.Color('#ffffff'),
  eyeIris: new THREE.Color('#4a9eff'),
}

interface RingConfig {
  axis: THREE.Vector3
  radius: number
  speed: number
  phase: number
}

const RING_CONFIGS: RingConfig[] = [
  { axis: new THREE.Vector3(1, 0, 0), radius: 2.0, speed: 1.0, phase: 0 },
  { axis: new THREE.Vector3(0, 1, 0), radius: 1.8, speed: -0.8, phase: Math.PI / 4 },
  { axis: new THREE.Vector3(0, 0, 1), radius: 1.6, speed: 0.9, phase: Math.PI / 2 },
  { axis: new THREE.Vector3(1, 1, 0).normalize(), radius: 1.4, speed: -0.7, phase: Math.PI * 0.75 },
]

export function OphanimEntity({ currentState, transition }: OphanimEntityProps) {
  const groupRef = useRef<THREE.Group>(null)

  return (
    <group ref={groupRef} position={[0, 2, 0]}>
      {RING_CONFIGS.map((config, i) => (
        <ParticleRing
          key={i}
          config={config}
          index={i}
          currentState={currentState}
          transition={transition}
        />
      ))}
      <EyeClusters currentState={currentState} transition={transition} />
      <CoreGlow currentState={currentState} transition={transition} />
    </group>
  )
}

interface ParticleRingProps {
  config: RingConfig
  index: number
  currentState: EntityState
  transition: TransitionState
}

function ParticleRing({ config, index, currentState, transition }: ParticleRingProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const rotationRef = useRef(0)

  const { basePositions, phases, sizes } = useMemo(() => {
    const basePositions = new Float32Array(PARTICLES_PER_RING * 3)
    const phases = new Float32Array(PARTICLES_PER_RING)
    const sizes = new Float32Array(PARTICLES_PER_RING)

    // Create rotation matrix to orient ring on its axis
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, config.axis)
    const matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion)

    for (let i = 0; i < PARTICLES_PER_RING; i++) {
      const angle = (i / PARTICLES_PER_RING) * Math.PI * 2
      const pos = new THREE.Vector3(
        Math.cos(angle) * config.radius,
        0,
        Math.sin(angle) * config.radius
      )
      pos.applyMatrix4(matrix)

      basePositions[i * 3] = pos.x
      basePositions[i * 3 + 1] = pos.y
      basePositions[i * 3 + 2] = pos.z

      phases[i] = Math.random() * Math.PI * 2
      sizes[i] = 2.0 + Math.random() * 1.5
    }

    return { basePositions, phases, sizes }
  }, [config])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(basePositions.slice(), 3))
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [basePositions, phases, sizes])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: COLORS.base.clone() },
        uOpacity: { value: 0.6 },
        uPulseIntensity: { value: 0 },
        uSpread: { value: 0.3 },
      },
      vertexShader: `
        attribute float phase;
        attribute float size;
        uniform float uTime;
        uniform float uSpread;
        varying float vPhase;
        varying float vIntensity;

        void main() {
          vPhase = phase;

          // Add some drift based on state
          vec3 pos = position;
          float drift = sin(uTime * 2.0 + phase) * uSpread;
          pos += normalize(pos) * drift * 0.1;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;

          vIntensity = 0.5 + 0.5 * sin(uTime * 3.0 + phase);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uPulseIntensity;
        uniform float uTime;
        varying float vPhase;
        varying float vIntensity;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          // Soft gaussian falloff
          float alpha = exp(-dist * dist * 8.0);

          // Pulsing glow
          float pulse = 1.0 + uPulseIntensity * vIntensity;

          vec3 color = uColor * pulse;
          float finalAlpha = alpha * uOpacity;

          gl_FragColor = vec4(color, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useFrame((state, delta) => {
    if (!pointsRef.current) return

    const time = state.clock.elapsedTime

    // Get state-based values
    const speedMultiplier = getInterpolatedValue(0.3, 0.8, 2.0, currentState, transition)
    const spread = getInterpolatedValue(0.4, 0.15, 0.05, currentState, transition)
    const opacity = getInterpolatedValue(0.4, 0.6, 0.9, currentState, transition)
    const pulseIntensity = getInterpolatedValue(0.1, 0.4, 0.8, currentState, transition)

    // Rotation
    rotationRef.current += delta * config.speed * speedMultiplier

    // Rotate particles around the ring axis
    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const quaternion = new THREE.Quaternion().setFromAxisAngle(config.axis, delta * config.speed * speedMultiplier)

    for (let i = 0; i < PARTICLES_PER_RING; i++) {
      const x = posAttr.getX(i)
      const y = posAttr.getY(i)
      const z = posAttr.getZ(i)

      const pos = new THREE.Vector3(x, y, z)
      pos.applyQuaternion(quaternion)

      posAttr.setXYZ(i, pos.x, pos.y, pos.z)
    }
    posAttr.needsUpdate = true

    // Update material uniforms
    material.uniforms.uTime.value = time
    material.uniforms.uSpread.value = spread
    material.uniforms.uOpacity.value = opacity
    material.uniforms.uPulseIntensity.value = pulseIntensity

    // Color transitions
    const targetColor = currentState === 'acting' ? COLORS.acting :
                       currentState === 'thinking' ? COLORS.thinking : COLORS.base
    material.uniforms.uColor.value.lerp(targetColor, delta * 3)
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}

interface EyeClustersProps {
  currentState: EntityState
  transition: TransitionState
}

function EyeClusters({ currentState, transition }: EyeClustersProps) {
  // Position eyes at key intersection points of the rings
  const eyePositions = useMemo(() => {
    const positions: THREE.Vector3[] = []

    // Strategic positions where rings conceptually intersect
    const radius = 1.5
    positions.push(new THREE.Vector3(radius, 0, 0))
    positions.push(new THREE.Vector3(-radius, 0, 0))
    positions.push(new THREE.Vector3(0, radius, 0))
    positions.push(new THREE.Vector3(0, -radius, 0))
    positions.push(new THREE.Vector3(0, 0, radius))
    positions.push(new THREE.Vector3(0, 0, -radius))
    positions.push(new THREE.Vector3(radius * 0.7, radius * 0.7, 0))
    positions.push(new THREE.Vector3(-radius * 0.7, -radius * 0.7, 0))

    return positions
  }, [])

  return (
    <>
      {eyePositions.map((pos, i) => (
        <Eye
          key={i}
          position={pos}
          index={i}
          currentState={currentState}
          transition={transition}
        />
      ))}
    </>
  )
}

interface EyeProps {
  position: THREE.Vector3
  index: number
  currentState: EntityState
  transition: TransitionState
}

function Eye({ position, index, currentState, transition }: EyeProps) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, sizes, distances } = useMemo(() => {
    const positions = new Float32Array(PARTICLES_PER_EYE * 3)
    const sizes = new Float32Array(PARTICLES_PER_EYE)
    const distances = new Float32Array(PARTICLES_PER_EYE)

    // Create iris-like pattern
    for (let i = 0; i < PARTICLES_PER_EYE; i++) {
      const angle = (i / PARTICLES_PER_EYE) * Math.PI * 2
      const ring = Math.floor(i / 10)
      const dist = 0.05 + ring * 0.08

      // Offset from eye center
      const x = Math.cos(angle) * dist
      const y = Math.sin(angle) * dist

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = 0

      sizes[i] = ring === 0 ? 4.0 : 2.5 - ring * 0.3
      distances[i] = dist
    }

    return { positions, sizes, distances }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('dist', new THREE.BufferAttribute(distances, 1))
    return geo
  }, [positions, sizes, distances])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.3 },
        uScanPhase: { value: index * 0.5 },
      },
      vertexShader: `
        attribute float size;
        attribute float dist;
        uniform float uTime;
        uniform float uIntensity;
        varying float vDist;
        varying float vIntensity;

        void main() {
          vDist = dist;
          vIntensity = uIntensity;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uIntensity * 2.0 * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uScanPhase;
        varying float vDist;
        varying float vIntensity;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float d = length(center);

          float alpha = exp(-d * d * 6.0) * vIntensity;

          // Core is brighter white, outer is blue-tinted
          vec3 coreColor = vec3(1.0, 1.0, 1.0);
          vec3 outerColor = vec3(0.3, 0.6, 1.0);
          vec3 color = mix(coreColor, outerColor, vDist * 4.0);

          // Scan effect
          float scan = 0.5 + 0.5 * sin(uTime * 2.0 + uScanPhase);
          color *= 0.8 + scan * 0.4;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [index])

  useFrame((state) => {
    if (!pointsRef.current) return

    const time = state.clock.elapsedTime

    // Eyes face the camera (billboard effect)
    pointsRef.current.lookAt(state.camera.position)

    // State-based intensity
    const intensity = getInterpolatedValue(0.3, 0.7, 1.5, currentState, transition)

    // Sequential activation during thinking
    let finalIntensity = intensity
    if (currentState === 'thinking' || (transition.isTransitioning && transition.to === 'thinking')) {
      const scanWave = Math.sin(time * 3 + index * 0.8)
      finalIntensity *= 0.7 + scanWave * 0.3
    }

    // All eyes blaze during acting
    if (currentState === 'acting') {
      const blaze = 0.8 + Math.sin(time * 8) * 0.2
      finalIntensity *= blaze
    }

    material.uniforms.uTime.value = time
    material.uniforms.uIntensity.value = finalIntensity
  })

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      position={position}
    />
  )
}

interface CoreGlowProps {
  currentState: EntityState
  transition: TransitionState
}

function CoreGlow({ currentState, transition }: CoreGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.3 },
        uColor: { value: COLORS.base.clone() },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Fresnel effect - glow at edges
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);

          // Pulsing
          float pulse = 0.8 + 0.2 * sin(uTime * 2.0);

          vec3 color = uColor * uIntensity * pulse;
          float alpha = fresnel * uIntensity * 0.5;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    })
  }, [])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime
    const intensity = getInterpolatedValue(0.3, 0.6, 1.2, currentState, transition)
    const scale = getInterpolatedValue(0.8, 0.9, 1.1, currentState, transition)

    // Breathing effect
    const breathe = 1 + Math.sin(time * 1.5) * 0.05 * intensity
    meshRef.current.scale.setScalar(scale * breathe)

    material.uniforms.uTime.value = time
    material.uniforms.uIntensity.value = intensity

    // Color transition
    const targetColor = currentState === 'acting' ? COLORS.acting :
                       currentState === 'thinking' ? COLORS.thinking : COLORS.base
    material.uniforms.uColor.value.lerp(targetColor, delta * 3)
  })

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[0.5, 32, 32]} />
    </mesh>
  )
}
