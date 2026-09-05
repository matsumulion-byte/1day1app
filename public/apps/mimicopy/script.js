const $ = (id) => document.getElementById(id);
const ui = Object.fromEntries(['welcome','workspace','audioFile','audio','trackName','waveform','playButton','skipBack','skipForward','currentTime','duration','loopButton','speedSelect','selectionLabel','inTime','outTime','rangeDuration','instrument','bpm','subdivision','analyzeButton','emptyScore','analysisProgress','progressBar','progressText','scoreArea','scoreCanvas','exportMidi','status'].map(id=>[id,$(id)]));
const waveCtx=ui.waveform.getContext('2d'), scoreCtx=ui.scoreCanvas.getContext('2d');
let audioContext, audioBuffer, objectUrl, peaks=[], notes=[], selectedNote=-1, dragStart=null, raf=0;
const state={start:0,end:0,loop:true,dragging:false,analyzing:false};
const noteNames=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=(s)=>`${Math.floor(s/60)}:${(s%60).toFixed(1).padStart(4,'0')}`;

ui.audioFile.addEventListener('change',e=>loadFile(e.target.files[0]));
async function loadFile(file){
  if(!file)return;
  ui.status.textContent='音源を読み込んでいます…';
  try{
    if(objectUrl)URL.revokeObjectURL(objectUrl); objectUrl=URL.createObjectURL(file); ui.audio.src=objectUrl;
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    audioBuffer=await audioContext.decodeAudioData(await file.arrayBuffer());
    state.start=0;state.end=audioBuffer.duration;notes=[];selectedNote=-1;
    ui.trackName.textContent=file.name.replace(/\.[^.]+$/,'');ui.duration.textContent=fmt(audioBuffer.duration);
    ui.welcome.classList.add('hidden');ui.workspace.classList.remove('hidden');
    calculatePeaks();resizeCanvases();drawWave();showEmptyScore();updateRangeLabels();
    ui.status.textContent=`${fmt(audioBuffer.duration)} の音源を端末内に読み込みました。波形をドラッグしてソロ区間を選んでください。`;
  }catch(err){console.error(err);ui.status.textContent='この音源を読み込めませんでした。MP3、WAV、M4Aをお試しください。';}
}
function calculatePeaks(){const ch=audioBuffer.getChannelData(0),count=1200,step=Math.max(1,Math.floor(ch.length/count));peaks=[];for(let i=0;i<count;i++){let min=0,max=0;for(let j=i*step;j<Math.min(ch.length,(i+1)*step);j++){min=Math.min(min,ch[j]);max=Math.max(max,ch[j]);}peaks.push([min,max]);}}
function resizeCanvases(){for(const canvas of [ui.waveform,ui.scoreCanvas]){const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.round(parseFloat(getComputedStyle(canvas).height)*dpr);}}
function drawWave(){if(!audioBuffer)return;const {width:w,height:h}=ui.waveform,dpr=Math.min(devicePixelRatio||1,2);waveCtx.clearRect(0,0,w,h);waveCtx.fillStyle='#171a17';waveCtx.fillRect(0,0,w,h);const x1=state.start/audioBuffer.duration*w,x2=state.end/audioBuffer.duration*w;waveCtx.fillStyle='#263f35';waveCtx.fillRect(x1,0,x2-x1,h);waveCtx.strokeStyle='#d9d1c0';waveCtx.lineWidth=Math.max(1,dpr);waveCtx.beginPath();peaks.forEach(([mn,mx],i)=>{const x=i/(peaks.length-1)*w;waveCtx.moveTo(x,h/2+mn*h*.42);waveCtx.lineTo(x,h/2+mx*h*.42)});waveCtx.stroke();waveCtx.fillStyle='#e9572b';waveCtx.fillRect(x1-1*dpr,0,2*dpr,h);waveCtx.fillRect(x2-1*dpr,0,2*dpr,h);if(ui.audio.duration){const px=ui.audio.currentTime/ui.audio.duration*w;waveCtx.fillStyle='#ffb35c';waveCtx.fillRect(px,0,2*dpr,h);}ui.selectionLabel.classList.toggle('hidden',state.dragging||state.start>0||state.end<audioBuffer.duration);}
function eventTime(e){const r=ui.waveform.getBoundingClientRect(),x=clamp((e.clientX-r.left)/r.width,0,1);return x*audioBuffer.duration;}
ui.waveform.addEventListener('pointerdown',e=>{if(!audioBuffer)return;ui.waveform.setPointerCapture(e.pointerId);state.dragging=true;dragStart=eventTime(e);state.start=dragStart;state.end=dragStart;drawWave();});
ui.waveform.addEventListener('pointermove',e=>{if(!state.dragging)return;const t=eventTime(e);state.start=Math.min(dragStart,t);state.end=Math.max(dragStart,t);drawWave();updateRangeLabels();});
ui.waveform.addEventListener('pointerup',()=>{state.dragging=false;if(state.end-state.start<.25){state.start=0;state.end=audioBuffer.duration;}ui.audio.currentTime=state.start;updateRangeLabels();drawWave();});
function updateRangeLabels(){ui.inTime.textContent=fmt(state.start);ui.outTime.textContent=fmt(state.end);const d=state.end-state.start;ui.rangeDuration.textContent=d>=audioBuffer.duration-.1?'全体':fmt(d);}

