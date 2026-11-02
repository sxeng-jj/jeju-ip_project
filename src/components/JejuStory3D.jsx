import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Button } from 'react-bootstrap'
import {
  CHAPTERS, END, HANG, RY, SKY, T_BUBBLE, T_FALL, T_POP, WALLS, X_END,
  cameraAt, chapterAt, charHopAt, pop, rotZAt, smooth, squashAt, waveAngle, xAt, yAt,
} from '../lib/story'

// ── 공통 도구 ────────────────────────────────────────────────
// 시간(초)을 담은 ref 를 모든 장면 요소가 함께 읽는다. 값이 바뀌어도 다시 그리지 않고 프레임마다 읽기만 한다.
const TimeCtx = createContext({ current: 0 })
const useTime = () => useContext(TimeCtx)

// 매번 같은 모양이 나오도록 씨앗이 있는 난수
const rng = (seed) => {
  let s = (seed % 2147483647) || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const Flat = ({ color, ...p }) => <meshStandardMaterial color={color} flatShading roughness={0.9} {...p} />

// 두 점을 잇는 가는 막대 (나뭇가지, 줄)
function Seg({ from, to, r = 0.05, color = '#6b4a2b' }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    const len = dir.length()
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat, len }
  }, [from.join(), to.join()]) // eslint-disable-line
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 6]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// ── 시간표와 카메라·하늘 ─────────────────────────────────────
// 가장 먼저 그려져야 해서 장면의 첫 자식으로 둔다. 시간을 한 프레임 앞으로 보낸다.
function Clock({ playing }) {
  const T = useTime()
  useFrame((_, dt) => {
    if (playing) T.current += Math.min(dt, 0.05) // 탭을 다녀온 뒤 시간이 한꺼번에 튀지 않게 상한을 둔다
  })
  return null
}

const SKY_KEYS = SKY.map(([x, hex]) => [x, new THREE.Color(hex)])
function skyColor(x, out) {
  if (x <= SKY_KEYS[0][0]) return out.copy(SKY_KEYS[0][1])
  for (let i = 1; i < SKY_KEYS.length; i++) {
    if (x <= SKY_KEYS[i][0]) {
      const [x0, c0] = SKY_KEYS[i - 1]
      const [x1, c1] = SKY_KEYS[i]
      return out.copy(c0).lerp(c1, (x - x0) / (x1 - x0))
    }
  }
  return out.copy(SKY_KEYS.at(-1)[1])
}

// 귤을 따라가는 카메라 + 풍경에 따라 바뀌는 하늘색과 안개(멀리 있는 것이 하늘에 녹아들게)
function Rig() {
  const T = useTime()
  const { camera, scene, size } = useThree()
  const bg = useMemo(() => new THREE.Color(), [])
  useEffect(() => {
    scene.background = bg
    scene.fog = new THREE.Fog(bg, 40, 130)
    return () => { scene.background = null; scene.fog = null }
  }, [scene, bg])

  useFrame(() => {
    const t = T.current
    const aspect = size.width / size.height
    const c = cameraAt(t, aspect)
    camera.position.set(c.px, c.py, c.pz)
    camera.lookAt(c.lx, c.ly, 0)
    const fov = aspect < 1.4 ? 46 : 40 // 좁은 화면은 시야를 넓힌다
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix() }
    skyColor(xAt(t), bg)
    scene.fog.color.copy(bg)
  })
  return null
}

// ── 땅 ───────────────────────────────────────────────────────
const GRASS = [[-12, '#7dbb58'], [12, '#74b45b'], [26, '#5fa76a'], [38, '#a4cf6c'], [50, '#8cc46a'], [70, '#9bd078']]
  .map(([x, hex]) => [x, new THREE.Color(hex)])
const SAND = new THREE.Color('#f0dca8')
const SAND_DARK = new THREE.Color('#e3c98c')
const SEA = new THREE.Color('#3fbfd0')
const EARTH = new THREE.Color('#d9be8c')
const sm = (a, b, x) => smooth(a, b, x)

// 색을 정점마다 칠해 풍경이 이어지게 한다: 풀밭 → 한라산 초록 → 축제 마당 → 바닷가 모래와 바다 → 도착 광장
function groundColor(x, z, c) {
  c.copy(GRASS.at(-1)[1])
  for (let i = 1; i < GRASS.length; i++) {
    if (x <= GRASS[i][0]) { c.copy(GRASS[i - 1][1]).lerp(GRASS[i][1], (x - GRASS[i - 1][0]) / (GRASS[i][0] - GRASS[i - 1][0])); break }
  }
  if (x <= GRASS[0][0]) c.copy(GRASS[0][1])
  const shore = -3.2
  const coastW = sm(46, 49, x)
  const sea = coastW * (1 - sm(shore - 0.5, shore + 0.5, z)) // 뒤쪽은 바다
  const sandW = coastW * (1 - sm(62, 66, x)) * (1 - sea) * (1 - sm(4, 7.5, z)) // 길 쪽은 모래
  c.lerp(SAND, sandW)
  c.lerp(SEA, sea)
  const path = 1 - sm(0.7, 1.15, Math.abs(z)) // 귤이 구르는 길
  c.lerp(sandW > 0.5 ? SAND_DARK : EARTH, path * 0.75 * (1 - sea))
  return c
}

