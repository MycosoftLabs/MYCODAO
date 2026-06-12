import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  MeshReflectorMaterial,
  OrbitControls,
  useTexture,
} from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { healthHex, type ThemeMode } from "./biobankUi";

export interface VaultTile {
  code: string;
  src: string;
  label?: string | null;
  health: string;
  category?: string | null;
}

interface BiobankVaultHeroProps {
  tiles: VaultTile[];
  onSelect?: (code: string) => void;
  onDeselect?: () => void;
  selectedCode?: string | null;
  focusRow?: number;
  theme?: ThemeMode;
  reducedMotion?: boolean;
}

interface SectionMeta {
  category: string;
  label: string;
  tempF: number;
  humidity: number;
  lumen: number;
  neon: string;
}

const SECTIONS: SectionMeta[] = [
  { category: "mushroom", label: "Mushrooms", tempF: 39, humidity: 88, lumen: 750, neon: "#ff8a3d" },
  { category: "lichen", label: "Lichen", tempF: 39, humidity: 80, lumen: 520, neon: "#36c5ff" },
  { category: "mold", label: "Mold", tempF: 39, humidity: 92, lumen: 140, neon: "#c061ff" },
  { category: "yeast", label: "Yeast", tempF: -4, humidity: 40, lumen: 40, neon: "#ffd23d" },
  { category: "other", label: "Other", tempF: -112, humidity: 15, lumen: 0, neon: "#ff5d73" },
];

const COLS = 4;
const ROWS = 5;
const SLOTS = COLS * ROWS;
const ROWS_DEEP = 5;
const ROW_GAP = 2.4;
const CAB_W = 2.4;
const CAB_H = 3.6;
const CAB_D = 1.2;
const CAB_GAP = 0.3;
const TOP_RESERVE = 1.15;

interface Palette {
  bg: string;
  floor: string;
  wall: string;
  steel: string;
  steelDark: string;
  drawer: string;
  emptyDrawer: string;
  screenBg: string;
  screenText: string;
  key: string;
  fixture: string;
}

function palette(theme: ThemeMode): Palette {
  return theme === "light"
    ? {
        bg: "#e7ebee",
        floor: "#c5ccd1",
        wall: "#dfe4e8",
        steel: "#cfd5da",
        steelDark: "#aab2b8",
        drawer: "#e9edf0",
        emptyDrawer: "#dde3e7",
        screenBg: "#0a1016",
        screenText: "#bfe2ff",
        key: "#ffffff",
        fixture: "#ffffff",
      }
    : {
        bg: "#0a0c0e",
        floor: "#0c0f12",
        wall: "#101418",
        steel: "#aab2b8",
        steelDark: "#5c656c",
        drawer: "#c4ccd1",
        emptyDrawer: "#8a939a",
        screenBg: "#05080b",
        screenText: "#bfe2ff",
        key: "#eaf3ff",
        fixture: "#ffffff",
      };
}

function makeTextTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

