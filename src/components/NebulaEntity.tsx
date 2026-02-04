import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EntityState, TransitionState } from '../hooks/useEntityState'
import { getInterpolatedValue } from '../hooks/useEntityState'

interface NebulaEntityProps {
  currentState: EntityState
  transition: TransitionState
}

const CORE_PARTICLES = 400
const MID_PARTICLES = 350
const EDGE_PARTICLES = 250
const TOTAL_PARTICLES = CORE_PARTICLES + MID_PARTICLES + EDGE_PARTICLES

// Colors
const COLORS = {
  core: new THREE.Color('#ff6b9d'),
  coreActing: new THREE.Color('#ffffff'),
  mid: new THREE.Color('#9d4edd'),
  edge: new THREE.Color('#4361ee'),
  thinking: new THREE.Color('#f72585'),
  acting: new THREE.Color('#4cc9f0'),
}

export function NebulaEntity({ currentState, transition }: NebulaEntityProps) {
  const groupRef = useRef<THREE.Group>(null)

  return (
    <group ref={groupRef} position={[0, 2, 0]}>
      <NebulaCloud currentState={currentState} transition={transition} />
      <NebulaCore currentState={currentState} transition={transition} />
    </group>
  )
}

interface NebulaCloudProps {
  currentState: EntityState
  transition: TransitionState
}

