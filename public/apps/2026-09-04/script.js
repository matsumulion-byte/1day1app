import { FilesetResolver, PoseLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm';

// Tuning values are intentionally collected here for quick on-device adjustment.
const CONFIG = {
  baseBpm: 120,
  minBpm: 60,
  maxBpm: 180,
  minBeatInterval: 250,
  minWristMovement: 0.04,
  directionThreshold: 0.0015,
  wristSmoothing: 0.34,
  bpmSmoothing: 0.12,
  playbackSmoothing: 0.08,
  intervalSampleCount: 5,
  noBeatWarningMs: 2000,
  returnToBaseAfterMs: 2300,
  gameDuration: 60,
  minVisibility: 0.48,
  readyHoldMs: 700
};

const $ = id => document.getElementById(id);
const elements = {
  app: $('app'), start: $('startScreen'), stage: $('stageScreen'), result: $('resultScreen'), startButton: $('startButton'), restartButton: $('restartButton'),
  error: $('startError'), video: $('camera'), canvas: $('poseCanvas'), frame: $('cameraFrame'), badge: $('trackingBadge'), readyPanel: $('readyPanel'), readyText: $('readyText'),
  countdown: $('countdown'), hud: $('gameHud'), bpm: $('bpmValue'), time: $('timeValue'), hint: $('conductHint'), flash: $('tempoFlash'), tempoLabel: $('tempoLabel'), bgm: $('bgm')
};
const ctx = elements.canvas.getContext('2d');
// Safari-compatible AAC version of the supplied original recording.
elements.bgm.src = '/assets/conductor.m4a';
let poseLandmarker = null, stream = null, audioContext = null, rafId = 0, lastVideoTime = -1;

const state = {
  phase:'start', wristY:null, previousY:null, direction:0, strokeTop:null, lastBeatAt:0, beatTimes:[], intervals:[], bpmSamples:[],
  currentBpm:CONFIG.baseBpm, targetBpm:CONFIG.baseBpm, beatCount:0, detectedSince:0, gameStartedAt:0, finalizing:false, lastFrameAt:0
};

const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));

async function ensureAudio() {
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') await audioContext.resume();
  elements.bgm.preservesPitch = false;
  elements.bgm.webkitPreservesPitch = false;
}

async function createPoseLandmarker() {
  const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm');
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions:{ modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate:'GPU' },
    runningMode:'VIDEO', numPoses:1, minPoseDetectionConfidence:.55, minPosePresenceConfidence:.55, minTrackingConfidence:.5
  });
}

async function beginExperience() {
  elements.startButton.disabled = true;
  elements.startButton.firstChild.textContent = '準備しています… ';
  elements.error.textContent = '';
  try {
    await ensureAudio();
    const tasks = [
      poseLandmarker ? Promise.resolve(poseLandmarker) : createPoseLandmarker(),
      navigator.mediaDevices.getUserMedia({ audio:false, video:{ facingMode:'user', width:{ideal:960}, height:{ideal:1280} } })
    ];
    [poseLandmarker, stream] = await Promise.all(tasks);
    elements.video.srcObject = stream;
    await elements.video.play();
    resetDetection();
    state.phase = 'ready';
    elements.start.classList.add('hidden');
    elements.result.classList.add('hidden');
    elements.stage.classList.remove('hidden');
    elements.readyPanel.classList.remove('hidden');
    elements.readyText.textContent = '右腕を大きく上下に振ってください';
    elements.countdown.textContent = '';
    elements.hud.classList.add('hidden');
    elements.hint.classList.add('hidden');
    lastVideoTime = -1;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(renderLoop);
  } catch (error) {
    console.error(error);
    elements.error.textContent = 'カメラを使用できませんでした。ブラウザの設定をご確認ください。';
  } finally {
    elements.startButton.disabled = false;
    elements.startButton.firstChild.textContent = '指揮をはじめる ';
  }
}

function resetDetection() {
  Object.assign(state,{ wristY:null,previousY:null,direction:0,strokeTop:null,lastBeatAt:0,beatTimes:[],intervals:[],bpmSamples:[],currentBpm:CONFIG.baseBpm,targetBpm:CONFIG.baseBpm,beatCount:0,detectedSince:0,gameStartedAt:0,finalizing:false,lastFrameAt:performance.now() });
}

function resizeCanvas() {
  const rect = elements.frame.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1,2);
  const width = Math.round(rect.width*dpr), height = Math.round(rect.height*dpr);
  if (elements.canvas.width !== width || elements.canvas.height !== height) { elements.canvas.width=width; elements.canvas.height=height; }
  return {width,height,dpr};
}