const Ground = memo(function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(100, 52, 100, 52)
    g.rotateX(-Math.PI / 2)
    g.translate(38, 0, -14) // x: -12~88, z: -40~12
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      groundColor(pos.getX(i), pos.getZ(i), c)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [])
  // 아주 먼 곳(z -100~-40): 칸을 성기게 깔아 수평선까지 이어지게 한다
  const far = useMemo(() => {
    const g = new THREE.PlaneGeometry(100, 60, 50, 1)
    g.rotateX(-Math.PI / 2)
    g.translate(38, -0.02, -70)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      groundColor(pos.getX(i), -50, c)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [])
  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <mesh geometry={far}>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
    </group>
  )
})

// ── 귤나무와 과수원 ──────────────────────────────────────────
const Tree = memo(function Tree({ x, z, s = 1, seed = 1, fruit = 8 }) {
  const fruits = useMemo(() => {
    const r = rng(seed * 97 + 13)
    return Array.from({ length: fruit }, () => {
      const th = r() * Math.PI * 2
      const ph = Math.acos(0.1 + r() * 0.85)
      return [Math.sin(ph) * Math.cos(th) * 1.32, 2.5 + Math.cos(ph) * 1.1, Math.sin(ph) * Math.sin(th) * 1.32]
    })
  }, [seed, fruit])
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.15, 0.22, 1.8, 7]} />
        <Flat color="#7a5230" />
      </mesh>
      <mesh position={[0, 2.5, 0]} scale={[1.05, 0.85, 1.05]}>
        <icosahedronGeometry args={[1.4, 1]} />
        <Flat color="#3f9b54" />
      </mesh>
      <mesh position={[0.7, 2.9, 0.2]}>
        <icosahedronGeometry args={[0.85, 1]} />
        <Flat color="#4aa85e" />
      </mesh>
      {fruits.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial color="#f58a1f" roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
})

const ORCHARD = [
  [-3.5, -3.2, 1.0], [-1, -5.5, 1.2], [5.8, -3.4, 1.1], [7.6, -6, 1.3], [9.6, -3.0, 0.95], [11.6, -5.2, 1.15], [-5.5, -6.5, 1.2], [13.5, -3.4, 1.0],
]

const Orchard = memo(function Orchard() {
  return (
    <group>
      {/* 귤이 열려 있는 나무: 가지 끝에서 귤 하나가 떨어진다 */}
      <Tree x={2.0} z={-1.9} s={1.15} seed={3} fruit={9} />
      <Seg from={[2.2, 3.0, -1.4]} to={[2.6, 3.28, -0.12]} r={0.05} />
      <Seg from={[HANG.x, HANG.y + 0.34, -0.1]} to={[2.6, 3.28, -0.12]} r={0.025} color="#5c7a3a" />
      {ORCHARD.map(([x, z, s], i) => <Tree key={i} x={x} z={z} s={s} seed={i + 11} fruit={7} />)}
    </group>
  )
})

// ── 한라산·오름·유채꽃·돌담 ──────────────────────────────────
const Mountain = memo(function Mountain({ x, z, r, h, color = '#4f9d6a', snow = true }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <coneGeometry args={[r, h, 9]} />
        <Flat color={color} />
      </mesh>
      {snow && (
        <mesh position={[0, h * 0.9, 0]}>
          <coneGeometry args={[r * 0.22, h * 0.2, 9]} />
          <Flat color="#f8faf5" />
        </mesh>
      )}
    </group>
  )
})

const Oreum = memo(function Oreum({ x, z, r, sy = 0.7, color }) {
  return (
    <mesh position={[x, 0, z]} scale={[1, sy, 1]}>
      <sphereGeometry args={[r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <Flat color={color} />
    </mesh>
  )
})

// 같은 모양 수백 개를 한 번에 그리는 꽃밭 (유채꽃)
const Flowers = memo(function Flowers({ x0, x1, z0, z1, count, color }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const r = rng(7)
    const o = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      o.position.set(x0 + (x1 - x0) * r(), 0.13, z0 + (z1 - z0) * r())
      o.scale.setScalar(0.7 + r() * 0.7)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [x0, x1, z0, z1, count])
  return (
    <instancedMesh ref={ref} args={[null, null, count]}>
      <sphereGeometry args={[0.1, 6, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
    </instancedMesh>
  )
})

// 제주 돌담: 검은 돌을 어긋나게 쌓은 낮은 담
const StoneWall = memo(function StoneWall({ x0, x1, z, h = 0.5 }) {
  const stones = useMemo(() => {
    const r = rng(Math.round(x0 * 31 + z * 7))
    const out = []
    for (let x = x0; x < x1; x += 0.52) out.push({ x: x + r() * 0.08, w: 0.5 + r() * 0.14, h: h * (0.65 + r() * 0.5), c: r() < 0.5 ? '#3b3d40' : '#4a4c50' })
    return out
  }, [x0, x1, z, h])
  return (
    <group position={[0, 0, z]}>
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2, 0]}>
          <boxGeometry args={[s.w, s.h, 0.5]} />
          <Flat color={s.c} />
        </mesh>
      ))}
    </group>
  )
})

