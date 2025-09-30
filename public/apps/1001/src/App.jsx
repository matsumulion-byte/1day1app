import React, { useRef, useState, useEffect } from "react";

// --- Utility: load image as HTMLImageElement
const loadImage = (fileOrUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    // Set crossOrigin only for remote URLs to avoid file:// issues
    if (typeof fileOrUrl === "string" && /^https?:\/\//.test(fileOrUrl)) {
      img.crossOrigin = "anonymous";
    }
    if (fileOrUrl instanceof File) {
      const url = URL.createObjectURL(fileOrUrl);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    } else {
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = fileOrUrl;
    }
  });

const loadImageWithFallback = async (paths) => {
  for (const p of paths) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const img = await loadImage(p);
      return img;
    } catch (_) {}
  }
  throw new Error("All image sources failed to load");
};

export default function App() {
  const canvasRef = useRef(null);
  const [bgImg, setBgImg] = useState(null);
  const [mustacheImg, setMustacheImg] = useState(null);
  const [mustacheScale, setMustacheScale] = useState(1);
  const [mustacheRotation, setMustacheRotation] = useState(0);
  const [mustacheX, setMustacheX] = useState(0.5); // normalized 0..1
  const [mustacheY, setMustacheY] = useState(0.62);
  const [textSize, setTextSize] = useState(64);
  const [textY, setTextY] = useState(0.92);
  const [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(null); // 'mustache' | 'text'
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 800 });

  // Load bundled mustache once (prefer PNG)
  useEffect(() => {
    const load = async () => {
      try {
        const img = await loadImageWithFallback([
          "/assets/mustache.png",
          "/assets/mustache.webp",
          "/assets/mustache.svg",
        ]);
        setMustacheImg(img);
      } catch {}
    };
    load();
  }, []);

  // Responsive canvas
  useEffect(() => {
    const onResize = () => {
      const maxW = Math.min(window.innerWidth - 32, 900);
      setCanvasSize({ w: maxW, h: maxW });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Draw composition
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    // Background
    if (bgImg) {
      const cw = c.width, ch = c.height;
      const ir = bgImg.width / bgImg.height;
      const cr = cw / ch;
      let dw, dh, dx, dy;
      if (ir > cr) { dh = ch; dw = dh * ir; dx = (cw - dw) / 2; dy = 0; }
      else { dw = cw; dh = dw / ir; dx = 0; dy = (ch - dh) / 2; }
      ctx.drawImage(bgImg, dx, dy, dw, dh);
    } else {
      const s = 24;
      for (let y = 0; y < canvasSize.h; y += s) {
        for (let x = 0; x < canvasSize.w; x += s) {
          ctx.fillStyle = (Math.floor(x / s) + Math.floor(y / s)) % 2 === 0 ? "#f3f4f6" : "#e5e7eb";
          ctx.fillRect(x, y, s, s);
        }
      }
    }

    // Mustache
    const mWidth = c.width * 0.5 * mustacheScale;
    const mHeight = mWidth * (200 / 500);
    const mx = c.width * mustacheX;
    const my = c.height * mustacheY;

    if (mustacheImg) {
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate((mustacheRotation * Math.PI) / 180);
      ctx.drawImage(mustacheImg, -mWidth / 2, -mHeight / 2, mWidth, mHeight);
      ctx.restore();
    }

    // Fixed text layer "松村です！" (no input/toggle)
    const fontSize = Math.round((textSize / 900) * c.width);
    ctx.save();
    ctx.font = `${fontSize}px "Noto Sans JP", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const ty = c.height * textY;
    ctx.lineWidth = Math.max(6, fontSize * 0.08);
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.strokeText("松村です！", c.width / 2, ty);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("松村です！", c.width / 2, ty);
    ctx.restore();
  }, [bgImg, mustacheImg, mustacheScale, mustacheRotation, mustacheX, mustacheY, textSize, textY, canvasSize]);

  const onFile = async (file) => {
    if (!file) return;
    const img = await loadImage(file);
    setBgImg(img);
  };

  // Dragging helpers
  const handlePointerDown = (e) => {
    if (e && e.cancelable && (e.touches || e.type === 'touchstart')) e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;

    const mx = canvasRef.current.width * mustacheX;
    const my = canvasRef.current.height * mustacheY;
    const mWidth = canvasRef.current.width * 0.5 * mustacheScale;
    const mHeight = mWidth * (200 / 500);

    const inMustache = Math.hypot(x - mx, y - my) < Math.max(mWidth, mHeight) * 0.45;
    const ty = canvasRef.current.height * textY;
    const inText = Math.abs(y - ty) < 48;

    if (inMustache) setDragging({ type: "mustache", ox: x, oy: y, startX: mustacheX, startY: mustacheY });
    else if (inText) setDragging({ type: "text", oy: y, startY: textY });
  };
  const handlePointerMove = (e) => {
    if (e && e.cancelable && (e.touches || e.type === 'touchmove')) e.preventDefault();
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;

    const cw = canvasRef.current.width, ch = canvasRef.current.height;
    if (dragging.type === "mustache") {
      const dx = x - dragging.ox;
      const dy = y - dragging.oy;
      setMustacheX(Math.min(0.98, Math.max(0.02, dragging.startX + dx / cw)));
      setMustacheY(Math.min(0.98, Math.max(0.02, dragging.startY + dy / ch)));
    } else if (dragging.type === "text") {
      const dy = y - dragging.oy;
      setTextY(Math.min(0.98, Math.max(0.05, dragging.startY + dy / ch)));
    }
  };
  const handlePointerUp = () => setDragging(null);

  const download = async () => {
    const c = canvasRef.current;
    if (!c) return;
    setDownloading(true);
    try {
      const blob = await new Promise((resolve) => c.toBlob(resolve, "image/png", 0.95));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kaiser-matsumura.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col items-center py-6 gap-4">
      <h1 className="text-2xl font-bold">カイゼル髭ジェネレーター（松村です！）</h1>
      <p className="text-sm opacity-80">写真をアップロードして、髭の位置をドラッグ。サイズ/回転とテキストの縦位置・サイズを調整できます。</p>

      <div className="flex flex-col md:flex-row items-stretch gap-4 w-full max-w-5xl">
        <div className="flex-1 bg-white rounded-2xl shadow p-3 select-none">
          <div
            className="relative w-full touch-none"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h} className="w-full rounded-xl border" />
          </div>
        </div>

        <div className="w-full md:w-80 bg-white rounded-2xl shadow p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">写真アップロード</label>
            <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm" />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">髭サイズ</div>
            <input type="range" min={0.4} max={2.0} step={0.01} value={mustacheScale} onChange={(e) => setMustacheScale(parseFloat(e.target.value))} className="w-full" />
            <div className="text-sm font-medium">髭回転</div>
            <input type="range" min={-45} max={45} step={0.5} value={mustacheRotation} onChange={(e) => setMustacheRotation(parseFloat(e.target.value))} className="w-full" />
            <div className="text-xs opacity-70">※ 髭の位置はキャンバス上でドラッグ</div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-sm font-medium">テキストサイズ</div>
            <input type="range" min={24} max={120} step={1} value={textSize} onChange={(e) => setTextSize(parseInt(e.target.value))} className="w-full" />
            <div className="text-sm font-medium">テキスト縦位置</div>
            <input type="range" min={0.05} max={0.98} step={0.005} value={textY} onChange={(e) => setTextY(parseFloat(e.target.value))} className="w-full" />
            <div className="text-xs opacity-70">※ テキストは固定文言「松村です！」です</div>
          </div>

          <div className="pt-2 flex gap-2">
            <button onClick={() => {setMustacheScale(1); setMustacheRotation(0); setMustacheX(0.5); setMustacheY(0.62); setTextY(0.92); setTextSize(64);}} className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm">リセット</button>
            <button onClick={download} className="px-3 py-2 rounded-xl bg-black text-white hover:opacity-90 text-sm disabled:opacity-60" disabled={downloading}>{downloading ? "書き出し中…" : "PNGで保存"}</button>
          </div>
        </div>
      </div>

      <footer className="text-xs opacity-60 pt-2">© 2025 matsumuion</footer>
    </div>
  );
} 
