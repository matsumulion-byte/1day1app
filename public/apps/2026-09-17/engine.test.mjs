import test from 'node:test';
import assert from 'node:assert/strict';
import { Monorail, STATIONS, MAX_SPEED, evaluateStop } from './engine.mjs';
function tick(game, seconds, input = {}, dt = 1 / 60) { for (let t = 0; t < seconds; t += dt) game.update(dt, input); }
test('scoring thresholds are inclusive, symmetric and bounded', () => {
  for (const [d, rating] of [[0,'PERFECT'],[.5,'PERFECT'],[.501,'GOOD'],[2,'GOOD'],[2.001,'OK'],[5,'OK'],[5.001,'OVER'],[65,'OVER']]) {
    for (const sign of [-1, 1]) { const r = evaluateStop(d * sign); assert.equal(r.rating, rating); assert.ok(r.points >= 0 && r.points <= 1000); }
  }
  assert.equal(evaluateStop(0).points, 1000);
  assert.deepEqual(evaluateStop(18.1, true), { error:18.1, rating:'OVERRUN', points:0 });
});
test('departure, inertia, coasting, normal brake, emergency brake and speed cap', () => {
  const g = new Monorail(); tick(g, 1, {accelerate:true}); assert.equal(g.position,0);
  g.start(); const startSpeed=g.speed; g.update(1/60,{accelerate:true});
  assert.ok(g.speed>startSpeed); assert.ok(g.acceleration<.1);
  tick(g,8,{accelerate:true}); const fast=g.speed; assert.ok(fast>10);
  tick(g,2); assert.ok(g.speed>fast-.2); assert.ok(g.position>0);
  const normal=new Monorail(),emergency=new Monorail();normal.start();emergency.start();normal.speed=20;emergency.speed=20;
  tick(normal,6,{brake:true});tick(emergency,6,{emergency:true});assert.equal(emergency.speed,0);assert.ok(normal.speed>10);assert.ok(emergency.position<normal.position);
  tick(normal,20,{brake:true});assert.equal(normal.speed,0);assert.ok(normal.position>=0);
  const capped=new Monorail();capped.start();for(let i=0;i<1800;i++){capped.update(1/60,{accelerate:true});assert.ok(capped.speed<=MAX_SPEED);}
});
test('stopping far before the station does not consume a station and can resume', () => {
  const g=new Monorail();g.start();tick(g,5,{emergency:true});assert.equal(g.speed,0);assert.equal(g.phase,'running');assert.equal(g.results.length,0);
  tick(g,3,{accelerate:true});assert.ok(g.speed>2);
});
test('stopping must settle, then automatically departs and completes all three stations', () => {
  const g=new Monorail();g.start();
  for(let i=0;i<3;i++){
    g.position=STATIONS[i].position+.2;g.speed=0;g.acceleration=0;
    tick(g,.5,{brake:true});assert.equal(g.phase,'running');
    tick(g,.3,{brake:true});assert.equal(g.phase,'dwell');assert.equal(g.results.length,i+1);assert.equal(g.results[i].rating,'PERFECT');
    tick(g,4.1);assert.equal(g.phase,i===2?'complete':'running');
  }
  assert.equal(g.results.reduce((n,r)=>n+r.points,0),3000);
  g.start();assert.equal(g.position,0);assert.equal(g.results.length,0);assert.equal(g.station,0);assert.equal(g.phase,'running');
});
test('full continuous drive can stop at three stations without teleporting', () => {
  const g=new Monorail();g.start();let time=0;
  while(g.phase!=='complete'&&time<240){
    const stopDistance=g.speed*g.speed/3+g.speed*.36;
    const input=g.distance<=stopDistance+.05?{brake:true}:g.speed<17?{accelerate:true}:{};
    g.update(1/60,input);time+=1/60;
  }
  assert.equal(g.phase,'complete');assert.equal(g.results.length,3);assert.ok(g.results.every(r=>Math.abs(r.error)<2));
  console.log('Full drive:',Math.round(time)+'s',g.results.map(r=>({error:r.error,points:r.points})));
});
test('passing a station records zero exactly once and continues the route', () => {
  const g=new Monorail();g.start();let time=0;
  while(g.phase!=='complete'&&time<180){g.update(1/60,{accelerate:true});time+=1/60;}
  assert.equal(g.phase,'complete');assert.equal(g.results.length,3);assert.ok(g.results.every(r=>r.rating==='OVERRUN'&&r.points===0));
});
test('normal drive is stable at different simulation step sizes', () => {
  const positions=[1/30,1/60,1/120].map(dt=>{const g=new Monorail();g.start();tick(g,10,{accelerate:true},dt);tick(g,10,{brake:true},dt);return g.position;});
  assert.ok(Math.max(...positions)-Math.min(...positions)<.8);
});