// 길을 가로지르는 낮은 돌담: 귤이 폴짝 뛰어넘는다
const HopWall = memo(function HopWall({ x }) {
  return (
    <group position={[x, 0, 0]}>
      {[-0.9, -0.3, 0.3, 0.9].map((z, i) => (
        <mesh key={i} position={[0, 0.2, z]} rotation={[0, (i - 1.5) * 0.06, 0]}>
          <boxGeometry args={[0.5, 0.4 + (i % 2) * 0.04, 0.62]} />
          <Flat color={i % 2 ? '#3b3d40' : '#4a4c50'} />
        </mesh>
      ))}
    </group>
  )
})

const Highland = memo(function Highland() {
  return (
    <group>
      <Mountain x={26} z={-27} r={14} h={11} />
      <Mountain x={10} z={-24} r={7} h={5} color="#5aa56d" snow={false} />
      <Mountain x={40} z={-25} r={8} h={5.5} color="#5aa56d" snow={false} />
      <Oreum x={14} z={-9} r={3.4} sy={0.8} color="#68b070" />
      <Oreum x={19.5} z={-12} r={4.8} sy={0.95} color="#5fa86a" />
      <Oreum x={25} z={-8} r={3} sy={0.7} color="#74b878" />
      <Oreum x={30.5} z={-11} r={4.2} sy={0.9} color="#62ab6c" />
      <Flowers x0={13} x1={31} z0={-6.2} z1={-2.7} count={170} color="#ffd23f" />
      <StoneWall x0={13.5} x1={31} z={-2.35} />
      <HopWall x={WALLS[0]} />
    </group>
  )
})

