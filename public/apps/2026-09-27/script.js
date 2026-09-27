import * as THREE from '/apps/2026-09-27/vendor/three.module.min.js';
import { cities } from '/apps/2026-09-27/cities.js';
const $=id=>document.getElementById(id),host=$('globe'),button=$('spin');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});} catch(error){$('status').textContent='3D表示を開始できません。WebGL対応ブラウザで開いてください。';$('button-label').textContent='3D表示を利用できません';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.z=4.4;
scene.add(new THREE.AmbientLight(0x9fc9d5,2));const sun=new THREE.DirectionalLight(0xfff4d9,2.7);sun.position.set(-3,4,5);scene.add(sun);
const earth=new THREE.Group();scene.add(earth);
const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.94,metalness:.03});
earth.add(new THREE.Mesh(new THREE.SphereGeometry(1,96,64),material));
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.027,64,48),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',fragmentShader:'varying vec3 n; varying vec3 v; void main(){float f=pow(1.-abs(dot(n,v)),3.);gl_FragColor=vec4(.25,.7,.8,f*.48);}'}));earth.add(atmosphere);
const pin=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.1,8),new THREE.MeshBasicMaterial({color:0xe2ecc5}));stem.rotation.x=Math.PI/2;stem.position.z=.05;pin.add(stem);
const dot=new THREE.Mesh(new THREE.SphereGeometry(.023,20,16),new THREE.MeshBasicMaterial({color:0xf0f7d7}));dot.position.z=.11;pin.add(dot);
const ring=new THREE.Mesh(new THREE.RingGeometry(.035,.042,40),new THREE.MeshBasicMaterial({color:0xe0eccd,side:THREE.DoubleSide,transparent:true,opacity:.8}));ring.position.z=.004;pin.add(ring);pin.visible=false;earth.add(pin);
const vector=c=>new THREE.Vector3(Math.cos(c.latitude*Math.PI/180)*Math.cos(c.longitude*Math.PI/180),Math.sin(c.latitude*Math.PI/180),-Math.cos(c.latitude*Math.PI/180)*Math.sin(c.longitude*Math.PI/180));
const orientation=c=>new THREE.Quaternion().setFromEuler(new THREE.Euler(c.latitude*Math.PI/180,(-90-c.longitude)*Math.PI/180,0,'XYZ'));
earth.quaternion.copy(orientation({latitude:20,longitude:115}));
let state='idle',selected=null,start=0,last=performance.now(),alignStart=new THREE.Quaternion(),target=new THREE.Quaternion(),zoom=4.4,fromZoom=4.4;
const turn=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0),smooth=t=>t*t*(3-2*t);
function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);resize();
new THREE.TextureLoader().load('/apps/2026-09-27/earth.jpg',texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();material.map=texture;material.needsUpdate=true;button.disabled=false;$('button-label').textContent='旅行先を決める';},undefined,()=>{$('status').textContent='地球の画像を読み込めません。再読み込みしてください。';$('button-label').textContent='読み込みエラー';});
function showResult(){const c=selected;for(const [id,value] of Object.entries({flag:c.flag,city:c.city,english:`${c.english} / ${c.countryEnglish}`,distance:`約${c.distanceKm.toLocaleString()} km`,flight:`約${c.flight}`,food:c.food,season:c.season,budget:c.budget}))$(id).textContent=value;
 $('city').title=c.country;$('flag').setAttribute('aria-label',c.country);$('sights').replaceChildren(...c.sights.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));$('maps').href=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.city} ${c.country}`)}`;
 $('coordinates').textContent=`${Math.abs(c.latitude).toFixed(2)}° ${c.latitude>=0?'N':'S'}  /  ${Math.abs(c.longitude).toFixed(2)}° ${c.longitude>=0?'E':'W'}`;
 $('result').hidden=false;document.body.classList.add('has-result');document.body.classList.remove('spinning');$('status').textContent='A NEW PLACE. A NEW PERSPECTIVE.';$('button-label').textContent='もう一度回す';button.disabled=false;state='result';resize();}
button.addEventListener('click',()=>{if(state==='spin'||state==='align'||state==='arrival')return;const choices=cities.filter(c=>c.id!==selected?.id);const random=new Uint32Array(1);crypto.getRandomValues(random);selected=choices[Math.floor(random[0]/4294967296*choices.length)];
 $('result').hidden=true;document.body.classList.remove('has-result');document.body.classList.add('spinning');pin.visible=false;button.disabled=true;$('button-label').textContent='世界をめぐっています';$('status').textContent='WHERE WILL YOU GO?';fromZoom=camera.position.z;state='spin';start=performance.now();resize();});
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;let elapsed=(now-start)/1000;
 if(state==='idle'&&!pointers.size&&!reduced)earth.quaternion.premultiply(turn.setFromAxisAngle(axis,dt*.075));
 if(state==='spin'){const duration=reduced?.35:2.65,p=Math.min(elapsed/duration,1);if(!reduced)earth.quaternion.premultiply(turn.setFromAxisAngle(axis,dt*(.3+10*Math.sin(Math.PI*Math.min(p*1.05,1))**.65)));camera.position.z=THREE.MathUtils.lerp(fromZoom,4.5,smooth(Math.min(p*3,1)));if(p===1){state='align';start=now;elapsed=0;alignStart.copy(earth.quaternion);target.copy(orientation(selected));}}
 if(state==='align'){const p=Math.min(elapsed/(reduced?.15:1.6),1);earth.quaternion.slerpQuaternions(alignStart,target,smooth(p));if(p===1){pin.position.copy(vector(selected).multiplyScalar(1.006));pin.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),vector(selected));pin.visible=true;state='arrival';start=now;elapsed=0;}}
 if(state==='arrival'){const p=Math.min(elapsed/(reduced?.1:.65),1);camera.position.z=THREE.MathUtils.lerp(4.5,3.8,smooth(p));pin.scale.setScalar(Math.max(.01,smooth(p)));if(p===1){zoom=3.8;showResult();}}
 if(state==='idle'||state==='result'){camera.position.z=THREE.MathUtils.lerp(camera.position.z,zoom,.1);if(state==='result'&&!pointers.size&&!reduced){earth.quaternion.premultiply(turn.setFromAxisAngle(axis,dt*.008));}ring.scale.setScalar(reduced?1:1+Math.sin(now*.003)*.14);}
 renderer.render(scene,camera);}
const pointers=new Map();let pinch=0;
const interactive=()=>state==='idle'||state==='result';
host.addEventListener('pointerdown',e=>{if(!interactive())return;host.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch=0;});
host.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!interactive())return;const previous=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)zoom=THREE.MathUtils.clamp(zoom*pinch/d,2.7,6);pinch=d;}else{earth.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((e.clientY-previous.y)*.005,(e.clientX-previous.x)*.005,0)));}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,e=>{pointers.delete(e.pointerId);pinch=0;});
host.addEventListener('wheel',e=>{e.preventDefault();if(interactive())zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.003,2.7,6);},{passive:false});
host.addEventListener('contextmenu',e=>e.preventDefault());button.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();button.disabled=true;$('status').textContent='3D表示が中断されました。ページを再読み込みしてください。';});
requestAnimationFrame(animate);
