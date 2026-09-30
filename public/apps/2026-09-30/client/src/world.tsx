import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  ThreeEvent,
  events,
} from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import {
  AppRecord,
  Placement,
  buildLayout,
  buildEchoes,
  routeX,
  WORLD_LENGTH,
  MONTH_LENGTH,
} from "./layout";
import { setTextureBudget, useManagedTexture } from "./textures";
import type { Controls } from "./main";
import {
  advanceTour,
  entranceDistance,
  turnToward,
  type Destination,
} from "./journey";
import { ChapterSigns } from "./signs";
type Props = {
  apps: AppRecord[];
  mobile: boolean;
  blocked: boolean;
  started: boolean;
  controls: MutableRefObject<Controls>;
  jump: Destination | null;
  tour: boolean;
  onTourStop: () => void;
  onEndChange: (atEnd: boolean) => void;
  onSelect: (a: AppRecord) => void;
  onHover: (a: AppRecord | null) => void;
  onArea: (a: number) => void;
  onReady: () => void;
  onFailure: () => void;
};
const plane = new THREE.PlaneGeometry(1, 1);
const box = new THREE.BoxGeometry(1, 1, 1);
const frameMat = new THREE.MeshStandardMaterial({
  color: "#495452",
  roughness: 0.9,
});
const palettes = [
  "#b6cec9",
  "#dcb378",
  "#c8cdb8",
  "#a4b5bc",
  "#a6bbc0",
  "#b1bc9a",
  "#d8b080",
  "#b7c4be",
  "#9aac99",
  "#dcc579",
  "#95beb5",
  "#dd7954",
];
export default function World(props: Props) {
  const [low, setLow] = useState(props.mobile);
  const [supported] = useState(() => {
    try {
      const c = document.createElement("canvas");
      const g = c.getContext("webgl2");
      if (!g) return false;
      g.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!supported) props.onFailure();
  }, [supported]);
  useEffect(() => setTextureBudget(props.mobile), [props.mobile]);
  if (!supported) return null;
  return (
    <Canvas
      events={(state) => ({
        ...events(state),
        compute: (event, state) => {
          if (document.pointerLockElement === state.gl.domElement)
            state.pointer.set(0, 0);
          else
            state.pointer.set(
              (event.offsetX / state.size.width) * 2 - 1,
              (-event.offsetY / state.size.height) * 2 + 1,
            );
          state.raycaster.setFromCamera(state.pointer, state.camera);
        },
      })}
      dpr={low ? 1 : Math.min(devicePixelRatio, 1.6)}
      camera={{ position: [1, 3.2, 9], fov: 62, near: 0.15, far: 190 }}
      gl={{
        antialias: !props.mobile,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#d9dfda");
        props.onReady();
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            props.onFailure();
          },
          { once: true },
        );
      }}
      fallback={<div>3D表示に対応したブラウザで開いてください。</div>}
    >
      <PerformanceMonitor onDecline={() => setLow(true)}>
        <Scene {...props} low={low} />
      </PerformanceMonitor>
    </Canvas>
  );
}
function Scene(props: Props & { low: boolean }) {
  const primary = useMemo(() => buildLayout(props.apps), [props.apps]);
  const echoes = useMemo(() => buildEchoes(primary), [primary]);
  const all = useMemo(() => [...primary, ...echoes], [primary, echoes]);
  const [near, setNear] = useState<number[]>([]);
  const last = useRef(0);
  const { camera, scene } = useThree();
  const color = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const area = THREE.MathUtils.clamp(
      Math.floor(-camera.position.z / MONTH_LENGTH),
      0,
      11,
    );
    color.set(area < 4 ? "#d9dfda" : area < 8 ? "#d7d5c6" : "#ddd1bd");
    scene.background instanceof THREE.Color &&
      (scene.background as THREE.Color).lerp(color, 0.015);
    if (scene.fog instanceof THREE.Fog)
      scene.fog.color.copy(scene.background as THREE.Color);
    if (clock.elapsedTime - last.current > 0.35) {
      last.current = clock.elapsedTime;
      const limit = props.mobile ? 18 : 32;
      const range = props.mobile ? 48 : 72;
      const frustum = new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse,
        ),
      );
      const closest = all
        .map((p, i) => ({
          i,
          d: camera.position.distanceToSquared(
            new THREE.Vector3(...p.position),
          ),
        }))
        .filter(
          (v) =>
            v.d < range * range &&
            frustum.intersectsSphere(
              new THREE.Sphere(
                new THREE.Vector3(...all[v.i].position),
                all[v.i].width,
              ),
            ),
        )
        .sort(
          (a, b) =>
            (all[a.i].primary ? a.d * 0.7 : a.d) -
            (all[b.i].primary ? b.d * 0.7 : b.d),
        )
        .slice(0, limit)
        .map((v) => v.i)
        .sort((a, b) => a - b);
      setNear((prev) =>
        prev.join(",") === closest.join(",") ? prev : closest,
      );
    }
  });
  return (
    <>
      <color attach="background" args={["#d9dfda"]} />
      <fog
        attach="fog"
        args={["#d9dfda", props.mobile ? 36 : 55, props.mobile ? 105 : 158]}
      />
      <ambientLight intensity={1.6} />
      <directionalLight
        position={[12, 30, 15]}
        intensity={2.1}
        color="#fff0d5"
      />
      <hemisphereLight args={["#e2efef", "#687369", 1.2]} />
      <Terrain />
      <ChapterSigns apps={props.apps} />
      <DistantPanels panels={all} />
      {near.map((i) => (
        <Panel
          key={i}
          p={all[i]}
          onSelect={props.onSelect}
          onHover={props.onHover}
          interactive={!props.blocked}
        />
      ))}
      <Player {...props} placements={primary} />
    </>
  );
}
type Block = {
  position: [number, number, number];
  scale: [number, number, number];
  yaw?: number;
};
function Terrain() {
  const blocks = useMemo(() => {
    const road: Block[] = [],
      lines: Block[] = [],
      poles: Block[] = [],
      lamps: Block[] = [];
    for (let i = 0; i < Math.ceil(WORLD_LENGTH / 4) + 8; i++) {
      const d = i * 4 - 10,
        x = routeX(d),
        yaw = -Math.atan((Math.cos(d / 48) * 6) / 48);
      road.push({ position: [x, -0.045, -d], scale: [8, 0.12, 4.5], yaw });
      for (const side of [-1, 1])
        lines.push({
          position: [x + side * 3.6, 0.03, -d],
          scale: [0.08, 0.02, 3],
          yaw,
        });
      if (i % 3 === 0)
        lines.push({
          position: [x, 0.025, -d],
          scale: [0.055, 0.018, 1.6],
          yaw,
        });
      if (i % 8 === 0) {
        poles.push({ position: [x - 4.6, 1.4, -d], scale: [0.13, 2.8, 0.13] });
        lamps.push({ position: [x - 4.6, 2.75, -d], scale: [0.7, 0.08, 0.2] });
      }
    }
    return { road, lines, poles, lamps };
  }, []);
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.16, -WORLD_LENGTH / 2]}
      >
        <planeGeometry args={[220, WORLD_LENGTH + 200]} />
        <meshStandardMaterial color="#aab5ac" roughness={1} />
      </mesh>
      <Blocks blocks={blocks.road} color="#cccdbf" />
      <Blocks blocks={blocks.lines} color="#ececdf" />
      <Blocks blocks={blocks.poles} color="#535f59" />
      <Blocks blocks={blocks.lamps} color="#faf6d8" />
    </group>
  );
}
function Blocks({ blocks, color }: { blocks: Block[]; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    blocks.forEach((b, i) => {
      o.position.set(...b.position);
      o.rotation.set(0, b.yaw || 0, 0);
      o.scale.set(...b.scale);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [blocks]);
  return (
    <instancedMesh
      ref={ref}
      args={[box, undefined, blocks.length]}
      dispose={null}
    >
      <meshStandardMaterial color={color} roughness={1} />
    </instancedMesh>
  );
}
function DistantPanels({ panels }: { panels: Placement[] }) {
  // Partition by physical location (including archive echoes in the finale), not the source app month.
  const groups = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) =>
        panels.filter(
          (p) =>
            Math.max(
              0,
              Math.min(11, Math.floor(-p.position[2] / MONTH_LENGTH)),
            ) === m,
        ),
      ),
    [panels],
  );
  return (
    <group>
      {groups.map((ps, m) => (
        <PanelInstances key={m} panels={ps} />
      ))}
    </group>
  );
}
function PanelInstances({ panels }: { panels: Placement[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const rim = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    panels.forEach((p, i) => {
      o.position.set(...p.position);
      o.rotation.set(...p.rotation);
      o.scale.set(p.width, p.width / (p.app.aspect || 1.5), 0.14);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
      ref.current!.setColorAt(
        i,
        c.set(p.app.color || palettes[p.month]).multiplyScalar(0.84),
      );
      o.scale.set(p.width + 0.12, p.width / (p.app.aspect || 1.5) + 0.12, 0.09);
      o.translateZ(-0.11);
      o.updateMatrix();
      rim.current!.setMatrixAt(i, o.matrix);
    });
    for (const mesh of [ref.current!, rim.current!]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    if (ref.current!.instanceColor)
      ref.current!.instanceColor.needsUpdate = true;
  }, [panels]);
  return (
    <>
      <instancedMesh
        ref={ref}
        args={[box, undefined, panels.length]}
        dispose={null}
      >
        <meshStandardMaterial roughness={0.85} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh
        ref={rim}
        args={[box, frameMat, panels.length]}
        dispose={null}
      />
    </>
  );
}
function Panel({
  p,
  onSelect,
  onHover,
  interactive,
}: {
  p: Placement;
  onSelect: Props["onSelect"];
  onHover: Props["onHover"];
  interactive: boolean;
}) {
  const texture = useManagedTexture(p.app.image);
  const ratio =
    texture?.image?.width / texture?.image?.height || p.app.aspect || 1.5;
  const height = p.width / ratio;
  function click(e: ThreeEvent<MouseEvent>) {
    if (!interactive || e.delta > 6) return;
    e.stopPropagation();
    onSelect(p.app);
  }
  return (
    <group position={p.position} rotation={p.rotation}>
      <mesh
        position={[0, 0, 0.09]}
        geometry={plane}
        scale={[p.width, height, 1]}
        onClick={click}
        onPointerOver={(e) => {
          if (interactive) {
            e.stopPropagation();
            onHover(p.app);
          }
        }}
        onPointerOut={() => onHover(null)}
      >
        <meshBasicMaterial
          key={texture?.uuid || "placeholder"}
          map={texture || null}
          color={texture ? "white" : p.app.color || "#b8c9c0"}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {p.app.featured && p.primary && (
        <FeaturedAccent width={p.width} height={height} app={p.app} />
      )}
    </group>
  );
}
/** Extension point: replace by a per-app effect registry; no lights or particles required. */
export function FeaturedAccent({
  width,
  height,
  app,
}: {
  width: number;
  height: number;
  app: AppRecord;
}) {
  return (
    <group>
      <mesh
        position={[0, -height / 2 - 0.12, 0.11]}
        geometry={box}
        scale={[width, 0.07, 0.07]}
      >
        <meshBasicMaterial color={app.color || "#db682f"} toneMapped={false} />
      </mesh>
      <mesh
        position={[-width / 2 - 0.12, 0, 0.11]}
        geometry={box}
        scale={[0.07, height, 0.07]}
      >
        <meshBasicMaterial color="#e88142" />
      </mesh>
    </group>
  );
}
function Player(props: Props & { placements: Placement[] }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0),
    pitch = useRef(-0.02),
    keys = useRef(new Set<string>()),
    drag = useRef<{
      id: number;
      x: number;
      y: number;
      distance: number;
    } | null>(null),
    lastArea = useRef(-1),
    lastHover = useRef<string | number | null>(null),
    tick = useRef(0);
  const tour = useRef(props.tour);
  tour.current = props.tour;
  const lastEnd = useRef(false);
  const stopTour = () => {
    if (tour.current) {
      tour.current = false;
      props.onTourStop();
    }
  };
  const blocked = useRef(props.blocked);
  blocked.current = props.blocked;
  useEffect(() => {
    if (props.blocked) {
      keys.current.clear();
      drag.current = null;
      props.controls.current.lookX = 0;
      props.controls.current.lookY = 0;
    }
  }, [props.blocked]);
  useEffect(() => {
    const el = gl.domElement;
    const keydown = (e: KeyboardEvent) => {
      if (blocked.current) return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      ) {
        e.preventDefault();
        stopTour();
        keys.current.add(e.code);
      }
    };
    const keyup = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => {
      stopTour();
      keys.current.clear();
      drag.current = null;
      props.controls.current.forward = 0;
      props.controls.current.side = 0;
    };
    const down = (e: PointerEvent) => {
      if (blocked.current) return;
      stopTour();
      drag.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        distance: 0,
      };
    };
    const move = (e: PointerEvent) => {
      if (blocked.current) return;
      let dx = 0,
        dy = 0;
      if (document.pointerLockElement === el) {
        dx = e.movementX;
        dy = e.movementY;
      } else if (drag.current?.id === e.pointerId) {
        dx = e.clientX - drag.current.x;
        dy = e.clientY - drag.current.y;
        drag.current.x = e.clientX;
        drag.current.y = e.clientY;
        drag.current.distance += Math.abs(dx) + Math.abs(dy);
      } else return;
      yaw.current -= dx * 0.003;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - dy * 0.003,
        -1.15,
        1.15,
      );
    };
    const up = () => {
      drag.current = null;
    };
    const lock = () => {
      if (!blocked.current && !props.mobile)
        el.requestPointerLock?.()?.catch(() => {});
    };
    const context = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("dblclick", lock);
    el.addEventListener("contextmenu", context);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("dblclick", lock);
      el.removeEventListener("contextmenu", context);
    };
  }, [gl, props.mobile]);
  useEffect(() => {
    if (!props.jump) return;
    const target = props.jump;
    if (!("id" in target)) {
      const distance =
        "month" in target ? entranceDistance(target.month) : WORLD_LENGTH - 4;
      camera.position.set(routeX(distance), 2.5, -distance);
      yaw.current = advanceTour(distance, 0).yaw;
      pitch.current = 0;
      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
      props.onHover(null);
      lastHover.current = null;
      return;
    }
    const p = props.placements.find((p) => p.app.id === target.id);
    if (!p) return;
    const d = -p.position[2];
    camera.position.set(routeX(d), 2.5, p.position[2] + 0.5);
    const dx = p.position[0] - camera.position.x,
      dz = p.position[2] - camera.position.z;
    yaw.current = Math.atan2(-dx, -dz);
    pitch.current = Math.atan2(
      p.position[1] - camera.position.y,
      Math.hypot(dx, dz),
    );
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    props.onHover(p.app);
  }, [props.jump, camera, props.placements]);
  useEffect(() => {
    if (!props.started) {
      camera.position.set(1, 3.2, 9);
      yaw.current = -0.18;
      pitch.current = 0.015;
    }
  }, [props.started, camera]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!props.blocked && props.tour) {
      const next = advanceTour(-camera.position.z, dt);
      camera.position.z = -next.distance;
      camera.position.x = THREE.MathUtils.lerp(
        camera.position.x,
        next.x,
        1 - Math.exp(-dt * 4),
      );
      camera.position.y = 2.5;
      yaw.current = turnToward(yaw.current, next.yaw, dt);
      pitch.current = THREE.MathUtils.lerp(
        pitch.current,
        0,
        1 - Math.exp(-dt * 3),
      );
      if (next.ended) stopTour();
    } else if (!props.blocked) {
      const k = keys.current;
      let f =
        Number(k.has("KeyW") || k.has("ArrowUp")) -
        Number(k.has("KeyS") || k.has("ArrowDown")) +
        props.controls.current.forward;
      let s =
        Number(k.has("KeyD") || k.has("ArrowRight")) -
        Number(k.has("KeyA") || k.has("ArrowLeft")) +
        props.controls.current.side;
      const len = Math.max(1, Math.hypot(f, s));
      f /= len;
      s /= len;
      const speed = props.mobile ? 14 : 18;
      camera.position.x +=
        (s * Math.cos(yaw.current) - f * Math.sin(yaw.current)) * dt * speed;
      camera.position.z +=
        (-f * Math.cos(yaw.current) - s * Math.sin(yaw.current)) * dt * speed;
      camera.position.z = THREE.MathUtils.clamp(
        camera.position.z,
        -WORLD_LENGTH - 2,
        10,
      );
      const center = routeX(-camera.position.z);
      camera.position.x = THREE.MathUtils.clamp(
        camera.position.x,
        center - 3.25,
        center + 3.25,
      );
      camera.position.y = 2.5;
    }
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    const area = THREE.MathUtils.clamp(
      Math.floor(-camera.position.z / MONTH_LENGTH),
      0,
      11,
    );
    if (area !== lastArea.current) {
      lastArea.current = area;
      props.onArea(area);
    }
    const atEnd = -camera.position.z >= WORLD_LENGTH - 6;
    if (atEnd !== lastEnd.current) {
      lastEnd.current = atEnd;
      props.onEndChange(atEnd);
    }
    tick.current += dt;
    if (!props.blocked && tick.current > 0.4) {
      tick.current = 0;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const near =
        props.placements
          .map((p) => ({
            p,
            v: new THREE.Vector3(...p.position).sub(camera.position),
          }))
          .filter(
            ({ v }) =>
              v.length() < 17 && v.clone().normalize().dot(forward) > 0.75,
          )
          .sort((a, b) => a.v.lengthSq() - b.v.lengthSq())[0]?.p.app || null;
      if ((near?.id ?? null) !== lastHover.current) {
        lastHover.current = near?.id ?? null;
        props.onHover(near);
      }
    }
  });
  return null;
}