// ── 축제 마당 ────────────────────────────────────────────────
// 거리 때문에 글자가 겹치지 않도록, 귤이 가까이 왔을 때만 간판 글씨가 또렷해진다.
function Sign({ x, z, label }) {
  const T = useTime()
  const el = useRef()
  useFrame(() => {
    if (!el.current) return
    const d = Math.abs(xAt(T.current) - x)
    el.current.style.opacity = String(1 - sm(5, 11, d))
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[-0.95, 0.9, 0]}><cylinderGeometry args={[0.07, 0.07, 1.8, 6]} /><Flat color="#7a5230" /></mesh>
      <mesh position={[0.95, 0.9, 0]}><cylinderGeometry args={[0.07, 0.07, 1.8, 6]} /><Flat color="#7a5230" /></mesh>
      <mesh position={[0, 1.7, 0]}><boxGeometry args={[2.3, 0.75, 0.1]} /><Flat color="#c2924f" /></mesh>
      <Html position={[0, 1.7, 0.12]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
        <span ref={el} className="story-sign">{label}</span>
      </Html>
    </group>
  )
}

// 깃발 줄: 바람에 흔들리는 삼각 깃발
function Flags({ x0, x1, z, step = 2.2 }) {
  const T = useTime()
  const refs = useRef([])
  const items = useMemo(() => {
    const out = []
    const colors = ['#ff6b4a', '#ffb02e', '#2f8f55', '#15869a', '#ff7aa8']
    for (let x = x0, i = 0; x <= x1; x += step, i++) out.push({ x, c: colors[i % colors.length] })
    return out
  }, [x0, x1, step])
  useFrame(() => {
    const t = T.current
    refs.current.forEach((g, i) => { if (g) g.rotation.y = Math.sin(t * 3 + i * 1.3) * 0.28 })
  })
  return (
    <group position={[0, 0, z]}>
      {items.map((it, i) => (
        <group key={i} position={[it.x, 0, 0]}>
          <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.04, 0.04, 3.2, 6]} /><Flat color="#d8d4c8" /></mesh>
          <group ref={(g) => (refs.current[i] = g)} position={[0, 2.85, 0]}>
            <mesh position={[0.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <circleGeometry args={[0.36, 3]} />
              <meshStandardMaterial color={it.c} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

// 길을 가로지르는 등불 줄
const LanternString = memo(function LanternString({ x }) {
  const lanterns = useMemo(() => {
    const colors = ['#ff6b4a', '#ffb02e', '#ff7aa8']
    return Array.from({ length: 9 }, (_, i) => {
      const s = i / 8
      return { z: -3.3 + 6.6 * s, y: 3.9 - 0.75 * (1 - (2 * s - 1) ** 2), c: colors[i % 3] }
    })
  }, [])
  return (
    <group position={[x, 0, 0]}>
      {[-3.3, 3.3].map((z) => (
        <mesh key={z} position={[0, 2, z]}><cylinderGeometry args={[0.06, 0.06, 4, 6]} /><Flat color="#7a5230" /></mesh>
      ))}
      {lanterns.slice(1).map((l, i) => (
        <Seg key={i} from={[0, lanterns[i].y, lanterns[i].z]} to={[0, l.y, l.z]} r={0.012} color="#3a2a1a" />
      ))}
      {lanterns.map((l, i) => (
        <mesh key={i} position={[0, l.y - 0.22, l.z]} scale={[0.85, 1.1, 0.85]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color={l.c} emissive={l.c} emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  )
})

const Tent = memo(function Tent({ x, z, color }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[2.2, 1.0, 2.2]} /><Flat color="#fbf6ea" /></mesh>
      <mesh position={[0, 1.65, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.85, 1.3, 4]} /><Flat color={color} /></mesh>
    </group>
  )
})

// 둥실 떠 있는 풍선
function Balloons() {
  const T = useTime()
  const refs = useRef([])
  const items = useMemo(() => {
    const r = rng(5)
    const colors = ['#ff6b4a', '#ffb02e', '#ff7aa8', '#2fa7c0', '#8bd26a', '#b58cff']
    return Array.from({ length: 10 }, (_, i) => ({ x: 33 + r() * 14, y: 3.2 + r() * 2.2, z: -4.5 + r() * 2.6, c: colors[i % colors.length], p: r() * 6 }))
  }, [])
  useFrame(() => {
    const t = T.current
    refs.current.forEach((g, i) => { if (g) g.position.y = items[i].y + Math.sin(t * 1.2 + items[i].p) * 0.15 })
  })
  return (
    <group>
      {items.map((b, i) => (
        <group key={i} ref={(g) => (refs.current[i] = g)} position={[b.x, b.y, b.z]}>
          <mesh scale={[1, 1.15, 1]}><sphereGeometry args={[0.36, 14, 14]} /><meshStandardMaterial color={b.c} roughness={0.35} /></mesh>
          <mesh position={[0, -1.0, 0]}><cylinderGeometry args={[0.008, 0.008, 1.3, 4]} /><meshBasicMaterial color="#6b6b6b" /></mesh>
        </group>
      ))}
    </group>
  )
}

// 들불축제를 떠올리는 모닥불: 깜빡이는 불꽃과 불빛
function Bonfire({ x, z }) {
  const T = useTime()
  const flames = useRef([])
  const light = useRef()
  useFrame(() => {
    const t = T.current
    flames.current.forEach((m, i) => { if (m) m.scale.set(1, 1 + 0.28 * Math.sin(t * 14 + i * 2.1), 1) })
    if (light.current) light.current.intensity = 7 + Math.sin(t * 17) * 1.6
  })
  const F = [[0, 0.8, 0, 0.42, 1.3, '#ff8a1f'], [0.18, 0.6, 0.1, 0.28, 0.9, '#ffd23f'], [-0.2, 0.55, -0.08, 0.3, 0.85, '#ff5a2a']]
  return (
    <group position={[x, 0, z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, (i * Math.PI) / 3]}><cylinderGeometry args={[0.1, 0.1, 1.3, 6]} /><Flat color="#5a3a1f" /></mesh>
      ))}
      {F.map(([fx, fy, fz, r, h, c], i) => (
        <mesh key={i} ref={(m) => (flames.current[i] = m)} position={[fx, fy, fz]}>
          <coneGeometry args={[r, h, 8]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.2} />
        </mesh>
      ))}
      <pointLight ref={light} position={[0, 1.2, 0.4]} color="#ff9a3c" intensity={7} distance={9} />
    </group>
  )
}

// 돌하르방: 귤이 가까이 지나가면 신나서 들썩인다
function Hareubang({ x, z, s = 1 }) {
  const T = useTime()
  const ref = useRef()
  useFrame(() => {
    const t = T.current
    const near = 1 - sm(1.5, 3.5, Math.abs(xAt(t) - x))
    if (ref.current) ref.current.position.y = near * Math.abs(Math.sin(t * 7)) * 0.14
  })
  const stone = <Flat color="#76797c" roughness={1} />
  const dark = <meshStandardMaterial color="#2b2d2f" roughness={0.9} />
  return (
    <group position={[x, 0, z]} scale={s}>
      <group ref={ref}>
        <mesh position={[0, 0.75, 0]}><capsuleGeometry args={[0.42, 0.7, 6, 16]} />{stone}</mesh>
        {[-1, 1].map((k) => (
          <group key={k}>
            <mesh position={[k * 0.4, 0.9, 0.12]} rotation={[0.2, 0, k * -0.35]}><capsuleGeometry args={[0.09, 0.42, 4, 8]} />{stone}</mesh>
            <mesh position={[k * 0.17, 0.66, 0.4]}><sphereGeometry args={[0.12, 12, 12]} />{stone}</mesh>
            <mesh position={[k * 0.16, 1.84, 0.34]} scale={[1, 1.1, 0.6]}><sphereGeometry args={[0.085, 12, 12]} />{dark}</mesh>
          </group>
        ))}
        <mesh position={[0, 1.8, 0]} scale={[1, 1.05, 1]}><sphereGeometry args={[0.4, 20, 20]} />{stone}</mesh>
        <mesh position={[0, 1.72, 0.4]}><boxGeometry args={[0.1, 0.2, 0.1]} />{stone}</mesh>
        <mesh position={[0, 1.57, 0.37]}><boxGeometry args={[0.26, 0.035, 0.05]} />{dark}</mesh>
        <mesh position={[0, 2.05, 0]}><cylinderGeometry args={[0.62, 0.62, 0.07, 24]} />{stone}</mesh>
        <mesh position={[0, 2.2, 0]} scale={[1, 0.75, 1]}><sphereGeometry args={[0.36, 20, 20]} />{stone}</mesh>
      </group>
    </group>
  )
}

const Festival = memo(function Festival() {
  return (
    <group>
      <Flags x0={32} x1={48} z={-2.8} />
      <LanternString x={35.5} />
      <LanternString x={41} />
      <Tent x={34} z={-6.5} color="#f08a17" />
      <Tent x={38.5} z={-7.2} color="#2f8f55" />
      <Tent x={44} z={-6.6} color="#e8537a" />
      <Sign x={34.5} z={-4.2} label="들불축제" />
      <Sign x={39.5} z={-4.4} label="탐라문화제" />
      <Sign x={44.3} z={-4.2} label="서귀포칠십리축제" />
      <Balloons />
      <Bonfire x={46.8} z={-1.6} />
      <Hareubang x={38.2} z={-1.5} s={0.9} />
    </group>
  )
})

// ── 바다·해안 ────────────────────────────────────────────────
function Foam() {
  const T = useTime()
  const refs = useRef([])
  useFrame(() => {
    const t = T.current
    refs.current.forEach((m, i) => {
      if (!m) return
      m.position.z = -3.9 - ((t * 0.5 + i * 0.37) % 1) * 5 // 파도가 바다 쪽에서 해안으로 밀려오듯
      m.material.opacity = 0.55 * (1 - ((t * 0.5 + i * 0.37) % 1))
    })
  })
  return (
    <group>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} position={[66, 0.04, -4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[40, 0.16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function Boat({ x, z, p = 0 }) {
  const T = useTime()
  const ref = useRef()
  useFrame(() => {
    const t = T.current
    if (ref.current) { ref.current.position.y = Math.sin(t * 1.3 + p) * 0.08; ref.current.rotation.z = Math.sin(t * 1.1 + p) * 0.05 }
  })
  return (
    <group position={[x, 0.05, z]}>
      <group ref={ref}>
        <mesh position={[0, 0.2, 0]}><boxGeometry args={[2.2, 0.4, 0.8]} /><Flat color="#e8e2d2" /></mesh>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[2.2, 0.08, 0.84]} /><Flat color="#f08a17" /></mesh>
        <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.04, 0.04, 2.0, 6]} /><Flat color="#7a5230" /></mesh>
        <mesh position={[0.45, 1.35, 0]} rotation={[0, 0, 0]}><circleGeometry args={[0.9, 3]} /><meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  )
}

function Gulls() {
  const T = useTime()
  const refs = useRef([])
  const wings = useRef([])
  useFrame(() => {
    const t = T.current
    refs.current.forEach((g, i) => {
      if (!g) return
      g.position.set(56 + Math.cos(t * 0.45 + i * 2.1) * 5, 5.2 + i * 0.5 + Math.sin(t * 0.9 + i) * 0.25, -9 - i * 1.2)
      g.rotation.y = -Math.sin(t * 0.45 + i * 2.1) * 0.6 + Math.PI / 2
    })
    wings.current.forEach((w, i) => { if (w) w.rotation.z = Math.sin(t * 7 + i * 1.7) * 0.5 * (i % 2 ? -1 : 1) })
  })
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(g) => (refs.current[i] = g)}>
          <mesh ref={(m) => (wings.current[i * 2] = m)} position={[-0.3, 0, 0]}><boxGeometry args={[0.6, 0.03, 0.14]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <mesh ref={(m) => (wings.current[i * 2 + 1] = m)} position={[0.3, 0, 0]}><boxGeometry args={[0.6, 0.03, 0.14]} /><meshBasicMaterial color="#ffffff" /></mesh>
        </group>
      ))}
    </group>
  )
}

const Coast = memo(function Coast() {
  const rocks = useMemo(() => {
    const r = rng(21)
    return Array.from({ length: 14 }, () => ({ x: 50 + r() * 17, z: -3.4 - r() * 1.4, s: 0.35 + r() * 0.55, c: r() < 0.5 ? '#3b3d40' : '#55585c' }))
  }, [])
  return (
    <group>
      {rocks.map((k, i) => (
        <mesh key={i} position={[k.x, k.s * 0.45, k.z]} scale={[k.s * 1.3, k.s, k.s]} rotation={[0, i, 0]}>
          <dodecahedronGeometry args={[1, 0]} />
          <Flat color={k.c} />
        </mesh>
      ))}
      {/* 성산일출봉을 닮은 멀리 있는 분화구 모양 산 */}
      <group position={[72, 0, -27]}>
        <mesh position={[0, 3, 0]}><cylinderGeometry args={[4.6, 9.5, 6, 12]} /><Flat color="#7f8a66" /></mesh>
        <mesh position={[0, 6.05, 0]}><cylinderGeometry args={[4.5, 4.5, 0.3, 12]} /><Flat color="#5fa563" /></mesh>
      </group>
      <HopWall x={WALLS[1]} />
      <Foam />
      <Boat x={56} z={-10} p={0} />
      <Boat x={62} z={-15} p={2} />
      <Gulls />
    </group>
  )
})

// ── 도착 광장 ────────────────────────────────────────────────
const Finale = memo(function Finale() {
  return (
    <group>
      <mesh position={[X_END, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.7, 40]} />
        <meshStandardMaterial color="#e8d9b5" />
      </mesh>
      <mesh position={[X_END, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 40]} />
        <meshStandardMaterial color="#f7ecd0" />
      </mesh>
      <Tree x={63.3} z={-3.4} s={1.1} seed={31} fruit={10} />
      <Tree x={71.2} z={-3.8} s={1.2} seed={32} fruit={10} />
      <Tree x={67.5} z={-7} s={1.35} seed={33} fruit={12} />
      <Flags x0={63.6} x1={71} z={-1.8} step={7.2} />
      <Hareubang x={63.4} z={-1.6} s={0.85} />
      <Hareubang x={70.6} z={-1.6} s={0.85} />
    </group>
  )
})

// ── 구름 ─────────────────────────────────────────────────────
const Clouds = memo(function Clouds() {
  const items = useMemo(() => {
    const r = rng(9)
    return Array.from({ length: 16 }, (_, i) => ({ x: -8 + i * 5.4 + r() * 3, y: 7 + r() * 3, z: -16 - r() * 14, s: 1 + r() * 1.2 }))
  }, [])
  return (
    <group>
      {items.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[[0, 0, 1.2], [1.3, -0.15, 0.9], [-1.3, -0.2, 0.85], [0.5, 0.45, 0.8]].map(([x, y, r], k) => (
            <mesh key={k} position={[x, y, 0]}><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.35} flatShading /></mesh>
          ))}
        </group>
      ))}
    </group>
  )
})