ui.playButton.onclick=()=>{if(ui.audio.paused){if(ui.audio.currentTime<state.start||ui.audio.currentTime>=state.end)ui.audio.currentTime=state.start;ui.audio.play();}else ui.audio.pause();};
ui.audio.addEventListener('play',()=>{ui.playButton.textContent='Ⅱ';tick()});ui.audio.addEventListener('pause',()=>{ui.playButton.textContent='▶';cancelAnimationFrame(raf)});
function tick(){ui.currentTime.textContent=fmt(ui.audio.currentTime);if(state.loop&&ui.audio.currentTime>=state.end){ui.audio.currentTime=state.start;ui.audio.play();}drawWave();if(!ui.audio.paused)raf=requestAnimationFrame(tick);}
ui.skipBack.onclick=()=>ui.audio.currentTime=clamp(ui.audio.currentTime-5,state.start,state.end);ui.skipForward.onclick=()=>ui.audio.currentTime=clamp(ui.audio.currentTime+5,state.start,state.end);
ui.loopButton.onclick=()=>{state.loop=!state.loop;ui.loopButton.classList.toggle('active',state.loop)};ui.speedSelect.onchange=()=>ui.audio.playbackRate=Number(ui.speedSelect.value);

ui.analyzeButton.onclick=analyze;
async function analyze(){
  if(!audioBuffer||state.analyzing)return;state.analyzing=true;ui.analyzeButton.disabled=true;ui.emptyScore.classList.add('hidden');ui.scoreArea.classList.add('hidden');ui.analysisProgress.classList.remove('hidden');ui.status.textContent='';
  const sr=audioBuffer.sampleRate,ch=audioBuffer.getChannelData(0),win=4096,hop=1024,from=Math.floor(state.start*sr),to=Math.floor(state.end*sr);let frames=[];
  const total=Math.max(1,Math.floor((to-from-win)/hop));
  for(let n=0,pos=from;pos+win<to;pos+=hop,n++){
    const result=detectPitch(ch,pos,win,sr);frames.push({time:pos/sr,...result});
    if(n%20===0){ui.progressBar.style.width=`${Math.min(88,n/total*88)}%`;ui.progressText.textContent=`音程を聴き取っています… ${Math.round(n/total*100)}%`;await new Promise(r=>setTimeout(r,0));}
  }
  ui.progressBar.style.width='94%';ui.progressText.textContent='フレーズを音符にまとめています…';await new Promise(r=>setTimeout(r,80));
  notes=segmentFrames(frames);quantizeNotes();selectedNote=-1;ui.progressBar.style.width='100%';
  setTimeout(()=>{ui.analysisProgress.classList.add('hidden');ui.scoreArea.classList.remove('hidden');ui.exportMidi.disabled=!notes.length;drawScore();ui.status.textContent=notes.length?`${notes.length}個の音符候補を検出しました。オレンジ色は要確認です。`:'音符を検出できませんでした。サックスが明瞭な短い区間を選び直してください。';state.analyzing=false;ui.analyzeButton.disabled=false;},180);
}
function detectPitch(data,start,size,sr){
  let rms=0;for(let i=0;i<size;i++)rms+=data[start+i]*data[start+i];rms=Math.sqrt(rms/size);if(rms<.012)return{midi:null,confidence:0};
  const minLag=Math.floor(sr/1200),maxLag=Math.min(size-2,Math.ceil(sr/70));let best=0,bestLag=0,zero=0;
  for(let i=0;i<size;i++)zero+=data[start+i]*data[start+i];
  for(let lag=minLag;lag<=maxLag;lag++){let corr=0,a=0,b=0;for(let i=0;i<size-lag;i++){const x=data[start+i],y=data[start+i+lag];corr+=x*y;a+=x*x;b+=y*y;}const norm=corr/Math.sqrt(a*b||1);if(norm>best){best=norm;bestLag=lag;}}
  if(best<.62)return{midi:null,confidence:best};let lag=bestLag;if(bestLag>minLag&&bestLag<maxLag){const c=[];for(const l of [bestLag-1,bestLag,bestLag+1]){let v=0;for(let i=0;i<size-l;i++)v+=data[start+i]*data[start+i+l];c.push(v);}const den=2*(2*c[1]-c[0]-c[2]);if(den)lag+=clamp((c[2]-c[0])/den,-.5,.5);}
  const hz=sr/lag;return{midi:69+12*Math.log2(hz/440),confidence:best};
}
function segmentFrames(frames){const out=[];let group=[];const flush=()=>{if(group.length<2){group=[];return;}const mids=group.map(f=>f.midi).sort((a,b)=>a-b),median=mids[Math.floor(mids.length/2)],start=group[0].time,end=group[group.length-1].time+1024/audioBuffer.sampleRate;if(end-start>=.055)out.push({pitch:Math.round(median),start,end,confidence:group.reduce((s,f)=>s+f.confidence,0)/group.length});group=[]};for(const f of frames){if(f.midi==null){flush();continue;}if(group.length&&Math.abs(f.midi-group[group.length-1].midi)>1.45)flush();group.push(f);}flush();return out;}
function quantizeNotes(){const bpm=clamp(Number(ui.bpm.value)||120,30,300),sub=Number(ui.subdivision.value),grid=60/bpm/sub;for(const n of notes){n.start=Math.round((n.start-state.start)/grid)*grid+state.start;n.end=Math.max(n.start+grid,Math.round((n.end-state.start)/grid)*grid+state.start);}notes.sort((a,b)=>a.start-b.start);for(let i=1;i<notes.length;i++)if(notes[i].start<notes[i-1].end)notes[i-1].end=notes[i].start;notes=notes.filter(n=>n.end>n.start);}
function showEmptyScore(){ui.emptyScore.classList.remove('hidden');ui.scoreArea.classList.add('hidden');ui.analysisProgress.classList.add('hidden');ui.exportMidi.disabled=true;}
function drawScore(){
  const c=ui.scoreCanvas,ctx=scoreCtx,w=c.width,h=c.height,dpr=Math.min(devicePixelRatio||1,2),left=65*dpr,right=25*dpr,top=72*dpr,gap=14*dpr;ctx.clearRect(0,0,w,h);ctx.fillStyle='#fbfaf5';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#777269';ctx.lineWidth=dpr;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(left,top+i*gap);ctx.lineTo(w-right,top+i*gap);ctx.stroke();}ctx.fillStyle='#171a17';ctx.font=`${48*dpr}px Georgia`;ctx.fillText('𝄞',18*dpr,top+4*gap);
  if(!notes.length){ctx.font=`${13*dpr}px Georgia`;ctx.fillStyle='#76756e';ctx.fillText('音符を検出できませんでした',left+30*dpr,top+2*gap);return;}
  const minT=state.start,maxT=state.end,span=Math.max(.1,maxT-minT),trans=Number(ui.instrument.value);notes.forEach((n,i)=>{const pitch=n.pitch+trans,x=left+(n.start-minT)/span*(w-left-right),x2=left+(n.end-minT)/span*(w-left-right),step=(pitch-71)*-3.5*dpr,y=top+2*gap+step;ctx.strokeStyle=i===selectedNote?'#e9572b':'#171a17';ctx.fillStyle=n.confidence>.76?(i===selectedNote?'#e9572b':'#264a3d'):'#e9572b';ctx.lineWidth=2*dpr;ctx.beginPath();ctx.ellipse(x,y,6.5*dpr,4.5*dpr,-.25,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x+5*dpr,y);ctx.lineTo(x+5*dpr,y-28*dpr);ctx.stroke();if(x2-x>17*dpr){ctx.beginPath();ctx.moveTo(x+7*dpr,y-27*dpr);ctx.lineTo(Math.max(x+8*dpr,x2-3*dpr),y-27*dpr);ctx.stroke();}ctx.font=`${9*dpr}px ui-monospace`;ctx.fillStyle='#76756e';ctx.fillText(noteNames[(pitch%12+12)%12],x-6*dpr,top+6.5*gap);n._hit={x,y,r:13*dpr};});}
