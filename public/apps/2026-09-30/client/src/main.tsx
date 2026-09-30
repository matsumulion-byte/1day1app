import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppRecord, validateApps, monthOf } from "./layout";
import "./style.css";
import type { Destination } from "./journey";
const World = lazy(() => import("./world"));
const BASE = "/apps/2026-09-30/";
export type Controls = {
  forward: number;
  side: number;
  lookX: number;
  lookY: number;
};
const months = Array.from(
  { length: 12 },
  (_, i) =>
    `${i < 3 ? 2025 : 2026}.${String(((i + 9) % 12) + 1).padStart(2, "0")}`,
);
class Boundary extends React.Component<
  { children: React.ReactNode; onFailure: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}
function App() {
  const [apps, setApps] = useState<AppRecord[]>([]),
    [error, setError] = useState(""),
    [started, setStarted] = useState(false),
    [ready, setReady] = useState(false),
    [menu, setMenu] = useState(false),
    [help, setHelp] = useState(false),
    [selected, setSelected] = useState<AppRecord | null>(null),
    [hovered, setHovered] = useState<AppRecord | null>(null),
    [query, setQuery] = useState(""),
    [month, setMonth] = useState("all"),
    [area, setArea] = useState(0),
    [jump, setJump] = useState<Destination | null>(null),
    [tour, setTour] = useState(false),
    [atEnd, setAtEnd] = useState(false),
    [failed, setFailed] = useState(false);
  const [mobile] = useState(
    () => matchMedia("(pointer: coarse)").matches || innerWidth < 760,
  );
  const controls = useRef<Controls>({
    forward: 0,
    side: 0,
    lookX: 0,
    lookY: 0,
  });
  const stick = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState([0, 0]);
  const blocked = !started || menu || help || !!selected;
  useEffect(() => {
    fetch(BASE + "apps.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw Error("データを読み込めませんでした。");
        return r.json();
      })
      .then(validateApps)
      .then(setApps)
      .catch((e) => setError(e.message));
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", prevent, { passive: false });
    document.addEventListener("dblclick", prevent, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("dblclick", prevent);
    };
  }, []);
  useEffect(() => {
    if (blocked) {
      setTour(false);
      controls.current.forward = 0;
      controls.current.side = 0;
      setKnob([0, 0]);
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [blocked]);
  useEffect(() => {
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialog = document.querySelector("[role=dialog]");
      if (!dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,[tabindex="0"]',
        ),
      );
      const first = items[0],
        last = items[items.length - 1];
      if (!first) return;
      if (
        !dialog.contains(document.activeElement) ||
        (e.shiftKey && document.activeElement === first)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setMenu(false);
        setHelp(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  function travel(destination: Destination) {
    setJump(destination);
    setTour(false);
    setMenu(false);
    setSelected(null);
    setStarted(true);
    setHovered(null);
  }
  function teleport(app: AppRecord) {
    travel({ id: app.id, nonce: Date.now() });
    setMenu(false);
    setSelected(null);
    setStarted(true);
    setHovered(null);
  }
  function moveStick(e: React.PointerEvent) {
    setTour(false);
    const rect = stick.current!.getBoundingClientRect();
    let x = e.clientX - rect.left - rect.width / 2,
      y = e.clientY - rect.top - rect.height / 2;
    const len = Math.hypot(x, y);
    if (len > 34) {
      x = (x / len) * 34;
      y = (y / len) * 34;
    }
    setKnob([x, y]);
    controls.current.side = x / 34;
    controls.current.forward = -y / 34;
  }
  function resetStick() {
    controls.current.forward = 0;
    controls.current.side = 0;
    setKnob([0, 0]);
  }
  const filtered = apps.filter(
    (a) =>
      (month === "all" || monthOf(a.date) === Number(month)) &&
      `${a.title} ${a.date}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const currentLabel = months[Math.min(11, Math.max(0, area))];
  return (
    <main>
      <div className="world" aria-label="アプリに侵食された3D世界">
        {apps.length > 0 && !failed && (
          <Boundary onFailure={() => setFailed(true)}>
            <Suspense
              fallback={
                <div className="world-loading">世界を構築しています…</div>
              }
            >
              <World
                apps={apps}
                mobile={mobile}
                blocked={blocked}
                started={started}
                controls={controls}
                jump={jump}
                tour={tour}
                onTourStop={() => setTour(false)}
                onEndChange={setAtEnd}
                onSelect={setSelected}
                onHover={setHovered}
                onArea={setArea}
                onReady={() => setReady(true)}
                onFailure={() => setFailed(true)}
              />
            </Suspense>
          </Boundary>
        )}
      </div>
      <header>
        <button
          className="brand"
          onClick={() => {
            setStarted(false);
            setMenu(false);
            setSelected(null);
          }}
        >
          1日1アプリ<span>THE FINAL ARCHIVE</span>
        </button>
        <div className="header-right">
          <span className="edition">2025.10 — 2026.09</span>
          <button
            className="menu-button"
            onClick={() => setMenu(true)}
            aria-label="全アプリ一覧を開く"
          >
            <span className="menu-lines">☰</span> ARCHIVE{" "}
            <span className="count">
              {apps.length.toString().padStart(3, "0")}
            </span>
          </button>
        </div>
      </header>
      {!started && !menu && !selected && (
        <section className="landing">
          <div className="chapter">
            <i /> A WORLD MADE OF EVERY DAY
          </div>
          <h1>
            1日1アプリ
            <span>
              世界は、作ったもので
              <br />
              できている。
            </span>
          </h1>
          <p className="intro">
            毎日ひとつ。365日。
            <br />
            気づけば、アプリが世界を埋め尽くしていた。
          </p>
          <button
            className="enter"
            disabled={!ready && !failed && !error}
            onClick={() => {
              if (error) {
                location.reload();
                return;
              }
              setStarted(true);
              if (!failed) setHelp(true);
              else setMenu(true);
            }}
          >
            {error
              ? "読み込みをやり直す"
              : failed
                ? "アーカイブを見る"
                : ready
                  ? "ENTER THE WORLD"
                  : "BUILDING THE WORLD"}{" "}
            <span>↗</span>
          </button>
          <div className="landing-note">
            {error ||
              (failed
                ? "3Dを利用できないため、一覧から閲覧できます。"
                : `${String(apps.length).padStart(2, "0")} APPS LOADED / DAILY ARCHIVE`)}
          </div>
        </section>
      )}
      {!started && !menu && (
        <div className="cover-footer">
          <span>
            ONE DAY, ONE APP.
            <br />
            ONE YEAR, ANOTHER WORLD.
          </span>
          <span>
            最終章<span className="tiny-arrow">↓</span>
          </span>
        </div>
      )}
      {started && !blocked && (
        <>
          <div className="location">
            <span className="location-line" />
            <div>
              <small>CHAPTER {String(area + 1).padStart(2, "0")}</small>
              <strong>{currentLabel}</strong>
              <span>
                {area < 4
                  ? "日常の輪郭"
                  : area < 8
                    ? "増殖する記憶"
                    : "世界を埋め尽くすもの"}
              </span>
            </div>
          </div>
          <div className="reticle" />
          <button
            className="tour-button"
            aria-pressed={tour}
            onClick={() => setTour((v) => !v)}
          >
            {tour ? "Ⅱ 散策を止める" : "▷ 自動で散策"}
          </button>
          {atEnd && (
            <section className="journey-end" aria-label="最終エリア">
              <small>END OF THE ROAD / 365 DAYS</small>
              <h2>毎日の、その先。</h2>
              <p>
                {apps.length}個のアプリが、この世界を作った。
                {apps.some((a) => a.demo) && "（サンプルデータ）"}
              </p>
              <div>
                <button onClick={() => setMenu(true)}>日々を振り返る ↗</button>
                <button onClick={() => travel({ month: 0, nonce: Date.now() })}>
                  はじまりへ戻る
                </button>
              </div>
            </section>
          )}
          <button
            className="help-button"
            onClick={() => setHelp(true)}
            aria-label="操作方法を表示"
          >
            ?
          </button>
          {hovered && (
            <button className="near-label" onClick={() => setSelected(hovered)}>
              <small>{hovered.date}</small>
              <strong>{hovered.title}</strong>
              <span>詳細を見る ↗</span>
            </button>
          )}
          {mobile ? (
            <>
              <div
                ref={stick}
                className="joystick"
                role="group"
                aria-label="移動スティック"
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  moveStick(e);
                }}
                onPointerMove={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId))
                    moveStick(e);
                }}
                onPointerUp={resetStick}
                onPointerCancel={resetStick}
                onLostPointerCapture={resetStick}
              >
                <span className="stick-cross">＋</span>
                <i
                  style={{ transform: `translate(${knob[0]}px,${knob[1]}px)` }}
                />
              </div>
              <span className="swipe-note">右側をスワイプして見回す</span>
            </>
          ) : (
            <div className="desktop-hint">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> 移動 <b>·</b> ドラッグで見回す <b>·</b>{" "}
              ダブルクリックでマウス固定
            </div>
          )}
        </>
      )}
      {help && (
        <Modal title="世界の歩き方" onClose={() => setHelp(false)}>
          <div className="help-illustration">
            {mobile ? "↕　＋　↔" : "W A S D　＋　↔"}
          </div>
          <p>
            {mobile
              ? "左のスティックで移動。画面をスワイプして、周囲を見回せます。"
              : "WASD / 矢印キーで移動。マウスをドラッグして視点を変更できます。"}
          </p>
          <p>
            気になるパネルを{mobile ? "タップ" : "クリック"}
            すると、アプリの詳細が開きます。道の奥へ進むほど、新しい日付へ。
          </p>
          {!mobile && (
            <p className="muted">
              ダブルクリックでマウス固定、Escで解除。アーカイブから目的地へ移動できます。
            </p>
          )}
          <p className="muted">
            「自動で散策」で道に沿って進めます。スワイプ・移動操作やメニューを開くと停止します。
          </p>
          <button className="solid" onClick={() => setHelp(false)}>
            歩き始める →
          </button>
        </Modal>
      )}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <div className="detail-meta">
            <span>{selected.date}</span>
            <span>{selected.featured ? "FEATURED APP" : "DAILY APP"}</span>
          </div>
          <img
            className="detail-image"
            src={selected.image}
            alt={selected.title + " のスクリーンショット"}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          {selected.demo && (
            <p className="muted">
              動作確認用サンプルです。リンク先はサンプル画面です。
            </p>
          )}
          <a
            className="solid"
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            このアプリを開く <span>↗</span>
          </a>
          <button
            className="outline"
            disabled={failed}
            onClick={() => teleport(selected)}
          >
            3D世界内の場所へ移動 →
          </button>
        </Modal>
      )}
      {menu && (
        <div className="overlay archive-overlay">
          <section
            className="archive"
            role="dialog"
            aria-modal="true"
            aria-label="全アプリ一覧"
          >
            <div className="archive-head">
              <div>
                <div className="eyebrow">THE DAILY ARCHIVE</div>
                <h2>
                  日々の断片。<span>{apps.length} apps</span>
                </h2>
              </div>
              <button
                className="close"
                onClick={() => setMenu(false)}
                aria-label="一覧を閉じる"
              >
                ×
              </button>
            </div>
            <nav className="chapter-map" aria-label="月の入口へ移動">
              {months.map((label, i) => (
                <button
                  key={label}
                  disabled={failed}
                  onClick={() => travel({ month: i, nonce: Date.now() })}
                  aria-label={`${label}の入口へ移動`}
                >
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  <strong>{label}</strong>
                  <span>
                    {apps.filter((a) => monthOf(a.date) === i).length} apps ↗
                  </span>
                </button>
              ))}
            </nav>
            <button
              className="finale-link"
              disabled={failed}
              onClick={() => travel({ finale: true, nonce: Date.now() })}
            >
              最終エリアへ — 1年の終わりを見る ↗
            </button>
            <div className="search-row">
              <input
                autoFocus
                placeholder="タイトル・日付で検索"
                aria-label="タイトル・日付で検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                aria-label="月別表示"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="all">すべての月</option>
                {months.map((m, i) => (
                  <option value={i} key={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="result-count">
              {filtered.length} APPS{" "}
              {apps.some((a) => a.demo) && " / SAMPLE DATA"}
            </div>
            <div className="app-grid">
              {filtered.map((a) => (
                <article className="app-card" key={a.id}>
                  <button
                    className="card-image"
                    onClick={() => {
                      setMenu(false);
                      setSelected(a);
                    }}
                  >
                    <img
                      src={a.image}
                      alt={a.title}
                      loading="lazy"
                      decoding="async"
                    />
                    {a.featured && <span>FEATURED</span>}
                  </button>
                  <small>{a.date}</small>
                  <h3>{a.title}</h3>
                  <div className="card-actions">
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      アプリを開く ↗
                    </a>
                    <button disabled={failed} onClick={() => teleport(a)}>
                      ここへ移動 →
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!filtered.length && (
              <p className="empty">
                見つかりませんでした。タイトルや月を変えてみてください。
              </p>
            )}
            {error && <p role="alert">{error}</p>}
          </section>
        </div>
      )}
    </main>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.focus();
    return () => prev?.focus();
  }, []);
  return (
    <div className="overlay" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <div className="eyebrow">1 DAY / 1 APP</div>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
