import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

const STONE = '#76797c' // 현무암 회색

// 누르면 통통 튀고, 가만히 있을 때는 bob 만큼 위아래로 둥실거린다.
// 반환값은 '튀기 시작' 함수다. bob 이 0 이면 둥실거리지 않는다(움직임 줄이기 설정).
function useBounce(ref, baseY, { height = 0.4, bob = 0, phase = 0 } = {}) {
  const clock = useThree((s) => s.clock)
  const t0 = useRef(-10)
  useFrame(() => {
    const t = clock.elapsedTime
    const dt = t - t0.current
    const hop = dt < 1.4 ? Math.abs(Math.sin(dt * 9)) * Math.exp(-2.4 * dt) * height : 0
    ref.current.position.y = baseY + Math.sin(t * 1.6 + phase) * bob + hop
  })
  return () => { t0.current = clock.elapsedTime }
}

const pointer = {
  onPointerOver: (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' },
  onPointerOut: () => { document.body.style.cursor = '' },
}

// 돌하르방: 벙거지를 쓰고 두 손을 배 위에 올린 제주의 돌 할아버지
function Hareubang({ position }) {
  const ref = useRef()
  const hop = useBounce(ref, position[1], { height: 0.3, bob: 0 })
  const stone = <meshStandardMaterial color={STONE} roughness={1} flatShading />
  const dark = <meshStandardMaterial color="#2b2d2f" roughness={0.9} />
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); hop() }} {...pointer}>
      <mesh position={[0, 0.75, 0]}>
        <capsuleGeometry args={[0.42, 0.7, 6, 16]} />
        {stone}
      </mesh>
      {/* 두 팔과 배 위의 손 */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.4, 0.9, 0.12]} rotation={[0.2, 0, s * -0.35]}>
            <capsuleGeometry args={[0.09, 0.42, 4, 8]} />
            {stone}
          </mesh>
          <mesh position={[s * 0.17, 0.66, 0.4]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            {stone}
          </mesh>
        </group>
      ))}
      {/* 얼굴 */}
      <mesh position={[0, 1.8, 0]} scale={[1, 1.05, 1]}>
        <sphereGeometry args={[0.4, 20, 20]} />
        {stone}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, 1.84, 0.34]} scale={[1, 1.1, 0.6]}>
          <sphereGeometry args={[0.085, 12, 12]} />
          {dark}
        </mesh>
      ))}
      <mesh position={[0, 1.72, 0.4]}>
        <boxGeometry args={[0.1, 0.2, 0.1]} />
        {stone}
      </mesh>
      <mesh position={[0, 1.57, 0.37]}>
        <boxGeometry args={[0.26, 0.035, 0.05]} />
        {dark}
      </mesh>
      {/* 벙거지: 넓은 챙과 둥근 모자 */}
      <mesh position={[0, 2.05, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.07, 24]} />
        {stone}
      </mesh>
      <mesh position={[0, 2.2, 0]} scale={[1, 0.75, 1]}>
        <sphereGeometry args={[0.36, 20, 20]} />
        {stone}
      </mesh>
    </group>
  )
}

// 감귤: 주황 열매에 초록 꼭지와 잎
function Orange({ position, size = 0.5, phase = 0, bob = 0 }) {
  const ref = useRef()
  const hop = useBounce(ref, position[1], { height: 0.55, bob, phase })
  return (
    <group ref={ref} position={position} onClick={(e) => { e.stopPropagation(); hop() }} {...pointer}>
      <mesh scale={[1, 0.88, 1]}>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial color="#f58a1f" roughness={0.55} />
      </mesh>
      <mesh position={[0, size * 0.86, 0]}>
        <cylinderGeometry args={[size * 0.07, size * 0.09, size * 0.28, 8]} />
        <meshStandardMaterial color="#5c7a3a" />
      </mesh>
      <mesh position={[size * 0.36, size * 0.9, 0]} rotation={[0, 0, -0.35]} scale={[1, 0.16, 0.55]}>
        <sphereGeometry args={[size * 0.5, 12, 12]} />
        <meshStandardMaterial color="#3f9b54" roughness={0.7} />
      </mesh>
    </group>
  )
}

// 한라산: 초록 산 꼭대기에 흰 봉우리
function Hallasan({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <coneGeometry args={[0.95, 1.2, 28]} />
        <meshStandardMaterial color="#2f7a4d" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <coneGeometry args={[0.34, 0.4, 28]} />
        <meshStandardMaterial color="#f8faf5" roughness={0.9} flatShading />
      </mesh>
    </group>
  )
}

// 홈 첫 화면의 장식: 제주 섬 조각 위에 돌하르방·감귤·한라산. 끌어서 돌려 보고, 눌러서 튀게 할 수 있다.
export default function JejuScene3D() {
  // 시스템에서 '움직임 줄이기'를 켠 사람에게는 저절로 돌거나 둥실거리지 않게 한다
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, [])
  const bob = reduced ? 0 : 0.06

  return (
    <div className="hero-scene" aria-hidden="true">
      <Canvas camera={{ position: [5.0, 2.9, 7.4], fov: 34 }} dpr={[1, 2]}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} />
        <pointLight position={[-4, 2, 3]} intensity={25} color="#ffd9a0" />

        <group position={[0, -1.25, 0]}>
          {/* 섬 조각과 바다 */}
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[3.0, 3.0, 0.12, 48]} />
            <meshStandardMaterial color="#4fbac6" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[2.35, 2.5, 0.2, 40]} />
            <meshStandardMaterial color="#6bb36e" roughness={0.95} flatShading />
          </mesh>

          <Hallasan position={[-1.45, 0.04, -0.75]} />
          <Hareubang position={[-0.2, 0.04, 0.1]} />
          <Orange position={[1.2, 0.5, 0.45]} size={0.5} bob={bob} />
          <Orange position={[1.85, 0.36, -0.45]} size={0.36} phase={1.7} bob={bob} />
        </group>

        <OrbitControls
          target={[0, 0.5, 0]}
          enableZoom={false}
          enablePan={false}
          autoRotate={!reduced}
          autoRotateSpeed={1.4}
          minPolarAngle={0.9}
          maxPolarAngle={1.55}
        />
      </Canvas>
    </div>
  )
}