ui.scoreCanvas.addEventListener('pointerdown',e=>{const r=ui.scoreCanvas.getBoundingClientRect(),sx=ui.scoreCanvas.width/r.width,sy=ui.scoreCanvas.height/r.height,x=(e.clientX-r.left)*sx,y=(e.clientY-r.top)*sy;let best=-1,dist=Infinity;notes.forEach((n,i)=>{const d=Math.hypot(x-n._hit.x,y-n._hit.y);if(d<n._hit.r&&d<dist){best=i;dist=d;}});selectedNote=best;if(best>=0){ui.audio.currentTime=notes[best].start;ui.status.textContent=`${noteNames[(notes[best].pitch+Number(ui.instrument.value)+120)%12]} を選択中（実音 MIDI ${notes[best].pitch}）`;}drawScore();});
document.addEventListener('keydown',e=>{if(selectedNote<0||['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();notes[selectedNote].pitch+=e.key==='ArrowUp'?1:-1;drawScore();}else if(e.key==='Delete'||e.key==='Backspace'){notes.splice(selectedNote,1);selectedNote=-1;drawScore();}else if(e.code==='Space'){e.preventDefault();ui.audio.currentTime=notes[selectedNote].start;ui.audio.play();setTimeout(()=>ui.audio.pause(),Math.max(100,(notes[selectedNote].end-notes[selectedNote].start)*1000));}});
ui.instrument.onchange=drawScore;ui.bpm.onchange=()=>{if(notes.length){quantizeNotes();drawScore()}};ui.subdivision.onchange=()=>{if(notes.length){quantizeNotes();drawScore()}};

ui.exportMidi.onclick=()=>{if(!notes.length)return;const bpm=clamp(Number(ui.bpm.value)||120,30,300),tpq=480,events=[];notes.forEach(n=>{const tick=Math.max(0,Math.round((n.start-state.start)*bpm/60*tpq)),off=Math.max(tick+1,Math.round((n.end-state.start)*bpm/60*tpq));events.push({tick,on:true,p:n.pitch},{tick:off,on:false,p:n.pitch});});events.sort((a,b)=>a.tick-b.tick||(a.on?1:-1));const body=[0,0xff,0x51,3,...intBytes(Math.round(60000000/bpm),3)];let last=0;for(const e of events){body.push(...varLen(e.tick-last),e.on?0x90:0x80,e.p,e.on?92:0);last=e.tick;}body.push(0,0xff,0x2f,0);const header=[...str('MThd'),0,0,0,6,0,0,0,1,(tpq>>8)&255,tpq&255],track=[...str('MTrk'),...intBytes(body.length,4),...body],blob=new Blob([new Uint8Array([...header,...track])],{type:'audio/midi'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${ui.trackName.textContent || 'solo'}-transcription.mid`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
function str(s){return [...s].map(x=>x.charCodeAt(0))}function intBytes(n,len){return Array.from({length:len},(_,i)=>(n>>(8*(len-i-1)))&255)}function varLen(n){let b=n&127,out=[];while(n>>=7){b<<=8;b|=(n&127)|128;}while(true){out.push(b&255);if(b&128)b>>=8;else break;}return out;}
window.addEventListener('resize',()=>{if(!audioBuffer)return;resizeCanvases();drawWave();if(notes.length)drawScore();});
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
