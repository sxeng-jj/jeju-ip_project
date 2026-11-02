import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 진열장의 메달과 같은 모양(금색 원판 + 테두리 + 이모지 앞뒷면)
function faceTexture(emoji) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  g.fillStyle = '#fff7e6'
  g.fillRect(0, 0, 256, 256)
  g.font = '150px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(emoji, 128, 140)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// 위에서 '짠!' 하고 커지며 내려앉은 뒤 천천히 돈다
function Medal({ emoji }) {
  const group = useRef()
  const tex = useMemo(() => faceTexture(emoji), [emoji])
  const t0 = useRef(null)

  useFrame((state) => {
    t0.current ??= state.clock.elapsedTime
    const t = state.clock.elapsedTime - t0.current
    const g = group.current
    const k = Math.min(1, t / 0.7)
    const pop = 1 - Math.exp(-7 * k) * Math.cos(10 * k) // 넘쳤다가 안착
    g.scale.setScalar(Math.max(0.001, pop))
    g.rotation.y = (1 - k) * Math.PI * 4 + Math.sin(t * 1.2) * 0.5 // 빙글 돌다 앞을 보며 살랑
    g.position.y = Math.sin(t * 2) * 0.06
  })

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.18, 48]} />
        <meshStandardMaterial color="#f6b73c" metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.85, 0.07, 16, 48]} />
        <meshStandardMaterial color="#e0961a" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.096]}>
        <circleGeometry args={[0.72, 48]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.096]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.72, 48]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

// 반짝이 가루: 메달 주위에서 천천히 도는 작은 점들
function Sparkles() {
  const ref = useRef()
  const pos = useMemo(() => {
    const a = new Float32Array(60 * 3)
    for (let i = 0; i < 60; i++) {
      const r = 1.3 + Math.random() * 0.9
      const th = Math.random() * Math.PI * 2
      a.set([Math.cos(th) * r, (Math.random() - 0.5) * 2.4, Math.sin(th) * r * 0.5], i * 3)
    }
    return a
  }, [])
  useFrame((_, dt) => { ref.current.rotation.y += dt * 0.4 })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffc94d" size={0.07} sizeAttenuation />
    </points>
  )
}

export default function BadgeSpin3D({ emoji }) {
  return (
    <Canvas camera={{ position: [0, 0, 4.2], fov: 38 }} dpr={[1, 2]}>
      <ambientLight intensity={1.0} />
      <directionalLight position={[3, 5, 7]} intensity={1.6} />
      <pointLight position={[-4, 2, 5]} intensity={20} color="#ffd9a0" />
      <Medal emoji={emoji} />
      <Sparkles />
    </Canvas>
  )
}