function NebulaCloud({ currentState, transition }: NebulaCloudProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)
  const basePositionsRef = useRef<Float32Array | null>(null)

  const { positions, sizes, layers, phases } = useMemo(() => {
    const positions = new Float32Array(TOTAL_PARTICLES * 3)
    const sizes = new Float32Array(TOTAL_PARTICLES)
    const layers = new Float32Array(TOTAL_PARTICLES) // 0=core, 1=mid, 2=edge
    const phases = new Float32Array(TOTAL_PARTICLES)
    const velocities = new Float32Array(TOTAL_PARTICLES * 3)

    let idx = 0

    // Core particles (dense center)
    for (let i = 0; i < CORE_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.random() * 0.6

      positions[idx * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[idx * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[idx * 3 + 2] = r * Math.cos(phi)

      sizes[idx] = 3.0 + Math.random() * 2.0
      layers[idx] = 0
      phases[idx] = Math.random() * Math.PI * 2

      // Slow circular velocities
      velocities[idx * 3] = (Math.random() - 0.5) * 0.02
      velocities[idx * 3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[idx * 3 + 2] = (Math.random() - 0.5) * 0.02

      idx++
    }

    // Mid particles
    for (let i = 0; i < MID_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 0.5 + Math.random() * 1.0

      positions[idx * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[idx * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[idx * 3 + 2] = r * Math.cos(phi)

      sizes[idx] = 2.0 + Math.random() * 1.5
      layers[idx] = 1
      phases[idx] = Math.random() * Math.PI * 2

      velocities[idx * 3] = (Math.random() - 0.5) * 0.04
      velocities[idx * 3 + 1] = (Math.random() - 0.5) * 0.04
      velocities[idx * 3 + 2] = (Math.random() - 0.5) * 0.04

      idx++
    }

    // Edge particles (sparse wisps)
    for (let i = 0; i < EDGE_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.2 + Math.random() * 1.3

      positions[idx * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[idx * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[idx * 3 + 2] = r * Math.cos(phi)

      sizes[idx] = 1.0 + Math.random() * 1.0
      layers[idx] = 2
      phases[idx] = Math.random() * Math.PI * 2

      velocities[idx * 3] = (Math.random() - 0.5) * 0.08
      velocities[idx * 3 + 1] = (Math.random() - 0.5) * 0.08
      velocities[idx * 3 + 2] = (Math.random() - 0.5) * 0.08

      idx++
    }

    velocitiesRef.current = velocities
    basePositionsRef.current = positions.slice()

    return { positions, sizes, layers, phases }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('layer', new THREE.BufferAttribute(layers, 1))
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
    return geo
  }, [positions, sizes, layers, phases])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCoreColor: { value: COLORS.core.clone() },
        uMidColor: { value: COLORS.mid.clone() },
        uEdgeColor: { value: COLORS.edge.clone() },
        uIntensity: { value: 0.5 },
        uContraction: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        attribute float layer;
        attribute float phase;
        uniform float uTime;
        uniform float uContraction;
        varying float vLayer;
        varying float vPhase;
        varying float vDist;

        void main() {
          vLayer = layer;
          vPhase = phase;

          vec3 pos = position * uContraction;
          vDist = length(pos);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (120.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uCoreColor;
        uniform vec3 uMidColor;
        uniform vec3 uEdgeColor;
        uniform float uIntensity;
        varying float vLayer;
        varying float vPhase;
        varying float vDist;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          // Soft gaussian
          float alpha = exp(-dist * dist * 6.0);

          // Color based on layer
          vec3 color;
          if (vLayer < 0.5) {
            color = uCoreColor;
          } else if (vLayer < 1.5) {
            color = uMidColor;
          } else {
            color = uEdgeColor;
          }

          // Pulsing
          float pulse = 0.8 + 0.2 * sin(uTime * 2.0 + vPhase);

          // Fade outer particles
          float distFade = vLayer < 1.5 ? 1.0 : (1.0 - smoothstep(1.5, 2.5, vDist));

          float finalAlpha = alpha * uIntensity * pulse * distFade;

          gl_FragColor = vec4(color * (1.0 + uIntensity * 0.5), finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useFrame((state, delta) => {
    if (!pointsRef.current || !velocitiesRef.current || !basePositionsRef.current) return

    const time = state.clock.elapsedTime
    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const layerAttr = pointsRef.current.geometry.getAttribute('layer') as THREE.BufferAttribute

    // State-based values
    const flowSpeed = getInterpolatedValue(0.3, 0.8, 1.5, currentState, transition)
    const contraction = getInterpolatedValue(1.0, 0.7, 0.5, currentState, transition)
    const intensity = getInterpolatedValue(0.4, 0.7, 1.2, currentState, transition)
    const spiralStrength = getInterpolatedValue(0.0, 0.3, 0.6, currentState, transition)
    const chaosAmount = getInterpolatedValue(0.02, 0.05, 0.1, currentState, transition)

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const layer = layerAttr.getX(i)
      const baseX = basePositionsRef.current[i * 3]
      const baseY = basePositionsRef.current[i * 3 + 1]
      const baseZ = basePositionsRef.current[i * 3 + 2]

      let x = posAttr.getX(i)
      let y = posAttr.getY(i)
      let z = posAttr.getZ(i)

      // Flow field - circular motion around Y axis
      const dist = Math.sqrt(x * x + z * z)
      if (dist > 0.01) {
        const angle = Math.atan2(z, x)
        const rotSpeed = flowSpeed * (0.5 + layer * 0.3) * delta
        const newAngle = angle + rotSpeed

        // Spiral inward during thinking/acting
        const spiralPull = spiralStrength * delta * (layer + 1)
        const newDist = Math.max(0.1, dist - spiralPull * 0.1)

        x = Math.cos(newAngle) * newDist
        z = Math.sin(newAngle) * newDist
      }

      // Vertical oscillation
      y += Math.sin(time * 2 + i * 0.1) * 0.002 * flowSpeed

      // Gentle pull toward center (breathing)
      const toCenter = new THREE.Vector3(-x, -y, -z).normalize()
      const pullStrength = 0.01 * flowSpeed
      x += toCenter.x * pullStrength * delta
      y += toCenter.y * pullStrength * delta
      z += toCenter.z * pullStrength * delta

      // Add chaos
      x += (Math.random() - 0.5) * chaosAmount
      y += (Math.random() - 0.5) * chaosAmount
      z += (Math.random() - 0.5) * chaosAmount

      // Soft boundary - push back if too far
      const currentDist = Math.sqrt(x * x + y * y + z * z)
      const maxDist = layer === 0 ? 0.8 : layer === 1 ? 1.5 : 2.5
      if (currentDist > maxDist * contraction) {
        const scale = (maxDist * contraction) / currentDist
        x *= scale * 0.95
        y *= scale * 0.95
        z *= scale * 0.95
      }

      posAttr.setXYZ(i, x, y, z)
    }
    posAttr.needsUpdate = true

    // Update uniforms
    material.uniforms.uTime.value = time
    material.uniforms.uContraction.value = contraction
    material.uniforms.uIntensity.value = intensity

    // Color transitions
    const targetCore = currentState === 'acting' ? COLORS.coreActing : COLORS.core
    const targetMid = currentState === 'acting' ? COLORS.acting : COLORS.mid
    material.uniforms.uCoreColor.value.lerp(targetCore, delta * 2)
    material.uniforms.uMidColor.value.lerp(targetMid, delta * 2)
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}

interface NebulaCoreProps {
  currentState: EntityState
  transition: TransitionState
}

function NebulaCore({ currentState, transition }: NebulaCoreProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.5 },
        uColor: { value: COLORS.core.clone() },
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
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);

          float pulse = 0.7 + 0.3 * sin(uTime * 3.0);
          vec3 color = uColor * uIntensity * pulse;
          float alpha = fresnel * uIntensity * 0.6;

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
    const intensity = getInterpolatedValue(0.4, 0.7, 1.5, currentState, transition)
    const scale = getInterpolatedValue(0.4, 0.35, 0.25, currentState, transition)

    // Breathing
    const breathe = 1 + Math.sin(time * 2) * 0.1 * intensity
    meshRef.current.scale.setScalar(scale * breathe)

    material.uniforms.uTime.value = time
    material.uniforms.uIntensity.value = intensity

    const targetColor = currentState === 'acting' ? new THREE.Color('#ffffff') : COLORS.core
    material.uniforms.uColor.value.lerp(targetColor, delta * 2)
  })

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[1, 32, 32]} />
    </mesh>
  )
}
