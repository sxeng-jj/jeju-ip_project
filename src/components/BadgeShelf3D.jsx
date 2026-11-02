import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const COLS = 5
const GAP = 2.3 // 메달 사이 간격
const ROW_Y = [1.3, -1.5] // 윗줄·아랫줄 높이

// 메달 앞면 그림: 이모지를 캔버스에 그려 텍스처로 쓴다. 못 얻은 배지는 회색 바탕에 자물쇠.
function faceTexture(emoji, locked) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  g.fillStyle = locked ? '#cfd6d1' : '#fff7e6'
  g.fillRect(0, 0, 256, 256)
  g.font = '150px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.globalAlpha = locked ? 0.4 : 1
  g.fillText(locked ? '🔒' : emoji, 128, 140)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// 메달 하나. 평소에는 앞면이 보이도록 살짝 흔들리고(못 얻은 배지는 더 약하게), 고른 메달만 빙글 돈다.
function Medal({ badge, position, selected, onSelect }) {
  const spin = useRef()
  const [hover, setHover] = useState(false)
  const tex = useMemo(() => faceTexture(badge.emoji, !badge.ok), [badge.emoji, badge.ok])

  useFrame((state, dt) => {
    const g = spin.current
    if (selected) {
      g.rotation.y += dt * 2
    } else {
      const swing = Math.sin(state.clock.elapsedTime * 0.9 + position[0]) * (badge.ok ? 0.45 : 0.2)
      const wrapped = ((((g.rotation.y + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI // 돌던 각도를 -π~π 로
      g.rotation.y = THREE.MathUtils.lerp(wrapped, swing, 0.1)
    }
    const want = selected || hover ? 1.18 : 1
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, want, 0.15))
  })

  const metal = badge.ok ? '#f6b73c' : '#aeb7b1'
  return (
    <group position={position}>
      <group
        ref={spin}
        onClick={(e) => { e.stopPropagation(); onSelect(badge.key) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      >
        {/* 몸통: 얇은 원기둥을 눕혀서 앞면이 정면을 보게 한다 */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.18, 48]} />
          <meshStandardMaterial color={metal} metalness={badge.ok ? 0.35 : 0.1} roughness={badge.ok ? 0.4 : 0.85} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.85, 0.07, 16, 48]} />
          <meshStandardMaterial color={badge.ok ? '#e0961a' : '#8e9892'} metalness={badge.ok ? 0.4 : 0.1} roughness={0.4} />
        </mesh>
        {/* 앞면·뒷면 그림 (조명을 받지 않는 재질이라 색이 선명하다) */}
        <mesh position={[0, 0, 0.096]}>
          <circleGeometry args={[0.72, 48]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.096]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.72, 48]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>

      {/* 이름표는 한글이 깨지지 않도록 화면 위의 글자로 얹는다 */}
      <Html position={[0, -1.15, 0.3]} center style={{ pointerEvents: 'none' }}>
        <span className="shelf-label" style={{ opacity: badge.ok ? 1 : 0.6 }}>{badge.name}</span>
      </Html>
    </group>
  )
}

// 배지 진열장: 선반 두 줄에 배지 10개를 늘어놓고, 눌러서 고르고, 끌어서 살짝 돌려 볼 수 있다.
export default function BadgeShelf3D({ badges, selectedKey, onSelect }) {
  const place = (i) => {
    const row = Math.floor(i / COLS)
    const col = i % COLS
    return [(col - (COLS - 1) / 2) * GAP, ROW_Y[row] ?? 0, 0]
  }
  const rows = Math.ceil(badges.length / COLS)

  return (
    <div className="shelf3d">
      <Canvas camera={{ position: [0, 0, 11], fov: 38 }} dpr={[1, 2]}>
        <ambientLight intensity={1.0} />
        <directionalLight position={[3, 5, 7]} intensity={1.6} />
        <pointLight position={[-4, 2, 5]} intensity={20} color="#ffd9a0" />

        {/* 뒷벽과 선반 */}
        <mesh position={[0, 0, -1]}>
          <planeGeometry args={[40, 24]} />
          <meshBasicMaterial color="#f7efe0" toneMapped={false} />
        </mesh>
        {Array.from({ length: rows }, (_, r) => (
          <mesh key={r} position={[0, ROW_Y[r] - 1.2, -0.1]}>
            <boxGeometry args={[COLS * GAP + 0.6, 0.22, 1.5]} />
            <meshStandardMaterial color="#c9955a" roughness={0.75} />
          </mesh>
        ))}

        {badges.map((b, i) => (
          <Medal key={b.key} badge={b} position={place(i)} selected={b.key === selectedKey} onSelect={onSelect} />
        ))}

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minAzimuthAngle={-0.55}
          maxAzimuthAngle={0.55}
          minPolarAngle={1.25}
          maxPolarAngle={1.9}
        />
      </Canvas>
    </div>
  )
}