interface FilledSlot {
  tile: VaultTile;
  texIndex: number;
  lx: number;
  ly: number;
}
interface CabinetData extends SectionMeta {
  x: number;
  z: number;
  front: boolean;
  depth: number;
  filled: FilledSlot[];
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();

function useFacility(tiles: VaultTile[]) {
  return useMemo(() => {
    const byCat = new Map<string, VaultTile[]>();
    for (const t of tiles) {
      const c = (t.category || "other").toLowerCase();
      const key = SECTIONS.some((s) => s.category === c) ? c : "other";
      const arr = byCat.get(key) ?? [];
      arr.push(t);
      byCat.set(key, arr);
    }

    const srcs: string[] = [];
    const totalW = SECTIONS.length * CAB_W + (SECTIONS.length - 1) * CAB_GAP;
    const areaH = CAB_H - TOP_RESERVE - 0.25;
    const areaW = CAB_W - 0.24;
    const dw = areaW / COLS;
    const dh = areaH / ROWS;
    const top = CAB_H / 2 - TOP_RESERVE - dh / 2;

    const positions = new Map<string, [number, number, number]>();
    const emptyByRow: THREE.Matrix4[][] = Array.from({ length: ROWS_DEEP }, () => []);
    const cabinets: CabinetData[] = [];

    for (let d = 0; d < ROWS_DEEP; d++) {
      const z = -d * (CAB_D + ROW_GAP);
      SECTIONS.forEach((sec, i) => {
        const cabX = -totalW / 2 + CAB_W / 2 + i * (CAB_W + CAB_GAP);
        const list = d === 0 ? (byCat.get(sec.category) ?? []).slice(0, SLOTS) : [];
        const filled: FilledSlot[] = [];
        for (let s = 0; s < SLOTS; s++) {
          const col = s % COLS;
          const row = Math.floor(s / COLS);
          const lx = -areaW / 2 + dw / 2 + col * dw;
          const ly = top - row * dh;
          const tile = list[s];
          if (tile?.src) {
            const texIndex = srcs.length;
            srcs.push(tile.src);
            filled.push({ tile, texIndex, lx, ly });
            positions.set(tile.code, [cabX + lx, ly, z + CAB_D / 2 + 0.4]);
          } else {
            _p.set(cabX + lx, ly, z + CAB_D / 2 - 0.04);
            _m.compose(_p, _q, _s);
            emptyByRow[d].push(_m.clone());
          }
        }
        cabinets.push({ ...sec, x: cabX, z, front: d === 0, depth: d, filled });
      });
    }

    return { cabinets, srcs, emptyByRow, positions, dw, dh, areaW, top, totalW };
  }, [tiles]);
}

function InstancedEmpties({
  matrices,
  dw,
  dh,
  pal,
  visible,
}: {
  matrices: THREE.Matrix4[];
  dw: number;
  dh: number;
  pal: Palette;
  visible: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);
  if (!matrices.length) return null;
  return (
    <instancedMesh
      ref={ref}
      visible={visible}
      args={[undefined as never, undefined as never, matrices.length]}
      castShadow={false}
      receiveShadow
    >
      <boxGeometry args={[dw * 0.92, dh * 0.84, 0.3]} />
      <meshStandardMaterial color={pal.emptyDrawer} metalness={0.35} roughness={0.62} envMapIntensity={0.25} />
    </instancedMesh>
  );
}

function FilledDrawer({
  cabX,
  cabZ,
  slot,
  dw,
  dh,
  texture,
  pal,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  cabX: number;
  cabZ: number;
  slot: FilledSlot;
  dw: number;
  dh: number;
  texture: THREE.Texture;
  pal: Palette;
  selected: boolean;
  hovered: boolean;
  onHover: (code: string | null) => void;
  onSelect?: (code: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const out = selected ? 0.62 : hovered ? 0.24 : 0;
    ref.current.position.z += (out - ref.current.position.z) * 0.2;
  });
  const edge = healthHex(slot.tile.health);
  const labelTex = useMemo(
    () =>
      makeTextTexture(256, 48, (ctx, cw, ch) => {
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = "rgba(0,0,0,0.66)";
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = "#eafff6";
        ctx.font = "700 30px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(slot.tile.code, cw / 2, ch / 2 + 1);
      }),
    [slot.tile.code],
  );
  return (
    <group position={[cabX + slot.lx, slot.ly, cabZ + CAB_D / 2 - 0.04]}>
      <group
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(slot.tile.code);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(slot.tile.code);
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[dw * 0.92, dh * 0.86, 0.34]} />
          <meshStandardMaterial color={pal.drawer} metalness={0.4} roughness={0.55} envMapIntensity={0.3} />
        </mesh>
        <mesh position={[0, -dh * 0.3, 0.18]}>
          <boxGeometry args={[dw * 0.5, 0.05, 0.06]} />
          <meshStandardMaterial color={pal.steelDark} metalness={0.55} roughness={0.4} envMapIntensity={0.3} />
        </mesh>
        <mesh position={[0, dh * 0.07, 0.18]}>
          <planeGeometry args={[dw * 0.74, dh * 0.5]} />
          <meshBasicMaterial map={texture} toneMapped />
        </mesh>
        <mesh position={[0, -dh * 0.22, 0.19]}>
          <planeGeometry args={[dw * 0.78, dh * 0.16]} />
          <meshBasicMaterial map={labelTex} transparent toneMapped={false} />
        </mesh>
        <mesh position={[0, dh * 0.3, 0.19]}>
          <planeGeometry args={[dw * 0.74, 0.04]} />
          <meshBasicMaterial color={edge} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function NeonHeader({
  cab,
  pal,
  theme,
}: {
  cab: CabinetData;
  pal: Palette;
  theme: ThemeMode;
}) {
  const screenTex = useMemo(
    () =>
      makeTextTexture(560, 200, (ctx, w, h) => {
        ctx.fillStyle = pal.screenBg;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = pal.screenText;
        ctx.shadowColor = pal.screenText;
        ctx.shadowBlur = 18;
        ctx.textAlign = "center";
        ctx.font = "700 80px ui-monospace, Menlo, Consolas, monospace";
        ctx.fillText(`${cab.tempF}\u00B0F`, w / 2, 82);
        ctx.shadowBlur = 0;
        ctx.font = "700 34px ui-monospace, Menlo, Consolas, monospace";
        ctx.fillText(`${cab.humidity}% RH   ${cab.lumen} lx`, w / 2, 136);
        ctx.font = "700 22px ui-monospace, Menlo, Consolas, monospace";
        ctx.globalAlpha = 0.7;
        ctx.fillText("\u25CF LIVE SENSOR PENDING", w / 2, 176);
        ctx.globalAlpha = 1;
      }),
    [cab.tempF, cab.humidity, cab.lumen, pal.screenBg, pal.screenText],
  );

  const labelTex = useMemo(
    () =>
      makeTextTexture(512, 110, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.font = "800 62px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        // neon: bright core + colored glow
        ctx.shadowColor = cab.neon;
        ctx.shadowBlur = 26;
        ctx.fillStyle = cab.neon;
        ctx.fillText(cab.label.toUpperCase(), w / 2, h / 2);
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(cab.label.toUpperCase(), w / 2, h / 2);
      }),
    [cab.label, cab.neon],
  );

  const headerW = CAB_W - 0.36;
  const labelY = CAB_H / 2 - 0.78;

  return (
    <>
      {/* screen */}
      <group position={[0, CAB_H / 2 - 0.34, CAB_D / 2 + 0.02]}>
        <mesh>
          <boxGeometry args={[CAB_W - 0.4, 0.46, 0.08]} />
          <meshStandardMaterial color={pal.screenBg} roughness={0.25} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[CAB_W - 0.5, 0.4]} />
          <meshBasicMaterial map={screenTex} transparent toneMapped={false} />
        </mesh>
      </group>

      {/* neon label */}
      <mesh position={[0, labelY, CAB_D / 2 + 0.06]}>
        <planeGeometry args={[CAB_W - 0.4, 0.34]} />
        <meshBasicMaterial map={labelTex} transparent toneMapped={false} />
      </mesh>

      {/* neon frame around the label (front row only — keeps depth rows light) */}
      {cab.front
        ? ([
            [0, labelY + 0.21, headerW, 0.03],
            [0, labelY - 0.21, headerW, 0.03],
            [-headerW / 2, labelY, 0.03, 0.45],
            [headerW / 2, labelY, 0.03, 0.45],
          ] as const).map((b, i) => (
            <mesh key={i} position={[b[0], b[1], CAB_D / 2 + 0.05]}>
              <boxGeometry args={[b[2], b[3], 0.04]} />
              <meshBasicMaterial color={cab.neon} toneMapped={false} />
            </mesh>
          ))
        : null}
    </>
  );
}

