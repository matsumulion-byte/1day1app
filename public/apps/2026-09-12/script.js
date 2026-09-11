'use strict';
// Flight stays in the X/Z plane; the geometry and chase camera are fully 3D.
const CONFIG={thrust:1.05,reverseThrust:.85,turnRate:1.0,maxSpeed:.65,maxAngle:8,portHalfWidth:.65,fuelBurn:2.8,turnBurn:.35,startDistance:19};
const $=id=>document.getElementById(id);
function report(title,message){$('resultTitle').textContent=title;$('message').textContent=message;$('result').classList.add('show')}
if(!window.THREE){report('読み込みエラー','3Dライブラリを読み込めませんでした。インターネット接続を確認して再読み込みしてください。');$('again').onclick=()=>location.reload()}else{boot()}
function boot(){
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false})}catch(e){report('3D表示エラー','このブラウザではWebGLを利用できません。別のブラウザでお試しください。');return}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x06090d);document.body.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(49,1,.1,500);scene.add(new THREE.HemisphereLight(0xb8d9ed,0x26323b,1.3));const sun=new THREE.DirectionalLight(0xffffff,1.4);sun.position.set(-12,20,10);scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});const white=mat(0xb3bdc6),dark=mat(0x293641),panel=mat(0x172e44),green=mat(0x89c7b6,{emissive:0x39695b});
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m}
const station=new THREE.Group();scene.add(station);
mesh(new THREE.CylinderGeometry(2.6,2.6,2.5,16),white,station,0,0,-2).rotation.x=Math.PI/2;
mesh(new THREE.TorusGeometry(3.4,.18,6,32),dark,station,0,0,-2);
mesh(new THREE.CylinderGeometry(1.14,1.14,1.2,12),dark,station,0,0,-.6).rotation.x=Math.PI/2;
mesh(new THREE.CircleGeometry(.9,16),mat(0x080e14),station,0,0,.012);
mesh(new THREE.TorusGeometry(.95,.065,5,24),green,station);
for(const x of [-5.1,5.1]){mesh(new THREE.BoxGeometry(4.5,.10,2.7),panel,station,x,0,-2.1);for(let i=-2;i<=2;i++)mesh(new THREE.BoxGeometry(.025,.12,2.7),white,station,x+i*.85,0,-2.1);mesh(new THREE.BoxGeometry(3,.18,.18),dark,station,x*.65,0,-2.1)}
// Ground-plane guide marks indicate the safe centerline without obscuring the ship.
for(let z=2;z<=17;z+=2){const line=mesh(new THREE.BoxGeometry(.035,.025,.7),green,scene,0,-.8,z);for(const x of [-.65,.65])mesh(new THREE.BoxGeometry(.16,.025,.035),green,scene,x,-.8,z)}
const ship=new THREE.Group();scene.add(ship);mesh(new THREE.CylinderGeometry(.30,.55,1.3,6),white,ship,0,0,0).rotation.x=-Math.PI/2;
mesh(new THREE.ConeGeometry(.3,.65,6),white,ship,0,0,-.95).rotation.x=-Math.PI/2;
mesh(new THREE.BoxGeometry(.42,.13,.40),panel,ship,0,.29,-.34);
for(const x of [-.55,.55]){mesh(new THREE.BoxGeometry(.42,.13,.85),dark,ship,x,-.10,.27);mesh(new THREE.CylinderGeometry(.15,.18,.3,8),dark,ship,x,0,.62).rotation.x=Math.PI/2}
const flame=mesh(new THREE.ConeGeometry(.25,1,7),new THREE.MeshBasicMaterial({color:0xa4dce8,transparent:true,opacity:.8}),ship,0,0,1.1);flame.rotation.x=Math.PI/2;
const reverseFlames=[];for(const x of [-.55,.55]){const f=mesh(new THREE.ConeGeometry(.09,.45,6),new THREE.MeshBasicMaterial({color:0xd2e8ef}),ship,x,0,-.36);f.rotation.x=-Math.PI/2;reverseFlames.push(f)}
const positions=[];let seed=12345;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};for(let i=0;i<650;i++)positions.push((random()-.5)*350,(random()-.5)*220,(random()-.5)*350);const stars=new THREE.BufferGeometry();stars.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xa4b2c2,size:.19})));
mesh(new THREE.SphereGeometry(17,24,16),mat(0x223a4d),scene,-65,-23,-100);
const keys=new Set(),pointers=new Map();let state,x,z,vx,vz,heading,fuel,last=0,elapsed=0;
function clearInputs(){keys.clear();pointers.clear();document.querySelectorAll('.held').forEach(e=>e.classList.remove('held'))}
function reset(){state='APPROACH';x=0;z=CONFIG.startDistance;vx=0;vz=0;heading=0;fuel=100;elapsed=0;clearInputs();ship.visible=true;ship.rotation.set(0,0,0);$('result').classList.remove('show');camera.position.set(0,10,z+13);updateHUD()}
function finish(ok,reason){state=ok?'DOCKED':'CRASH';clearInputs();report(ok?'DOCKED':'CRASH',reason);$('again').focus()}
const mapping={ArrowUp:'forward',w:'forward',ArrowDown:'reverse',s:'reverse',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
addEventListener('keydown',e=>{const k=mapping[e.key]||mapping[e.key.toLowerCase()];if(k){e.preventDefault();keys.add(k)}if(e.key.toLowerCase()==='r'&&!e.repeat)reset()});addEventListener('keyup',e=>keys.delete(mapping[e.key]||mapping[e.key.toLowerCase()]));addEventListener('blur',clearInputs);document.addEventListener('visibilitychange',()=>{clearInputs();last=0});
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.key);b.classList.add('held')});const release=e=>{pointers.delete(e.pointerId);b.classList.remove('held')};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release)}
for(const event of ['dblclick','gesturestart','contextmenu'])document.addEventListener(event,e=>e.preventDefault(),{passive:false});$('retry').onclick=reset;$('again').onclick=reset;
const active=k=>keys.has(k)||[...pointers.values()].includes(k);const angle=()=>Math.abs(heading)*180/Math.PI;
function updateHUD(){const speed=Math.hypot(vx,vz);$('speed').textContent=speed.toFixed(2);$('speed').className=speed<=CONFIG.maxSpeed?'safe':'bad';$('angle').textContent=angle().toFixed(1);$('angle').className=angle()<=CONFIG.maxAngle?'safe':'bad';$('fuel').textContent=Math.ceil(fuel);$('bar').style.width=fuel+'%';$('status').textContent='● '+state;$('distance').textContent='ポートまで '+Math.max(0,z-1.28).toFixed(1)+' m · 中心ずれ '+Math.abs(x).toFixed(1)+' m'}
function step(dt){if(state!=='APPROACH')return;const turn=Number(active('left'))-Number(active('right'));heading+=turn*CONFIG.turnRate*dt;heading=Math.atan2(Math.sin(heading),Math.cos(heading));const thrust=Number(active('forward'))*CONFIG.thrust-Number(active('reverse'))*CONFIG.reverseThrust;fuel=Math.max(0,fuel-(Math.abs(thrust)>0?CONFIG.fuelBurn:0)*dt-Math.abs(turn)*CONFIG.turnBurn*dt);vx-=Math.sin(heading)*thrust*dt;vz-=Math.cos(heading)*thrust*dt;x+=vx*dt;z+=vz*dt;
// Fixed small steps prevent tunneling. The nose reaches the port at z=1.28.
if(z<=1.28&&z>=-1.4&&Math.abs(x)<1.65){if(Math.abs(x)<=CONFIG.portHalfWidth&&Math.hypot(vx,vz)<=CONFIG.maxSpeed&&angle()<=CONFIG.maxAngle&&vz<0){z=1.28;vx=vz=0;finish(true,'接続を確認しました。おつかれさまでした。')}else finish(false,Math.abs(x)>CONFIG.portHalfWidth?'ポートの縁に接触しました。中心ずれを0.65 m以内に。':angle()>CONFIG.maxAngle?'姿勢が合っていません。角度を8°以内に。':'接近速度が高すぎます。0.65 m/s以下で接近してください。')}
else if((z<-.4&&z>-4.6&&Math.abs(x)<3.1)||(z<- .2&&z>-4&&Math.abs(x)>2.7&&Math.abs(x)<8))finish(false,'ステーション本体に衝突しました。緑のポート正面から接近してください。');
else if(fuel<=0)finish(false,'燃料がなくなりました。短い噴射で進み、余裕をもって減速を。');else if(Math.hypot(x,z)>65)finish(false,'運用エリアを離脱しました。噴射を短く区切ってみてください。')}
const target=new THREE.Vector3(),look=new THREE.Vector3();function frame(t){requestAnimationFrame(frame);let dt=last?Math.min((t-last)/1000,.05):0;last=t;if(document.hidden)return;elapsed+=dt;const n=Math.max(1,Math.ceil(dt/.008));for(let i=0;i<n;i++)step(dt/n);ship.position.set(x,0,z);ship.rotation.y=heading;flame.visible=state==='APPROACH'&&active('forward');flame.scale.y=.8+Math.sin(elapsed*48)*.15;reverseFlames.forEach(f=>f.visible=state==='APPROACH'&&active('reverse'));if(state==='CRASH')ship.rotation.z=Math.sin(Math.min(elapsed,20)*7)*.06;target.set(x*.7,10,z+13);camera.position.lerp(target,1-Math.exp(-dt*4));look.set(x*.4,0,z-9);camera.lookAt(look);updateHUD();renderer.render(scene,camera)}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<600?60:49;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();reset();requestAnimationFrame(frame);
}