// ── 주인공: 귤 → 캐릭터 ──────────────────────────────────────
// 굴러가는 동안은 평범한 귤이고, 도착해서 변신하면 같은 몸에 얼굴·팔다리가 '뿅' 하고 나타난다.
function Hero() {
  const T = useTime()
  const root = useRef()
  const squash = useRef()
  const roll = useRef()
  const leaf = useRef()
  const face = useRef()
  const eyes = useRef([])
  const armL = useRef()
  const armR = useRef()
  const legs = useRef([])
  const bubble = useRef()

  useFrame(() => {
    const t = T.current
    const sq = squashAt(t)
    const onGround = t >= T_FALL ? 1 : 0
    const hop = t >= T_POP ? charHopAt(t) : 0
    // 찌그러질 때 발이 땅에서 뜨지 않도록 높이를 보정한다
    root.current.position.set(xAt(t), yAt(t) + hop - RY * (1 - sq.sy) * onGround, 0)
    squash.current.scale.set(sq.sx, sq.sy, sq.sx)

    // 매달려 있을 때는 곧 떨어질 듯 달랑달랑 흔들린다
    const wobble = t < T_FALL ? Math.sin(t * 16) * 0.13 * smooth(0.3, 1.3, t) : 0
    roll.current.rotation.z = rotZAt(t) + wobble

    const p = pop((t - T_POP) / 0.9)
    leaf.current.scale.setScalar(1 + 0.7 * Math.min(p, 1.2))
    face.current.scale.setScalar(Math.max(p, 0.0001))
    armL.current.scale.setScalar(Math.max(p, 0.0001))
    armR.current.scale.setScalar(Math.max(p, 0.0001))
    legs.current.forEach((l) => l && l.scale.setScalar(Math.max(p, 0.0001)))
    armR.current.rotation.z = 2.5 + waveAngle(t) * 1.3 // 오른팔을 번쩍 들어 흔든다
    armL.current.rotation.z = -0.55 + Math.sin(t * 2.2) * 0.04 * p
    const blink = (t * 0.9) % 3.2 < 0.12 ? 0.12 : 1
    eyes.current.forEach((e) => e && e.scale.set(1, 1.2 * blink, 0.55))

    if (bubble.current) {
      const k = smooth(T_BUBBLE, T_BUBBLE + 0.5, t)
      bubble.current.style.opacity = String(k)
      bubble.current.style.transform = `translateY(${(1 - k) * 8}px) scale(${0.9 + 0.1 * k})`
    }
  })

  return (
    <group ref={root}>
      <group ref={squash}>
        {/* 몸통과 꼭지·잎: 굴러갈 때 같이 돈다 */}
        <group ref={roll}>
          <mesh scale={[1, 0.9, 1]}>
            <sphereGeometry args={[0.45, 28, 28]} />
            <meshStandardMaterial color="#f58a1f" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.035, 0.045, 0.12, 8]} />
            <meshStandardMaterial color="#5c7a3a" />
          </mesh>
          <mesh ref={leaf} position={[0.14, 0.43, 0]} rotation={[0, 0, -0.35]} scale={[1, 0.16, 0.55]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color="#3f9b54" roughness={0.7} />
          </mesh>
        </group>

        {/* 얼굴: 변신할 때 나타난다 */}
        <group ref={face} position={[0, 0.02, 0]}>
          {[-1, 1].map((k, i) => (
            <group key={k}>
              <mesh ref={(m) => (eyes.current[i] = m)} position={[k * 0.15, 0.1, 0.39]} scale={[1, 1.2, 0.55]}>
                <sphereGeometry args={[0.062, 12, 12]} />
                <meshStandardMaterial color="#2a1a10" roughness={0.4} />
              </mesh>
              <mesh position={[k * 0.15 + 0.02, 0.135, 0.425]}><sphereGeometry args={[0.018, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
              <mesh position={[k * 0.27, -0.03, 0.34]} rotation={[0, k * 0.5, 0]}>
                <circleGeometry args={[0.07, 16]} />
                <meshBasicMaterial color="#ff7a8a" transparent opacity={0.65} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, -0.02, 0.405]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.085, 0.018, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#7a2a18" />
          </mesh>
        </group>

        {/* 팔: 어깨 축에서 돌린다 */}
        <group ref={armL} position={[-0.43, 0.02, 0]}>
          <mesh position={[0, -0.17, 0]}><capsuleGeometry args={[0.055, 0.22, 4, 8]} /><meshStandardMaterial color="#f58a1f" roughness={0.5} /></mesh>
        </group>
        <group ref={armR} position={[0.43, 0.02, 0]}>
          <mesh position={[0, -0.17, 0]}><capsuleGeometry args={[0.055, 0.22, 4, 8]} /><meshStandardMaterial color="#f58a1f" roughness={0.5} /></mesh>
        </group>
        {/* 다리와 신발 */}
        {[-1, 1].map((k, i) => (
          <group key={k} ref={(g) => (legs.current[i] = g)} position={[k * 0.16, -0.36, 0.02]}>
            <mesh position={[0, -0.04, 0]}><capsuleGeometry args={[0.05, 0.08, 4, 8]} /><meshStandardMaterial color="#f58a1f" roughness={0.5} /></mesh>
            <mesh position={[0, -0.14, 0.04]} scale={[1, 0.55, 1.5]}><sphereGeometry args={[0.075, 10, 10]} /><meshStandardMaterial color="#8b5a2b" roughness={0.7} /></mesh>
          </group>
        ))}
      </group>

      <Html position={[0, 1.15, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={bubble} className="story-bubble" style={{ opacity: 0 }}>제주에 온 걸<br />환영해요!</div>
      </Html>
    </group>
  )
}

// 변신 순간의 반짝임과 색종이
function Burst() {
  const T = useTime()
  const refs = useRef([])
  const dirs = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2
    return [Math.cos(a), Math.sin(a) * 0.9, Math.sin(i * 1.7) * 0.4]
  }), [])
  useFrame(() => {
    const u = (T.current - T_POP) / 0.8
    refs.current.forEach((m, i) => {
      if (!m) return
      if (u <= 0 || u >= 1) { m.visible = false; return }
      m.visible = true
      const e = 1 - (1 - u) ** 3
      m.position.set(X_END + dirs[i][0] * 1.9 * e, 1.0 + dirs[i][1] * 1.7 * e, dirs[i][2] * 1.5 * e)
      m.scale.setScalar(0.16 * (1 - u))
      m.rotation.set(u * 6, u * 5, 0)
    })
  })
  return (
    <group>
      {dirs.map((_, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} visible={false}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#fff3b0" emissive="#ffd23f" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  )
}

function Confetti({ hidden }) {
  const T = useTime()
  const ref = useRef()
  const N = 90
  const data = useMemo(() => {
    const r = rng(77)
    const palette = ['#f58a1f', '#2f8f55', '#ffd23f', '#15869a', '#ff7aa8', '#ffffff']
    return Array.from({ length: N }, (_, i) => {
      const a = r() * Math.PI * 2
      const sp = 1.6 + r() * 3.4
      return { vx: Math.cos(a) * sp, vy: 3.5 + r() * 3.5, vz: Math.sin(a) * sp * 0.5, spin: 3 + r() * 9, c: new THREE.Color(palette[i % palette.length]) }
    })
  }, [])
  useLayoutEffect(() => {
    data.forEach((d, i) => ref.current.setColorAt(i, d.c))
    ref.current.instanceColor.needsUpdate = true
  }, [data])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    const u = T.current - (T_POP + 0.05)
    data.forEach((d, i) => {
      if (hidden || u <= 0) { o.scale.setScalar(0); o.position.set(0, -5, 0) } else {
        const tt = Math.min(u, 6)
        let y = 1.1 + d.vy * tt - 0.5 * 7 * tt * tt
        const grounded = y <= 0.05 // 땅에 닿으면 그 자리에 눕는다
        y = Math.max(y, 0.05)
        o.position.set(X_END + d.vx * Math.min(tt, 1.2), y, d.vz * Math.min(tt, 1.2))
        o.rotation.set(grounded ? 1.5 : d.spin * tt, grounded ? i : d.spin * tt * 0.7, 0)
        o.scale.setScalar(1)
      }
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, N]} frustumCulled={false}>
      <boxGeometry args={[0.12, 0.04, 0.2]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  )
}

// ── 장면 전체 ────────────────────────────────────────────────
// 지금 어느 풍경인지, 줄거리가 끝났는지 바깥에 알린다 (바뀔 때만)
function Tell({ seen, onChapter, onDone }) {
  const T = useTime()
  useFrame(() => {
    const t = T.current
    const c = chapterAt(xAt(t))
    if (seen.current.chapter !== c) { seen.current.chapter = c; onChapter(c) }
    const d = t >= END
    if (seen.current.done !== d) { seen.current.done = d; onDone(d) }
  })
  return null
}

function Scene({ frozen, playing, restart, skip, startAt = 0, onChapter, onDone }) {
  const T = useRef(frozen ? END : startAt)
  const seen = useRef({ restart, skip, chapter: -1, done: null })

  // 다시 보기 / 건너뛰기 요청 (처음 마운트될 때는 무시)
  useEffect(() => {
    if (seen.current.restart !== restart) { seen.current.restart = restart; T.current = 0 }
  }, [restart])
  useEffect(() => {
    if (seen.current.skip !== skip) { seen.current.skip = skip; T.current = Math.max(T.current, END) }
  }, [skip])

  return (
    <TimeCtx.Provider value={T}>
      <Clock playing={playing} />
      <Rig />
      <Tell seen={seen} onChapter={onChapter} onDone={onDone} />
      <ambientLight intensity={1.05} />
      <hemisphereLight args={['#ffffff', '#8cc07a', 0.55]} />
      <directionalLight position={[12, 16, 10]} intensity={2.1} />

      <Ground />
      <Clouds />
      <Orchard />
      <Highland />
      <Festival />
      <Coast />
      <Finale />
      <Burst />
      <Confetti hidden={frozen} />
      <Hero />
    </TimeCtx.Provider>
  )
}

// 캔버스는 바뀌지 않는 값만 받는 memo 로 감싸서, 장면 이름표가 바뀔 때마다 3D 가 다시 구성되지 않게 한다.
const StoryCanvas = memo(function StoryCanvas(props) {
  return (
    <Canvas camera={{ fov: 40, near: 0.1, far: 200, position: [3, 2.5, 5.4] }} dpr={[1, 1.75]}>
      <Scene {...props} />
    </Canvas>
  )
})

// 홈 첫 화면 애니메이션: 귤 한 알이 떨어져 제주를 굴러다니다 캐릭터가 되어 환영 인사를 한다.
// reduced: 움직임 줄이기 설정 → 처음에는 마지막 장면만 멈춰 보여주고, 버튼을 누를 때만 재생한다.
// autoplay=false 면 시간이 흐르지 않고 startAt 초에서 멈춘다(장면 점검용).
export default function JejuStory3D({ reduced = false, autoplay = true, startAt = 0 }) {
  const wrapRef = useRef(null)
  const [chapter, setChapter] = useState(0)
  const [done, setDone] = useState(false)
  const [restart, setRestart] = useState(0)
  const [skip, setSkip] = useState(0)
  const [userPlayed, setUserPlayed] = useState(false)
  const [visible, setVisible] = useState(true)
  const [pageShown, setPageShown] = useState(true)

  // 화면 밖이거나 다른 탭이면 시간이 흐르지 않게 멈춘다 (배터리 절약, 못 본 사이 영상이 끝나 버리지 않게)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 })
    io.observe(wrapRef.current)
    const onVis = () => setPageShown(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  const frozen = reduced && !userPlayed
  const playing = autoplay && visible && pageShown && !frozen
  const onChapter = useCallback((c) => setChapter(c), [])
  const onDone = useCallback((d) => setDone(d), [])

  const replay = () => { setUserPlayed(true); setRestart((n) => n + 1); setDone(false) }
  const c = CHAPTERS[chapter]

  return (
    <div ref={wrapRef} className="story" role="img" aria-label="귤 한 알이 나무에서 떨어져 한라산과 축제 마당, 바다를 지나 제주를 여행하고 캐릭터가 되어 환영 인사를 하는 애니메이션">
      <StoryCanvas frozen={frozen} playing={playing} restart={restart} skip={skip} onChapter={onChapter} onDone={onDone} startAt={startAt} />
      <div className="story-caption" role="status">
        <span className="me-1">{c.emoji}</span>{c.label}
      </div>
      <div className="story-controls">
        {!done && !frozen && (
          <Button size="sm" variant="light" onClick={() => setSkip((n) => n + 1)} aria-label="애니메이션 건너뛰기">
            <i className="bi bi-skip-forward-fill me-1" />건너뛰기
          </Button>
        )}
        {(done || frozen) && (
          <Button size="sm" variant="light" onClick={replay} aria-label="애니메이션 처음부터 다시 보기">
            <i className="bi bi-arrow-counterclockwise me-1" />{frozen ? '처음부터 보기' : '다시 보기'}
          </Button>
        )}
      </div>
    </div>
  )
}
