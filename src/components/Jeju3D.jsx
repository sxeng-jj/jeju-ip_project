import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { HALLA, JEJU_OUTLINE, project, seasonColor, spreadPins } from '../lib/jeju'
import { statusOf } from '../lib/date'

const GROUND = 0.25 // 섬 두께(= 핀이 서는 높이)

// 해안선 좌표 → 부드러운 곡선 → 압출한 섬 모양
function Island() {
  const geometry = useMemo(() => {
    const pts = JEJU_OUTLINE.map(([lng, lat]) => {
      const [x, z] = project(lng, lat)
      return new THREE.Vector3(x, -z, 0) // 바닥에 눕히면 world z = project z
    })
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5)
    const shape = new THREE.Shape(curve.getPoints(160).map((p) => new THREE.Vector2(p.x, p.y)))
    return new THREE.ExtrudeGeometry(shape, { depth: GROUND, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 2 })
  }, [])

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#4f9a64" roughness={0.9} flatShading />
    </mesh>
  )
}

function Hallasan() {
  const [x, z] = project(HALLA.lng, HALLA.lat)
  return (
    <group position={[x, GROUND, z]}>
      <mesh position={[0, 0.4, 0]}>
        <coneGeometry args={[1.0, 0.8, 28]} />
        <meshStandardMaterial color="#3d7f55" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <coneGeometry args={[0.28, 0.2, 28]} />
        <meshStandardMaterial color="#e9f1f4" roughness={0.8} flatShading />
      </mesh>
    </group>
  )
}

function Pin({ festival: f, at, selected, onSelect }) {
  const lift = useRef()
  const [hover, setHover] = useState(false)
  const { x, z, ox, oz } = at
  const moved = Math.hypot(x - ox, z - oz) > 0.01 // 겹쳐서 펼쳐진 핀인가
  const color = seasonColor(f.start)
  const live = statusOf(f) === 'ongoing'
  const ended = statusOf(f) === 'ended'

  useFrame(({ clock }) => {
    const bob = live || selected ? Math.sin(clock.elapsedTime * 3) * 0.07 : 0
    lift.current.position.y = bob + (hover ? 0.08 : 0)
  })

  return (
    <>
      {moved && (
        <>
          {/* 실제 위치 표시: 작은 점 + 핀까지 이어지는 가는 선 */}
          <mesh position={[ox, GROUND + 0.01, oz]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.04, 12]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <Line points={[[ox, GROUND + 0.02, oz], [x, GROUND + 0.02, z]]} color={color} lineWidth={1} transparent opacity={0.7} />
        </>
      )}
    <group position={[x, GROUND, z]}>
      <group
        ref={lift}
        onClick={(e) => { e.stopPropagation(); onSelect(f) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      >
        <mesh position={[0, 0.45, 0]} scale={selected ? 1.5 : 1}>
          <sphereGeometry args={[0.11, 20, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected || live ? 0.7 : 0.25} opacity={ended ? 0.45 : 1} transparent={ended} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.07, 0.4, 14]} />
          <meshStandardMaterial color={color} opacity={ended ? 0.45 : 1} transparent={ended} />
        </mesh>
        {(hover || selected) && (
          <Html position={[0, 0.8, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="pin-label">{f.title}</div>
          </Html>
        )}
      </group>
    </group>
    </>
  )
}

export default function Jeju3D({ festivals, selectedId, onSelect }) {
  const spots = useMemo(() => spreadPins(festivals), [festivals])
  return (
    <Canvas camera={{ position: [0, 8, 6], fov: 45 }} dpr={[1, 2]} onPointerMissed={() => onSelect(null)}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 4]} intensity={1.3} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#1c4f86" roughness={0.4} metalness={0.2} />
      </mesh>

      <Island />
      <Hallasan />
      {festivals.map((f) => (
        <Pin key={f.id} festival={f} at={spots[f.id]} selected={f.id === selectedId} onSelect={onSelect} />
      ))}

      {/* 휠 확대는 끈다: 지도 위에서 페이지 스크롤이 막히는 걸 방지 */}
      <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.15} />
    </Canvas>
  )
}