function renderLoop(now) {
  rafId = requestAnimationFrame(renderLoop);
  const size = resizeCanvas();
  ctx.clearRect(0,0,size.width,size.height);
  if (elements.video.readyState >= 2 && elements.video.currentTime !== lastVideoTime) {
    lastVideoTime = elements.video.currentTime;
    try {
      const result = poseLandmarker.detectForVideo(elements.video,now);
      const landmarks = result.landmarks?.[0];
      if (landmarks) processPose(landmarks,now,size);
      else handleTrackingLost(now);
    } catch (error) { console.warn('Pose frame skipped',error); }
  }
  if (state.phase === 'playing') updateGame(now);
}

function processPose(landmarks,now,size) {
  const shoulder=landmarks[12], elbow=landmarks[14], wrist=landmarks[16];
  const visible=[shoulder,elbow,wrist].every(point => (point.visibility ?? 1) >= CONFIG.minVisibility);
  if (!visible) { handleTrackingLost(now); return; }
  elements.badge.classList.add('found');
  elements.badge.innerHTML='<span></span> 右腕を検出中';
  drawArm(shoulder,elbow,wrist,size);
  if (!state.detectedSince) state.detectedSince=now;
  if (state.phase === 'ready' && now-state.detectedSince >= CONFIG.readyHoldMs) startCountdown();
  detectBeat(wrist.y,now);
}

function drawArm(shoulder,elbow,wrist,{width,height,dpr}) {
  const points=[shoulder,elbow,wrist].map(p=>({x:p.x*width,y:p.y*height}));
  ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#f2cf69'; ctx.lineWidth=4*dpr; ctx.shadowColor='#f2cf69'; ctx.shadowBlur=11*dpr;
  ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y); ctx.lineTo(points[1].x,points[1].y); ctx.lineTo(points[2].x,points[2].y); ctx.stroke();
  points.forEach((p,index)=>{ctx.beginPath();ctx.fillStyle=index===2?'#fff0a8':'#f2cf69';ctx.arc(p.x,p.y,(index===2?7:5)*dpr,0,Math.PI*2);ctx.fill();});
  const w=points[2]; ctx.strokeStyle='#fff8d5';ctx.lineWidth=3*dpr;ctx.beginPath();ctx.moveTo(w.x,w.y);ctx.lineTo(w.x-7*dpr,w.y-48*dpr);ctx.stroke(); ctx.restore();
}

function handleTrackingLost(now) {
  state.detectedSince=0;
  elements.badge.classList.remove('found');
  elements.badge.innerHTML='<span></span> 腕を探しています';
  if (state.phase==='ready') elements.readyText.textContent='右腕を大きく上下に振ってください';
  if (state.phase==='playing' && now-state.lastBeatAt>CONFIG.noBeatWarningMs) elements.hint.classList.remove('hidden');
}

function detectBeat(rawY,now) {
  if (state.wristY===null) { state.wristY=rawY;state.previousY=rawY;state.strokeTop=rawY;return; }
  state.wristY += (rawY-state.wristY)*CONFIG.wristSmoothing;
  const delta=state.wristY-state.previousY;
  let nextDirection=state.direction;
  if (delta>CONFIG.directionThreshold) nextDirection=1; // screen-down
  else if (delta<-CONFIG.directionThreshold) nextDirection=-1; // screen-up
  if (nextDirection===1) state.strokeTop=state.strokeTop===null?state.wristY:Math.min(state.strokeTop,state.wristY);
  const turnedUp=state.direction===1 && nextDirection===-1;
  const amplitude=state.strokeTop===null?0:state.wristY-state.strokeTop;
  if (turnedUp && amplitude>=CONFIG.minWristMovement && now-state.lastBeatAt>=CONFIG.minBeatInterval) registerBeat(now);
  if (turnedUp) state.strokeTop=state.wristY;
  if (nextDirection!==0) state.direction=nextDirection;
  state.previousY=state.wristY;
}

function registerBeat(now) {
  if (state.phase!=='playing') { state.lastBeatAt=now; return; }
  if (state.lastBeatAt>0) {
    const interval=now-state.lastBeatAt;
    if (interval>=CONFIG.minBeatInterval && interval<=1200) {
      state.intervals.push(interval);
      if (state.intervals.length>CONFIG.intervalSampleCount) state.intervals.shift();
      const sorted=[...state.intervals].sort((a,b)=>a-b);
      const usable=sorted.length>=4?sorted.slice(1,-1):sorted;
      const average=usable.reduce((sum,value)=>sum+value,0)/usable.length;
      state.targetBpm=clamp(60000/average,CONFIG.minBpm,CONFIG.maxBpm);
    }
  }
  state.lastBeatAt=now; state.beatTimes.push(now); state.beatCount++; elements.hint.classList.add('hidden');
}

async function startCountdown() {
  if (state.phase!=='ready') return;
  state.phase='countdown'; elements.readyText.textContent='準備OK！';
  for (const number of [3,2,1]) { elements.countdown.textContent=number; await sleep(800); }
  elements.countdown.textContent=''; elements.readyPanel.classList.add('hidden'); startGame();
}