function Cabinet({
  cab,
  textures,
  pal,
  theme,
  dw,
  dh,
  visible,
  selectedCode,
  hoveredCode,
  onHover,
  onSelect,
}: {
  cab: CabinetData;
  textures: THREE.Texture[];
  pal: Palette;
  theme: ThemeMode;
  dw: number;
  dh: number;
  visible: boolean;
  selectedCode: string | null;
  hoveredCode: string | null;
  onHover: (code: string | null) => void;
  onSelect?: (code: string) => void;
}) {
  const lumenIntensity = (cab.lumen / 750) * 6;
  return (
    <group position={[cab.x, 0, cab.z]} visible={visible}>
      {/* plinth */}
      <mesh position={[0, -CAB_H / 2 - 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[CAB_W + 0.12, 0.36, CAB_D + 0.12]} />
        <meshStandardMaterial color={pal.steelDark} roughness={0.55} metalness={0.5} envMapIntensity={0.3} />
      </mesh>
      {/* carcass */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CAB_W, CAB_H, CAB_D]} />
        <meshStandardMaterial color={pal.steel} roughness={0.55} metalness={0.45} envMapIntensity={0.3} />
      </mesh>
      {/* interior back */}
      <mesh position={[0, 0, -CAB_D / 2 + 0.06]}>
        <boxGeometry args={[CAB_W - 0.12, CAB_H - 0.12, 0.02]} />
        <meshStandardMaterial color={pal.steelDark} roughness={0.7} metalness={0.3} envMapIntensity={0.2} />
      </mesh>

      {lumenIntensity > 0.5 ? (
        <pointLight position={[0, 0.4, CAB_D / 2 - 0.2]} intensity={lumenIntensity} distance={3.5} color={pal.key} />
      ) : null}

      {/* filled drawers */}
      {cab.filled.map((slot) => (
        <FilledDrawer
          key={slot.tile.code}
          cabX={0}
          cabZ={0}
          slot={slot}
          dw={dw}
          dh={dh}
          texture={textures[slot.texIndex]}
          pal={pal}
          selected={slot.tile.code === selectedCode}
          hovered={slot.tile.code === hoveredCode}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}

      {/* glass door — simple physical glass (no transmission: avoids rainbow/aberration artifacts) */}
      <mesh position={[0, -TOP_RESERVE / 2 - 0.05, CAB_D / 2 + 0.08]}>
        <planeGeometry args={[CAB_W - 0.1, CAB_H - TOP_RESERVE - 0.05]} />
        <meshPhysicalMaterial
          transparent
          opacity={theme === "light" ? 0.14 : 0.16}
          roughness={0.15}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={theme === "light" ? 0.25 : 0.4}
          color={theme === "light" ? "#eef4f8" : "#cdd9e6"}
        />
      </mesh>

      <NeonHeader cab={cab} pal={pal} theme={theme} />
    </group>
  );
}

interface CamFocus {
  cam: [number, number, number];
  target: [number, number, number];
}

function CameraRig({ focus }: { focus: CamFocus | null }) {
  const { camera, controls } = useThree();
  const prevKey = useRef("");
  const anim = useRef({
    active: false,
    t: 0,
    fromP: new THREE.Vector3(),
    fromT: new THREE.Vector3(),
    toP: new THREE.Vector3(),
    toT: new THREE.Vector3(),
  });
  const key = focus ? `${focus.cam.join(",")}|${focus.target.join(",")}` : "default";
  useFrame((_, delta) => {
    const ctrls = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (key !== prevKey.current) {
      prevKey.current = key;
      const a = anim.current;
      a.fromP.copy(camera.position);
      a.fromT.copy(ctrls?.target ?? new THREE.Vector3(0, -0.2, -1.5));
      if (focus) {
        a.toP.set(focus.cam[0], focus.cam[1], focus.cam[2]);
        a.toT.set(focus.target[0], focus.target[1], focus.target[2]);
      } else {
        a.toP.set(3.8, 1.4, 6.4);
        a.toT.set(-0.6, -0.2, -2.6);
      }
      a.t = 0;
      a.active = true;
    }
    const a = anim.current;
    if (a.active) {
      a.t += delta;
      const p = Math.min(a.t / 0.85, 1);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      camera.position.lerpVectors(a.fromP, a.toP, e);
      if (ctrls?.target) {
        ctrls.target.lerpVectors(a.fromT, a.toT, e);
        ctrls.update();
      }
      if (p >= 1) a.active = false;
    }
  });
  return null;
}

function Scene({
  tiles,
  theme,
  onSelect,
  selectedCode,
  focusRow,
}: {
  tiles: VaultTile[];
  theme: ThemeMode;
  onSelect?: (code: string) => void;
  selectedCode: string | null;
  focusRow: number;
}) {
  const pal = palette(theme);
  const { cabinets, srcs, emptyByRow, positions, dw, dh } = useFacility(tiles);
  const textures = useTexture(srcs.length ? srcs : [TRANSPARENT_PX]);
  useMemo(() => {
    for (const t of textures as THREE.Texture[]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    }
  }, [textures]);

  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const focusPos = selectedCode ? positions.get(selectedCode) ?? null : null;
  const pitch = CAB_D + ROW_GAP;
  const defaultCam: [number, number, number] = [3.8, 1.4, 6.4];
  const defaultTarget: [number, number, number] = [-0.6, -0.2, -2.6];
  const camOffset: [number, number, number] = [
    defaultCam[0] - defaultTarget[0],
    defaultCam[1] - defaultTarget[1],
    defaultCam[2] - defaultTarget[2],
  ];
  const focus: CamFocus | null = focusPos
    ? {
        cam: [focusPos[0], focusPos[1] + 0.3, focusPos[2] + 2.6],
        target: [focusPos[0], focusPos[1], focusPos[2]],
      }
    : focusRow > 0
      ? (() => {
          const rowZ = -focusRow * pitch;
          const target: [number, number, number] = [defaultTarget[0], defaultTarget[1], rowZ];
          return {
            cam: [
              target[0] + camOffset[0],
              target[1] + camOffset[1],
              target[2] + camOffset[2],
            ],
            target,
          };
        })()
      : null;
  const roomZ = -((ROWS_DEEP - 1) * (CAB_D + ROW_GAP)) / 2;

  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <fog attach="fog" args={[pal.bg, 10, 30]} />
      <hemisphereLight intensity={theme === "light" ? 0.9 : 0.45} groundColor={pal.floor} />
      <ambientLight intensity={theme === "light" ? 0.6 : 0.32} />
      <directionalLight
        position={[5, 12, 6]}
        intensity={theme === "light" ? 1.3 : 1.4}
        color={pal.key}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      {/* overhead light fixtures (emissive, drive bloom + reflections) */}
      {[0, 1, 2, 3].map((r) => (
        <mesh key={r} position={[0, CAB_H / 2 + 2.6, -r * (CAB_D + ROW_GAP)]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CAB_W * 4, 0.7]} />
          <meshBasicMaterial color={pal.fixture} toneMapped={false} />
        </mesh>
      ))}
      {[0, 2].map((r) => (
        <spotLight
          key={r}
          position={[0, CAB_H / 2 + 2.5, -r * (CAB_D + ROW_GAP)]}
          angle={1}
          penumbra={0.8}
          intensity={theme === "light" ? 18 : 38}
          distance={18}
          color={pal.key}
          castShadow={false}
        />
      ))}

      <Environment preset="warehouse" environmentIntensity={theme === "light" ? 0.32 : 0.3} />

      {/* reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -CAB_H / 2 - 0.36, roomZ]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <MeshReflectorMaterial
          resolution={512}
          mixBlur={1.4}
          mixStrength={theme === "light" ? 2 : 14}
          blur={[400, 180]}
          roughness={theme === "light" ? 0.92 : 0.7}
          depthScale={1}
          minDepthThreshold={0.5}
          maxDepthThreshold={1.4}
          color={pal.floor}
          metalness={theme === "light" ? 0.1 : 0.35}
        />
      </mesh>
      {/* back wall */}
      <mesh position={[0, CAB_H / 2 - 1, roomZ * 2 - 4]}>
        <planeGeometry args={[120, 26]} />
        <meshStandardMaterial color={pal.wall} roughness={0.95} metalness={0.05} />
      </mesh>

      {cabinets.map((cab, i) => (
        <Cabinet
          key={`${cab.category}-${cab.z}-${i}`}
          cab={cab}
          textures={textures as THREE.Texture[]}
          pal={pal}
          theme={theme}
          dw={dw}
          dh={dh}
          visible={cab.depth >= focusRow}
          selectedCode={selectedCode}
          hoveredCode={hoveredCode}
          onHover={setHoveredCode}
          onSelect={onSelect}
        />
      ))}

      {emptyByRow.map((matrices, d) => (
        <InstancedEmpties
          key={d}
          matrices={matrices}
          dw={dw}
          dh={dh}
          pal={pal}
          visible={d >= focusRow}
        />
      ))}

      <CameraRig focus={focus} />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        autoRotate={false}
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={30}
        minPolarAngle={Math.PI / 3.6}
        maxPolarAngle={Math.PI / 1.95}
        target={[0, -0.2, -1.5]}
      />

      <EffectComposer enableNormalPass={false}>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.92}
          luminanceSmoothing={0.15}
          intensity={theme === "light" ? 0.22 : 0.7}
        />
      </EffectComposer>
    </>
  );
}

const TRANSPARENT_PX =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export default function BiobankVaultHero({
  tiles,
  onSelect,
  onDeselect,
  selectedCode = null,
  focusRow = 0,
  theme = "dark",
}: BiobankVaultHeroProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      camera={{ position: [3.8, 1.4, 6.4], fov: 44 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      resize={{ scroll: false }}
      onPointerMissed={() => onDeselect?.()}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <Scene
        tiles={tiles}
        theme={theme}
        onSelect={onSelect}
        selectedCode={selectedCode}
        focusRow={focusRow}
      />
    </Canvas>
  );
}
