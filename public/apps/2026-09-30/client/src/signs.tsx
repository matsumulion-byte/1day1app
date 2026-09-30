import { useMemo, useEffect } from "react";
import { CanvasTexture, SRGBColorSpace, LinearFilter, DoubleSide } from "three";
import { AppRecord, MONTH_LENGTH, monthOf, routeX } from "./layout";
/** Local canvas labels: no font downloads, remote models, or per-frame text layout. */
function Sign({ month, count }: { month: number; count: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#e9e8d9";
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = month < 4 ? "#4c746a" : month < 8 ? "#a48952" : "#c1683e";
    c.fillRect(0, 0, 9, 256);
    c.font = "16px sans-serif";
    c.fillText(`CHAPTER ${String(month + 1).padStart(2, "0")} / 12`, 35, 46);
    c.fillStyle = "#29453b";
    c.font = "bold 74px sans-serif";
    c.fillText(
      `${month < 3 ? "2025" : "2026"}.${String(((month + 9) % 12) + 1).padStart(2, "0")}`,
      30,
      138,
    );
    c.fillStyle = "#7b887a";
    c.fillRect(35, 171, 442, 1);
    c.font = "18px sans-serif";
    c.fillText(`${count} APPS`, 35, 218);
    c.fillText("CONTINUE  →", 322, 218);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearFilter;
    t.generateMipmaps = false;
    return t;
  }, [month, count]);
  useEffect(() => () => texture.dispose(), [texture]);
  const distance = month * MONTH_LENGTH + 3;
  return (
    <group
      position={[routeX(distance) - 5.4, 0, -distance]}
      rotation={[0, 0.15, 0]}
    >
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.09, 2.3, 0.09]} />
        <meshStandardMaterial color="#5a6b5f" />
      </mesh>
      <mesh position={[0, 2.9, 0.03]}>
        <planeGeometry args={[3.8, 1.9]} />
        <meshBasicMaterial map={texture} side={DoubleSide} />
      </mesh>
    </group>
  );
}
export function ChapterSigns({ apps }: { apps: AppRecord[] }) {
  const counts = useMemo(
    () =>
      Array.from(
        { length: 12 },
        (_, i) => apps.filter((a) => monthOf(a.date) === i).length,
      ),
    [apps],
  );
  return (
    <group>
      {counts.map((count, month) => (
        <Sign key={month} month={month} count={count} />
      ))}
    </group>
  );
}