async function startGame() {
  await ensureAudio(); resetDetection(); state.phase='playing'; state.gameStartedAt=performance.now(); state.lastBeatAt=state.gameStartedAt;
  elements.hud.classList.remove('hidden'); elements.bgm.currentTime=0; elements.bgm.volume=1; elements.bgm.playbackRate=1;
  elements.bgm.play().catch(()=>{});
}

function updateGame(now) {
  const elapsed=(now-state.gameStartedAt)/1000, remaining=Math.max(0,CONFIG.gameDuration-elapsed);
  const remainingSeconds=Math.ceil(remaining);
  elements.time.textContent=`${String(Math.floor(remainingSeconds/60)).padStart(2,'0')}:${String(remainingSeconds%60).padStart(2,'0')}`;
  if (now-state.lastBeatAt>CONFIG.returnToBaseAfterMs) state.targetBpm += (CONFIG.baseBpm-state.targetBpm)*.015;
  state.currentBpm += (state.targetBpm-state.currentBpm)*CONFIG.bpmSmoothing;
  const targetRate=clamp(state.currentBpm/CONFIG.baseBpm,.5,1.5);
  elements.bgm.playbackRate += (targetRate-elements.bgm.playbackRate)*CONFIG.playbackSmoothing;
  const shown=Math.round(state.currentBpm); elements.bpm.textContent=shown;
  if (state.intervals.length) state.bpmSamples.push(state.currentBpm);
  if (state.bpmSamples.length>3600) state.bpmSamples.shift();
  setTempoMood(shown);
  const stopped=now-state.lastBeatAt>CONFIG.noBeatWarningMs;
  elements.hint.classList.toggle('hidden',!stopped);
  if (remaining<=0 && !state.finalizing) finishGame();
}

function setTempoMood(bpm) {
  let label='MAESTOSO';
  if (bpm<=90) label='ゆったり · ADAGIO'; else if (bpm<=140) label='MAESTOSO'; else if (bpm<=165) label='情熱的 · ALLEGRO'; else label='速すぎ！ · PRESTISSIMO';
  elements.tempoLabel.textContent=label; elements.app.classList.toggle('fast',bpm>=166);
  if (bpm>=166 && elements.flash.dataset.active!=='1') { elements.flash.dataset.active='1';elements.flash.textContent='速すぎ！';elements.flash.classList.remove('show');void elements.flash.offsetWidth;elements.flash.classList.add('show');setTimeout(()=>elements.flash.dataset.active='0',1600); }
}

async function finishGame() {
  state.finalizing=true; state.phase='finished'; elements.app.classList.remove('fast'); elements.hint.classList.add('hidden');
  const startVolume=elements.bgm.volume;
  for(let step=12;step>=0;step--){elements.bgm.volume=startVolume*(step/12);await sleep(55);}
  elements.bgm.pause(); elements.bgm.volume=1; showResults();
}

function showResults() {
  const samples=state.bpmSamples.length?state.bpmSamples:[CONFIG.baseBpm];
  const average=samples.reduce((a,b)=>a+b,0)/samples.length;
  const variance=samples.reduce((sum,value)=>sum+(value-average)**2,0)/samples.length;
  const stability=clamp(Math.round(100-Math.sqrt(variance)*2.2),0,100);
  const min=Math.round(Math.min(...samples)), max=Math.round(Math.max(...samples)), avg=Math.round(average);
  $('averageBpm').textContent=avg; $('maxBpm').textContent=max; $('minBpm').textContent=min; $('beatCount').textContent=state.beatCount; $('stability').textContent=`${stability}%`; $('maestroTitle').textContent=getTitle(avg,stability);
  elements.stage.classList.add('hidden'); elements.result.classList.remove('hidden');
}

function getTitle(average,stability) {
  if (stability>=85 && state.beatCount>=8) return '鉄壁のマエストロ';
  if (average<80) return '眠れるマエストロ'; if (average<110) return '慎重派マエストロ'; if (average<140) return '正統派マエストロ'; if (average<165) return 'せっかちなマエストロ'; return '暴走するマエストロ';
}

function restart() { ensureAudio(); resetDetection(); state.phase='ready'; elements.result.classList.add('hidden');elements.stage.classList.remove('hidden');elements.readyPanel.classList.remove('hidden');elements.readyText.textContent='右腕を大きく上下に振ってください';elements.hud.classList.add('hidden'); }

elements.startButton.addEventListener('click',beginExperience);
elements.restartButton.addEventListener('click',restart);
document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});
document.addEventListener('gesturestart',event=>event.preventDefault(),{passive:false});
document.addEventListener('contextmenu',event=>event.preventDefault());
document.addEventListener('visibilitychange',()=>{ if(document.hidden && state.phase==='playing') elements.bgm.pause(); else if(!document.hidden && state.phase==='playing') elements.bgm.play().catch(()=>{}); });
window.addEventListener('beforeunload',()=>stream?.getTracks().forEach(track=>track.stop()));
