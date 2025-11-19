// ★ 1日1アプリ用 asset ヘルパー
const asset = (p) => new URL(p, import.meta.url).toString();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const startLayer = document.getElementById("start");
const scoreEl = document.getElementById("score");
const bgm = document.getElementById("bgm"); // ← BGM

let W, H;
function resize(){
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// スマホでスクロール・ダブルタップ拡大を防ぐ
document.body.style.touchAction = "none";
canvas.style.touchAction = "none";

let bgmStarted = false; // BGM再生済みフラグ

// 松村画像
const matsuImg = new Image();
matsuImg.src = asset("assets/matsu.png");

// ゲーム状態
let gameStarted = false;
let gravity = 0.03;     // ← さらに弱く
let vy = 0;             // 松村の速度
let y = 0;              // 松村のY位置
let score = 0;
let bestScore = 0;   // ★ ベストスコア
let obstacles = [];
let frame = 0;

function resetGame(){
  y = H / 2;
  vy = 0;
  score = 0;
  obstacles = [];
  frame = 0;
  gravity = 0.03; // 毎回リセット
  scoreEl.textContent = "0";
}

function createObstacle(){
  const gap = 400;  // ← 穴をかなり広く
  const maxH = Math.max(H - gap, 50);
  const barHeight = Math.random() * maxH;

  obstacles.push({
    x: W,
    top: barHeight,
    bottom: H - (barHeight + gap),
    w: 80
  });
}

// ★ タップ（orクリック）ハンドラ
function handleTap(ev){
  // スマホのダブルタップズームなど防止
  ev.preventDefault();

  if (!gameStarted) {
    gameStarted = true;
    startLayer.style.display = "none";
    resetGame();

    // 最初の1タップ目でだけBGMを開始（モバイル対策）
    if (!bgmStarted && bgm) {
      bgmStarted = true;
      bgm.currentTime = 0;
      bgm.play().catch(() => {
        // 再生失敗してもゲームはそのまま動かす
      });
    }
    return;
  }
  // 重力反転
  gravity *= -1;
}

// 画面全体でタップを拾う（startの上からでもOK）
window.addEventListener("pointerdown", handleTap, { passive: false });

// メインループ
function loop(){
  ctx.clearRect(0, 0, W, H);

  if (gameStarted) {
    frame++;

    // ---- 障害物生成（間隔を長めに） ----
    if (frame > 60 && frame % 120 === 0) {
      createObstacle();
    }

    // ---- 松村の動き ----
    vy += gravity;
    y += vy;

    // 画面外に出たらゲームオーバー（少し甘め判定）
    if (y < -40 || y > H + 40) {
      gameOver();
      requestAnimationFrame(loop);
      return;
    }

    // ---- 障害物の更新・描画・当たり判定 ----
    for (let ob of obstacles) {
      ob.x -= 1.8; // ← スピード遅く

      // 上のバー
      ctx.fillStyle = "#4B8";
      ctx.fillRect(ob.x, 0, ob.w, ob.top);

      // 下のバー
      ctx.fillRect(ob.x, H - ob.bottom, ob.w, ob.bottom);

      // 当たり判定（円と柱のざっくり判定）
      const matsuX = W * 0.3;
      const matsuY = y;
      const r = 20; // ← 当たり範囲ちょい小さく

      // 横方向で重なっているか
      if (
        matsuX + r > ob.x &&
        matsuX - r < ob.x + ob.w
      ) {
        // 穴に少しマージンを持たせて甘めに
        const safeTop = ob.top + 15;
        const safeBottom = H - ob.bottom - 15;

        if (matsuY - r < safeTop || 
            matsuY + r > safeBottom) {
          gameOver();
          requestAnimationFrame(loop);
          return;
        }
      }
    }

    // 画面外に出た障害物を削除
    obstacles = obstacles.filter(ob => ob.x + ob.w > 0);

    // スコア更新（ざっくり時間スコア）
    if (frame % 30 === 0) {
      score++;
      scoreEl.textContent = score;
    }
  }

  // ---- 松村描画 ----
  ctx.drawImage(matsuImg, W * 0.3 - 35, y - 35, 70, 70);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function gameOver(){
    gameStarted = false;
  
    // ベストスコア更新
    if (score > bestScore) {
      bestScore = score;
    }
  
    // オーバーレイに結果表示
    startLayer.style.display = "flex";
    startLayer.innerHTML = `
      <div style="text-align:center; line-height:1.6;">
        <div>スコア：<strong>${score}</strong></div>
        <div>ベスト：<strong>${bestScore}</strong></div>
        <div style="margin-top:12px; font-size:0.9em;">タップで再開</div>
      </div>
    `;
  
    // BGM止めたければ↓を有効化
    // if (bgm) bgm.pause();
  }
