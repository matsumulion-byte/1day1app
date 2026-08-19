(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const app=$('app'), opening=$('opening'), game=$('game'), room=$('room'), sleepButton=$('sleepButton');
  const lightButton=$('lightButton'), mosquito=$('mosquito'), message=$('message'), status=$('status');
  const sleepFill=$('sleepFill'), clock=$('clock'), hand=$('hand'), flyby=$('flyby'), ending=$('ending');

  let audio, master, buzz=null, light=false, active=true, sleep=100, buzzCount=0, mosquitoNo=1;
  let visible=false, canHit=false, escapes=0, startedAt=0, buzzTimer=0, rareTimer=0, drainTimer=0, clockTimer=0;
  const timers = new Set();
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
  const vibrate=(pattern)=>navigator.vibrate?.(pattern);

  function initAudio(){
    audio = new (window.AudioContext || window.webkitAudioContext)();
    master=audio.createGain(); master.gain.value=.32; master.connect(audio.destination);
    audio.resume();
  }
  function startBuzz(){
    if(!active||light||buzz) return;
    buzzCount++;
    const now=audio.currentTime, osc=audio.createOscillator(), overtone=audio.createOscillator();
    const gain=audio.createGain(), trem=audio.createOscillator(), tremGain=audio.createGain();
    const pan=audio.createStereoPanner();
    osc.type='sawtooth'; osc.frequency.setValueAtTime(515+Math.random()*55,now);
    overtone.type='sine'; overtone.frequency.setValueAtTime(1030+Math.random()*80,now);
    trem.type='sine'; trem.frequency.value=7+Math.random()*3; tremGain.gain.value=.012;
    gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(.035,now+1.1);
    gain.gain.linearRampToValueAtTime(.055,now+4.5);
    osc.frequency.linearRampToValueAtTime(548+Math.random()*35,now+5);
    let p=[-.82,.82,0][Math.floor(Math.random()*3)]; pan.pan.setValueAtTime(p,now);
    if(buzzCount>=2){pan.pan.linearRampToValueAtTime(p===0?(Math.random()>.5?.85:-.85):-p,now+3.6)}
    osc.connect(gain); overtone.connect(gain); trem.connect(tremGain); tremGain.connect(gain.gain); gain.connect(pan); pan.connect(master);
    osc.start(); overtone.start(); trem.start();
    buzz={osc,overtone,trem,gain,pan};
    status.textContent='ブーーーーン……'; vibrate(18);
    if(buzzCount>=3) later(()=>earPass(),1800+Math.random()*2600);
    if(buzzCount>=4&&Math.random()<.4) later(edgeFlyby,900+Math.random()*1800);
    if(Math.random()<.13) rareTimer=later(()=>pauseBuzz(),1800+Math.random()*1800);
  }
  function stopBuzz(){
    if(!buzz)return;
    const b=buzz, now=audio.currentTime; b.gain.gain.cancelScheduledValues(now); b.gain.gain.setTargetAtTime(.0001,now,.035);
    later(()=>{try{b.osc.stop();b.overtone.stop();b.trem.stop()}catch(e){}},180);
    buzz=null; status.textContent=light?'どこにいる……':'静かだ。';
  }
  function earPass(){
    if(!buzz||light)return;
    const now=audio.currentTime, from=Math.random()>.5?-1:1;
    buzz.pan.pan.cancelScheduledValues(now); buzz.pan.pan.setValueAtTime(from,now); buzz.pan.pan.linearRampToValueAtTime(-from,now+.8);
    buzz.gain.gain.cancelScheduledValues(now); buzz.gain.gain.setValueAtTime(.045,now); buzz.gain.gain.linearRampToValueAtTime(.15,now+.28); buzz.gain.gain.exponentialRampToValueAtTime(.035,now+.9);
    status.textContent='ﾌﾞｩｩｩｩﾝ！！'; vibrate([20,35,45]); later(()=>{if(buzz)status.textContent='ブーーーーン……'},1000);
  }
  function pauseBuzz(){
    if(!buzz||light)return; stopBuzz(); status.textContent='……'; later(()=>{if(!light&&active)startBuzz()},1800+Math.random()*1600);
  }
  function edgeFlyby(){flyby.classList.remove('go');void flyby.offsetWidth;flyby.classList.add('go');later(()=>flyby.classList.remove('go'),900)}
  function scheduleBuzz(min=2000,max=7000){clearTimeout(buzzTimer);status.textContent='静かだ。';buzzTimer=later(startBuzz,min+Math.random()*(max-min))}

  function toggleLight(){
    if(!active)return;
    light=!light; room.classList.toggle('lit',light); lightButton.classList.toggle('on',light);
    lightButton.textContent=light?'電気を消す':'電気をつける';
    if(light){stopBuzz();revealAttempt()}else{hideMosquito();scheduleBuzz(2200,buzzCount<2?5000:7000)}
  }
  function revealAttempt(){
    hideMosquito();
    if(buzzCount>=4) edgeFlyby();
    const roll=Math.random();
    let kind=roll<.4?'none':roll<.7?'flash':roll<.9?'move':'easy';
    if(buzzCount<2&&kind==='easy')kind='none';
    if(mosquitoNo===2&&roll>.2)kind=roll>.62?'easy':'move';
    if(kind==='none'){status.textContent=['いない。','どこにもいない。','気のせいか……'][Math.floor(Math.random()*3)];return}
    const x=kind==='easy'?45+Math.random()*25:12+Math.random()*76;
    const y=kind==='easy'?35+Math.random()*25:18+Math.random()*66;
    mosquito.style.left=x+'%';mosquito.style.top=y+'%';mosquito.className='mosquito show'+(kind==='move'?' moving':'');
    visible=canHit=true;status.textContent=kind==='flash'?'いた……！':'どこだ……';
    if(kind==='flash')later(()=>hideMosquito(),650+Math.random()*350);
  }
  function hideMosquito(){visible=canHit=false;mosquito.className='mosquito'}
  function showMessage(text,duration=2000){message.textContent=text;message.classList.remove('show');void message.offsetWidth;message.classList.add('show');later(()=>message.classList.remove('show'),duration)}
  function slap(x,y){hand.style.left=x+'px';hand.style.top=y+'px';hand.classList.remove('hit');void hand.offsetWidth;hand.classList.add('hit');later(()=>hand.classList.remove('hit'),400)}
  function slapSound(hit){
    if(!audio)return;const now=audio.currentTime, osc=audio.createOscillator(),gain=audio.createGain();osc.type='square';osc.frequency.setValueAtTime(hit?145:210,now);osc.frequency.exponentialRampToValueAtTime(55,now+.09);gain.gain.setValueAtTime(hit?.15:.045,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.12);osc.connect(gain);gain.connect(master);osc.start();osc.stop(now+.13)
  }
  function roomTap(e){
    if(!light||!active)return;const r=room.getBoundingClientRect();slap(e.clientX-r.left,e.clientY-r.top);slapSound(false);
    status.textContent=visible?'惜しい。':'いない……';
  }
  function hitMosquito(e){
    e.stopPropagation();if(!canHit||!active)return;
    const forcedEscape=mosquitoNo===1&&buzzCount>=5&&escapes<1;
    const escape=forcedEscape||(mosquitoNo===1&&escapes<2&&Math.random()<.38);
    if(escape){escapes++;canHit=false;mosquito.classList.add('escape');showMessage('逃げられた');status.textContent='スッ';vibrate(22);later(hideMosquito,600);return}
    slapSound(true);vibrate([35,30,55]);hideMosquito();showMessage('バシッ！');active=false;stopBuzz();
    later(()=>showMessage('やった。',2500),700);
    if(mosquitoNo===1) later(secondMosquito,3500+Math.random()*1500); else later(finish,2300);
  }
  function secondMosquito(){
    light=false;room.classList.remove('lit');lightButton.classList.remove('on');lightButton.textContent='電気をつける';active=true;mosquitoNo=2;escapes=0;status.textContent='静かだ。';
    later(()=>{showMessage('もう一匹いました',3000);startBuzz()},3300+Math.random()*1600);
  }
  function finish(){
    active=false;stopBuzz();showMessage('今度こそ寝られる',2600);
    later(()=>{app.classList.add('ended');ending.setAttribute('aria-hidden','false')},2800);
  }
  function gameOver(){
    if(!active)return;active=false;stopBuzz();showMessage('寝不足',3000);status.textContent='GAME OVER';lightButton.disabled=true;
    later(()=>{lightButton.disabled=false;location.reload()},3500);
  }
  function updateSleep(){
    if(!active)return;let drain=.015;if(light)drain=.12;else if(buzz)drain=.075;sleep=Math.max(0,sleep-drain);sleepFill.style.width=sleep+'%';if(sleep<25)sleepFill.style.background='#9e7775';if(sleep<=0)gameOver();
  }
  function updateClock(){
    const minutes=Math.min(36,Math.floor((Date.now()-startedAt)/4500));const total=157+minutes;clock.textContent=`AM ${String(Math.floor(total/60)).padStart(1,'0')}:${String(total%60).padStart(2,'0')}`;
  }
  function begin(){
    initAudio();startedAt=Date.now();app.classList.add('playing');game.setAttribute('aria-hidden','false');opening.setAttribute('aria-hidden','true');scheduleBuzz(2000,5000);drainTimer=setInterval(updateSleep,100);clockTimer=setInterval(updateClock,1000);
  }
  sleepButton.addEventListener('click',begin,{once:true});lightButton.addEventListener('click',toggleLight);
  room.addEventListener('pointerdown',roomTap);mosquito.addEventListener('pointerdown',hitMosquito);
  $('againButton').addEventListener('click',()=>location.reload());document.addEventListener('visibilitychange',()=>{if(audio&&document.visibilityState==='visible')audio.resume()});
})();
