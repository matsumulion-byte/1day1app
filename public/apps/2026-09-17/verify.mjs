// Browser integration fixture. Opens independently of the production entry page.
const frame = document.getElementById('game');
const log = document.getElementById('log');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let activeKey = null;
function key(code) {
  const win = frame.contentWindow;
  if (activeKey === code) return;
  if (activeKey) win.dispatchEvent(new win.KeyboardEvent('keyup', { code: activeKey, bubbles: true, cancelable: true }));
  if (code) win.dispatchEvent(new win.KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
  activeKey = code;
}
function assert(value, message) { if (!value) throw new Error(message); }
async function reset() {
  key(null);frame.src = '/apps/2026-09-17/?verify=' + Date.now();
  await new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
  const doc = frame.contentDocument;
  assert(!doc.getElementById('start').disabled, 'WebGL initialized');
  doc.getElementById('start').click();return doc;
}
async function runDrive() {
  document.getElementById('run').disabled = true;
  document.getElementById('mobile').disabled = true;
  try {
    const doc = await reset();
    key('KeyW');await wait(3000);assert(+doc.getElementById('speed').textContent > 20, 'W accelerates');
    key('Space');await wait(3000);assert(+doc.getElementById('speed').textContent === 0, 'Emergency brake stops');
    assert(doc.getElementById('result').hidden, 'Early stop does not consume station');
    key(null);let count = 0, lastStation = '', seenDwell = false;const deadline = Date.now() + 200000;
    while(doc.getElementById('complete').hidden && Date.now() < deadline) {
      const speed = +doc.getElementById('speed').textContent / 3.6;
      const distance = Number(doc.getElementById('distance').textContent.replace('−', '-'));
      const station = doc.getElementById('station-en').textContent;
      if (!doc.getElementById('result').hidden) {
        key(null);
        if (!seenDwell) { count++; log.textContent = 'PASS keyboard / emergency / early stop\nStop '+count+': '+doc.getElementById('rating').textContent+' '+doc.getElementById('stop-error').textContent;seenDwell=true; }
      } else {
        seenDwell=false;
        key(distance <= speed * speed / 3 + speed * .36 + 2 ? 'ArrowDown' : speed < 17 ? 'ArrowUp' : null);
        if (lastStation !== station) { lastStation=station;log.textContent='Driving '+station+' / verified stops '+count; }
      }
      await wait(40);
    }
    key(null);assert(!doc.getElementById('complete').hidden, 'Completes three stations');
    assert(doc.querySelectorAll('.score-row').length===3, 'Three score rows');
    const total = doc.getElementById('total-score').textContent;
    log.textContent='PASS — acceleration, emergency, early stop, 3 station stops, automatic departure, total '+total;
    await wait(1500);doc.getElementById('retry').click();await wait(100);
    assert(doc.getElementById('complete').hidden && doc.getElementById('station-count').textContent==='01 / 03', 'Retry resets');
    log.textContent+=' / RETRY passed';
    key('Space');await wait(1500);key(null);
  } catch(error) { log.textContent='FAIL '+error.message; }
  document.getElementById('run').disabled=false;document.getElementById('mobile').disabled=false;
}
async function runTouch() {
  document.getElementById('run').disabled=true;document.getElementById('mobile').disabled=true;
  try {
    const doc=await reset();const win=frame.contentWindow;
    const controls=[...doc.querySelectorAll('[data-control]')];
    for(const button of controls){const r=button.getBoundingClientRect();assert(r.height>=44&&r.top>=0&&r.bottom<=win.innerHeight,'Touch controls are visible and ≥44px');}
    const press=(button,type)=>button.dispatchEvent(new win.PointerEvent(type,{pointerId:1,pointerType:'touch',bubbles:true,cancelable:true}));
    // Synthetic pointer events have no active pointer capture, so only this fixture stubs capture.
    for(const button of controls)button.setPointerCapture=()=>{};
    press(controls[0],'pointerdown');await wait(3000);assert(+doc.getElementById('speed').textContent>20,'Hold accelerates');
    press(controls[0],'pointerup');await wait(150);assert(doc.getElementById('drive-mode').textContent==='COAST','Release coasts');
    press(controls[1],'pointerdown');await wait(6000);press(controls[1],'pointerup');assert(+doc.getElementById('speed').textContent===0,'Hold brakes');
    const event=new win.MouseEvent('dblclick',{bubbles:true,cancelable:true});controls[0].dispatchEvent(event);assert(event.defaultPrevented,'Double tap default blocked');
    assert(win.scrollX===0&&win.scrollY===0,'No scrolling');assert(!win.getSelection().toString(),'No selected text');
    log.textContent='PASS — mobile controls visible, hold acceleration / brake, release, double tap, no scroll or selection';
  }catch(error){log.textContent='FAIL '+error.message;}
  document.getElementById('run').disabled=false;document.getElementById('mobile').disabled=false;
}
document.getElementById('run').addEventListener('click',runDrive);
document.getElementById('mobile').addEventListener('click',runTouch);
