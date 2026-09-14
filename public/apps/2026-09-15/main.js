// Build-free. Only Three.js is fetched; all scenery and sign textures are generated here.
const $ = s => document.querySelector(s);
let THREE;
try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'); }
catch { $('#loadNote').textContent = '読み込みに失敗しました。通信を確認して再読み込みしてください。'; }
if (THREE) { try { boot(); } catch (error) { console.error(error); $('#loadNote').textContent = '3D描画を開始できません。WebGL対応のブラウザで開いてください。'; } }
function boot() {
const scene = new THREE.Scene(), sky = new THREE.Color('#a9b2ac');
scene.background = sky; scene.fog = new THREE.Fog(sky, 35, 105);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .1, 120);
camera.rotation.order = 'YXZ'; camera.position.set(4,1.65,12);
const renderer = new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; $('#world').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe5e9e0,0x626e58,2.1));
const sun = new THREE.DirectionalLight(0xffe5c9,1.5); sun.position.set(-30,50,20);scene.add(sun);
const box = new THREE.BoxGeometry(1,1,1), cylinder = new THREE.CylinderGeometry(1,1,1,6);
const colors={concrete:0xb9b8a9,trim:0xd2d0bf,window:0x526b70,rail:0x9aaca6,road:0x6f7775,walk:0xb0b2a5,grass:0x78866a,hedge:0x5d715b,wood:0x8a7965,metal:0x667570,blue:0x79989f,white:0xd5d7c5,red:0x9d6358,dark:0x435452,lamp:0xe4dbc0};
const mats = Object.fromEntries(Object.entries(colors).map(([k,v])=>[k,new THREE.MeshLambertMaterial({color:v})]));
// Two small, shared, seamless data textures. Generated once, never per chunk.
function noiseTexture(smooth) {
 const size=256,data=new Uint8Array(size*size*4);
 const noise=(x,y,n)=>{x=((x%n)+n)%n;y=((y%n)+n)%n;let h=Math.imul(x+19,374761393)^Math.imul(y+71,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};
 const value=(x,y,n)=>{const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(noise(ix,iy,n),noise(ix+1,iy,n),fx),THREE.MathUtils.lerp(noise(ix,iy+1,n),noise(ix+1,iy+1,n),fx),fy);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let v=0;if(smooth){for(let o=0;o<4;o++){const n=4*2**o;v+=value(x*n/size,y*n/size,n)*(.5333/2**o);}}else v=noise(x,y,size);
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=Math.round(v*255);data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;return texture;
}
const grainTexture=noiseTexture(false),cloudTexture=noiseTexture(true);
mats.road.onBeforeCompile=shader=>{
 shader.uniforms.roadGrain={value:grainTexture};shader.uniforms.roadCloud={value:cloudTexture};
 shader.vertexShader='varying vec3 vRoadPosition;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 roadPosition=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 roadPosition=instanceMatrix*roadPosition;
 #endif
 vRoadPosition=(modelMatrix*roadPosition).xyz;`);
 shader.fragmentShader='uniform sampler2D roadGrain;uniform sampler2D roadCloud;varying vec3 vRoadPosition;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec2 surface=vRoadPosition.xz;
 float grain=texture2D(roadGrain,surface*.65).r;
 float wear=texture2D(roadCloud,surface*.047).r;
 float repairMask=smoothstep(.54,.65,texture2D(roadCloud,surface*.12+vec2(.37,.13)).r);
 diffuseColor.rgb*=.83+grain*.25+wear*.16-repairMask*.16;`);
};
// Camera-centred sky dome: one draw call, no ray marching or postprocessing.
const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
 uniforms:{clouds:{value:cloudTexture},horizon:{value:sky},dusk:{value:0},drift:{value:0}},
 vertexShader:`varying vec3 vSkyDirection;void main(){vSkyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform sampler2D clouds;uniform vec3 horizon;uniform float dusk;uniform float drift;varying vec3 vSkyDirection;
 void main(){
 vec3 direction=normalize(vSkyDirection);float height=max(direction.y,0.0);
 vec2 uv=direction.xz/(height+.38)*.32+vec2(drift,drift*.21);
 float broad=texture2D(clouds,uv).r;
 float fine=texture2D(clouds,uv*2.9+vec2(.23,.71)).r;
 float cloud=smoothstep(.30,.68,broad*.76+fine*.24);
 vec3 zenith=mix(vec3(.29,.36,.39),vec3(.19,.25,.29),dusk);
 vec3 color=mix(horizon,zenith,smoothstep(0.0,.85,height)*.65);
 float coverage=smoothstep(.025,.23,height);
 color+=vec3(.07,.072,.071)*(1.0-cloud)*coverage;
 color-=vec3(.065,.062,.053)*cloud*coverage;
 float glow=pow(max(dot(direction,normalize(vec3(-.7,.12,.5))),0.0),8.0)*(1.0-smoothstep(.0,.55,height));
 color+=vec3(.055,.024,.009)*glow;
 gl_FragColor=vec4(color,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(110,24,12),skyMaterial);skyDome.frustumCulled=false;skyDome.renderOrder=-10;scene.add(skyDome);
const chunks = new Map(), memories = new Map(), history=[];
const SIZE=48, dummy=new THREE.Object3D();
let passed=0, current='', nextId=0, playing=false, started=false, yaw=-.12,pitch=0, locationTimer, hintTimer;
let generated=0, removed=0, loops=0, lastLoop=0, elapsed=0, soundOn=true, audio;
const names=['松ヶ丘ニュータウン','光ヶ丘','あさひ団地','西中央団地','緑ヶ丘住宅'];
const anomalies=['sign','benches','slide','numbers','lamps','vending','bus'];
const hash=(x,z)=>((Math.imul(x,73856093)^Math.imul(z,19349663)^0x6a09e667)>>>0);
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function description(x,z) {
 const key=`${x},${z}`; if(memories.has(key))return memories.get(key);
 const rng=random(hash(x,z)); const id=nextId++;
 let d={seed:hash(x,z),template:Math.floor(rng()*3),name:names[Math.floor(rng()*3)],number:2+Math.abs(x)+Math.abs(z),anomaly:rng()<Math.min(.25+passed*.002,.38)?anomalies[Math.floor(rng()*anomalies.length)]:null};
 if(passed>8)d.number=[11,19,8,3][id%4];
 if(passed>22)d.number=[0,-3,'3街区　第3',19][id%4];
 if(history.length>3 && elapsed-lastLoop>135){d={...history[Math.max(0,history.length-4)],anomaly:null};d.anomaly=anomalies[(loops++)%6];lastLoop=elapsed;}
 memories.set(key,d); if(memories.size>160)memories.delete(memories.keys().next().value); return d;
}
function makeChunk(cx,cz) {
 const key=`${cx},${cz}`, d=description(cx,cz), rng=random(d.seed), group=new THREE.Group();group.position.set(cx*SIZE,0,cz*SIZE);
 const batches=new Map(),colliders=[],disposables=[];
 const add=(mat,x,y,z,w,h,depth,rot=0,shape='box')=>{const k=mat+':'+shape;if(!batches.has(k))batches.set(k,[]);batches.get(k).push([x,y,z,w,h,depth,rot]);};
 const solid=(x,z,w,depth)=>colliders.push({x:cx*SIZE+x,z:cz*SIZE+z,w:w/2+.3,d:depth/2+.3});
 function sign(text,x,y,z,w=3,h=.8,bg='#d0d5c5',ink='#384f48'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.strokeStyle=ink;ctx.lineWidth=4;ctx.strokeRect(9,9,494,110);ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 36px sans-serif';ctx.fillText(text,256,66,475);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});const geometry=new THREE.PlaneGeometry(w,h);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);disposables.push(texture,material,geometry);
 }
 function bench(x,z,reverse=false){
  for(let i=0;i<3;i++){add('wood',x,.53,z-.22+i*.22,2,.12,.18);add('wood',x,.75+i*.2,z+(reverse?-.3:.3),2,.15,.09);}
  for(const dx of [-.75,.75]){add('metal',x+dx,.25,z,.1,.5,.5);add('metal',x+dx,.79,z+(reverse?-.33:.33),.07,.8,.07);}
  solid(x,z,2,.7);
 }
 function lamp(x,z){
  add('concrete',x,.12,z,.32,.24,.32);add('metal',x,.85,z,.115,.32,.1);
  add('white',x,1.5,z-.046,.07,.24,.018);
  add('metal',x,2.6,z,.07,5.2,.07,0,'cylinder');add('metal',x+.45,5.13,z,1,.08,.1);add(d.anomaly==='lamps'?'lamp':'white',x+.85,5.08,z,.48,.12,.26);}
 function slide(x,z){
  const ramp=new THREE.Mesh(box,mats.blue);ramp.position.set(x,1,z);ramp.scale.set(.9,.12,3);ramp.rotation.x=.55;group.add(ramp);
  for(const dx of [-.5,.5]){add('metal',x+dx,.85,z+1.2,.08,1.7,.08);add('red',x+dx,1.65,z+1.15,.08,.65,.08);}for(let i=0;i<5;i++)add('metal',x,.2+i*.3,z+1.35,.95,.06,.12);
  solid(x,z,1.2,3.2);
 }
 add('grass',24,-.19,24,48,.3,48);add('road',4,-.015,24,8,.06,48);add('road',24,-.015,4,48,.06,8);
 add('walk',9,.035,28,2,.12,40);add('walk',29,.035,9,38,.12,2);add('walk',47,.035,28,2,.12,40);
 for(let n=0;n<6;n++){add('white',4,.025,12+n*6,.1,.015,2.2);add('white',12+n*6,.025,4,2.2,.015,.1);}
 for(let i=0;i<5;i++){add('white',1+i*1.3,.03,9,.7,.02,2);add('white',9,.03,1+i*1.3,2,.02,.7);}
 // Short, restrained tar repairs, away from the crossing and dashed centreline.
 for(let crack=0;crack<2;crack++){
  let x=1.4+crack*4.8,z=20+crack*15;
  for(let segment=0;segment<5;segment++){
   const dx=((segment+crack)%2?-.16:.24),dz=.5;
   add('road',x+dx/2,.034,z+dz/2,.025,.012,Math.hypot(dx,dz),Math.atan2(dx,dz));
   // The darker metal tone reads as old sealant without a new material batch.
   add('metal',x+dx/2,.043,z+dz/2,.018,.008,Math.hypot(dx,dz),Math.atan2(dx,dz));
   x+=dx;z+=dz;
  }
 }
 // Low relief details share the existing material batches (no new textures).
 for(const edge of [7.8,46.1]){
  add('concrete',edge,.035,28,.22,.13,40);
  for(let n=0;n<4;n++){
   const z=16+n*8;add('dark',edge,.108,z,.3,.025,.8);
   for(let slat=0;slat<5;slat++)add('metal',edge,.125,z-.32+slat*.16,.3,.025,.045);
  }
 }
 for(let n=0;n<10;n++)add('concrete',9,.099,10+n*4,1.85,.012,.035);
 add('metal',5.9,.03,19,.38,.025,.38,0,'cylinder');
 for(const dx of [-.17,0,.17])add('dark',5.9+dx,.046,19,.035,.01,.48);
 for(const z of [11,43]){add('white',8.5,.48,z,.1,.85,.1);add('red',8.5,.68,z,.105,.12,.105);}
 const blocks=d.template===0?[[21,21],[37,21],[34,40]]:d.template===1?[[21,22],[37,22]]:[[21,22],[37,22],[35,40]];
 blocks.forEach(([x,z],i)=>{
  const h=12+Math.floor(rng()*2)*2.6,w=10,dep=8;add('concrete',x,h/2,z,w,h,dep);solid(x,z,w,dep);add('trim',x,h+.15,z,w+.35,.3,dep+.35);
  add('walk',x,.04,z,w+1,.14,dep+1);
  for(let floor=0;floor<5;floor++)for(let col=0;col<4;col++){
   const wx=x-3.6+col*2.4,wy=1.6+floor*(h-1.5)/5;
   add('window',wx,wy,z-4.025,1.5,1.45,.05);add('window',wx,wy,z+4.025,1.5,1.45,.05);
   add('trim',wx,wy-.9,z-4.42,2,.14,.85);add('rail',wx,wy-.45,z-4.78,2,.65,.08);
   for(const side of [-1,1]){
    const face=z+side*4.065;
    add('trim',wx,wy,face,.045,1.45,.035);
    add('trim',wx,wy+.73,face,1.6,.055,.04);
    add('trim',wx,wy-.73,face,1.6,.055,.04);
    // A few closed curtains, fixed by building/floor rather than fresh randomness.
    if((floor+col+i)%4===0)add('walk',wx-.4,wy,face,.64,1.35,.018);
   }
   add('metal',wx,wy-.08,z-4.82,2,.055,.07);
   if(col%2===0){
    add('white',wx+.58,wy-.95,z+4.27,.65,.45,.43);
    for(let vent=0;vent<3;vent++)add('metal',wx+.58,wy-1.08+vent*.12,z+4.495,.46,.035,.016);
   }
  }
  // Recessed floor joints and door hardware: restrained, near-surface details.
  for(let floor=1;floor<5;floor++){
   const y=floor*(h-1.5)/5+.4;
   add('walk',x-5.045,y,z,.018,.035,7.9);
   add('walk',x+5.045,y,z,.018,.035,7.9);
  }
  for(const dx of [-.18,.18])add('white',x+dx,.93,z-4.18,.035,.27,.025);
  add('metal',x-.9,1.33,z-4.1,.16,.3,.045);
  // Faint concrete repairs and utility covers, repeated with the same building.
  add('walk',x-5.055,.65,z+2,.03,.65,1.15);
  add('trim',x-5.06,4.1,z-2,.035,1.05,.75);
  add('metal',x-5.08,.85,z+1,.06,.55,.4);
  for(let vent=0;vent<4;vent++)add('dark',x-5.115,.67+vent*.11,z+1,.016,.025,.27);
  for(const side of [-1,1])add('walk',x,.25,z+side*4.055,9.7,.3,.045);
  // Drainpipes, stairwell windows and a squat rooftop service enclosure.
  for(const dx of [-4.75,4.75])add('metal',x+dx,h/2,z+4.12,.09,h,.09);
  for(let floor=0;floor<5;floor++){
   add('window',x-5.025,1.6+floor*(h-1.5)/5,z,.045,1.5,.7);
   add('trim',x-5.06,1.6+floor*(h-1.5)/5,z,.025,.045,.75);
  }
  add('concrete',x+2,h+.65,z+1,2,1,2.4);add('trim',x+2,h+1.2,z+1,2.15,.12,2.55);
  add('dark',x,.95,z-4.07,1.25,1.9,.1);add('trim',x,2.1,z-4.5,2.1,.14,1.1);
  add('metal',x,.95,z-4.14,.045,1.8,.04);add('white',x,1.84,z-4.15,1.1,.09,.04);
  for(let slot=0;slot<4;slot++){
   add('metal',x+1.05+slot*.25,1.12,z-4.12,.22,.32,.09);
   add('dark',x+1.05+slot*.25,1.19,z-4.175,.16,.035,.015);
  }
  sign(String(d.anomaly==='numbers'?[1,2,7,8][i]:i+1),x,h-1,z-4.1,1.2,.65);
 });
 // Empty bicycle shelter: modest geometry, no parked crowd or extra textures.
 add('walk',34,.08,31,7,.16,3.2);add('blue',34,2.15,31,7.2,.12,3.4);
 for(const x of [30.8,37.2]){add('metal',x,1.08,32.3,.075,2.1,.075);solid(x,32.3,.15,.15);}
 for(let n=0;n<6;n++){
  const x=31.4+n;add('metal',x,.36,31,.055,.65,1.05);add('metal',x,.07,31.5,.35,.07,.1);
 }
 solid(34,31,6.1,1.1);
 // A recurring pocket park, with sparse broadleaf trees and clipped hedges.
 add('walk',18,.02,39,12,.12,12);add('grass',18,.1,39,10,.12,10);
 for(const [x,z] of [[12,30],[26,32],[28,45],[44,13]]){add('wood',x,1.3,z,.2,2.6,.2,0,'cylinder');add('hedge',x,2.9,z,1.6,1.55,1.6,0,'cylinder');add('hedge',x+.2,3.95,z-.1,1.12,.85,1.12,.35,'cylinder');solid(x,z,.5,.5);}
 for(let i=0;i<6;i++){
  add('hedge',14+i*2,.55,12,1.8,1,1);
  add('concrete',14+i*2,.16,11.4,1.95,.22,.14);
  add('concrete',14+i*2,.16,12.6,1.95,.22,.14);
 }
 // A few fallen leaves; deterministic placement preserves the returning layout.
 for(let leaf=0;leaf<10;leaf++)add('wood',12.3+(leaf*1.73)%12,.19,34+(leaf*2.31)%10,.09,.012,.16,leaf*.7);
 bench(14,36,d.anomaly==='benches');bench(23,42);if(d.anomaly==='benches')for(let i=0;i<4;i++)bench(12+i*3,45);
 slide(20,39);if(d.anomaly==='slide')slide(23,39);
 // Concrete-edged sandpit and a small drinking fountain.
 add('wood',15,.2,40,3.3,.14,3);add('trim',15,.29,40,2.95,.04,2.65);
 add('concrete',25,.65,35,.45,1.15,.45);add('metal',25,1.25,35,.6,.09,.55);add('metal',25,1.39,35,.05,.2,.05);solid(25,35,.6,.6);
 // Short park fence leaves both paths open.
 for(let n=0;n<7;n++)add('metal',12+n*.65,.65,32,.055,1.1,.055);
 for(const y of [.35,.95])add('metal',13.95,y,32,3.95,.055,.055);
 solid(13.95,32,3.95,.08);
 // Community noticeboard: faded paper, pins and printed lines in the same batches.
 add('metal',25,1.7,31,2.2,1.25,.12);add('wood',25,1.7,30.925,2.04,1.08,.035);
 for(const x of [24.1,25.9])add('metal',x,.8,31,.07,1.6,.07);
 add('blue',25,2.38,31,2.4,.09,.45);solid(25,31,2.2,.3);
 for(let paper=0;paper<3;paper++){
  const x=24.35+paper*.65,y=1.73+(paper%2)*.07;
  add(paper===1?'trim':'white',x,y,30.892,.52,.76,.02);
  add('red',x,y+.29,30.875,.035,.035,.016);
  add(paper===1?'blue':'metal',x,y+.15,30.872,.39,.055,.015);
  for(let row=0;row<4;row++)add('metal',x,y-.02-row*.085,30.872,.34-(row%2)*.07,.018,.015);
 }
 sign('松ヶ丘児童公園',16,1.1,33,3,.6);add('metal',16,.55,33,.1,1.1,.1);
 lamp(9.4,15);lamp(9.4,39);lamp(44,9.5);
 // Parking bays, bus shelter, vending machine.
 if(d.template===1)for(let i=0;i<5;i++){
  add('road',34+i*2.2,.02,39,2.1,.08,6);add('white',33+i*2.2,.07,39,.07,.02,5);
  for(const offset of [-.55,.55])add('concrete',34+i*2.2+offset,.14,41,.65,.16,.18);
 }
 add('blue',10.5,2.5,27,2.5,.12,4);for(const z of [25.2,28.8])add('metal',11.6,1.25,z,.09,2.5,.09);
 // Timetable: a faded header and tiny printed rows, all opaque geometry.
 add('white',10.1,1.62,24,.62,.88,.07);add('blue',10.1,1.93,23.952,.55,.12,.025);
 for(let row=0;row<6;row++)for(let col=0;col<3;col++)add('metal',9.9+col*.19,1.76-row*.095,23.95,.13,.018,.02);
 add('blue',10.5,2.43,27,.08,.14,3.8);
 add('metal',10.1,1.3,24,.07,2.6,.07);sign(d.anomaly==='bus'?'第0街区 行':'中央駅 行',10.1,2.5,24,1.6,.7);
 add('white',12,1.05,29.5,1.3,2.1,.85);add('dark',12,1.3,29.05,1.06,1.1,.03);solid(12,29.5,1.3,.85);
 for(let row=0;row<2;row++)for(let col=0;col<5;col++)add(d.anomaly==='vending'?'white':['red','blue','white'][col%3],11.58+col*.21,1.06+row*.42,29.02,.12,.28,.04);
 add('dark',12,.45,29.04,.7,.15,.03);
 add('metal',12.51,.78,29.045,.15,.28,.035);add('dark',12.51,.85,29.018,.085,.025,.016);
 for(let col=0;col<5;col++)add('white',11.58+col*.21,.87,29.01,.1,.045,.025);
 for(const dx of [-.48,.48])add('dark',12+dx,.09,29.5,.17,.15,.6);
 // Bottle-return box beside the machine, with two dark openings.
 add('blue',13.1,.53,29.5,.62,1.06,.62);add('white',13.1,1.08,29.5,.66,.09,.65);
 for(const dx of [-.14,.14])add('dark',13.1+dx,.92,29.175,.16,.13,.025);
 solid(13.1,29.5,.65,.65);
 sign(`${d.name}　第${d.anomaly==='sign'?0:d.number}街区`,12.6,2.3,14,5.6,.85);add('metal',10.3,1.15,14,.08,2.3,.08);add('metal',14.9,1.15,14,.08,2.3,.08);
 for(const y of [1.845,2.755])add('metal',12.6,y,14,5.75,.055,.1);
 for(const x of [9.77,15.43])add('metal',x,2.3,14,.055,.95,.1);
 add('trim',12.6,2.83,14,5.9,.075,.28);
 for(const x of [10.3,14.9]){
  add('concrete',x,.1,14,.3,.2,.3);
  for(const y of [2.02,2.59])add('metal',x,y,13.985,.045,.045,.025);
 }
 if(d.template===2){ // An inaccessible raised pedestrian bridge; eye height stays fixed.
  add('concrete',4,4.4,34,13,.45,2);for(const x of [-1.7,9.7]){add('concrete',x,2.2,34,.5,4.4,1.6);solid(x,34,.5,1.6);}for(const z of [33,35]){
   add('rail',4,5.35,z,13,.08,.09);add('rail',4,4.85,z,13,.06,.09);
   for(let n=0;n<=16;n++)add('rail',-2.4+n*.8,4.96,z,.055,.8,.055);
  }
  for(let i=0;i<12;i++)add('concrete',11.5,.18+i*.35,42-i*.55,2,.36+i*.7,.6);solid(11.5,39,2,7);
 }
 for(const [key,list] of batches){const [mat,shape]=key.split(':');const mesh=new THREE.InstancedMesh(shape==='box'?box:cylinder,mats[mat],list.length);list.forEach(([x,y,z,w,h,depth,rot],i)=>{dummy.position.set(x,y,z);dummy.scale.set(w,h,depth);dummy.rotation.set(0,rot,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.computeBoundingSphere();group.add(mesh);}
 scene.add(group);chunks.set(key,{group,colliders,disposables,d});generated++;
}
function updateChunks(){
 const cx=Math.floor(camera.position.x/SIZE),cz=Math.floor(camera.position.z/SIZE),key=`${cx},${cz}`;
 if(key===current)return;current=key;
 if(started){passed++;const d=description(cx,cz);if(!d.anomaly)history.push({...d});if(history.length>12)history.shift();showLocation(d);}
 for(const [k,c]of chunks){const [x,z]=k.split(',').map(Number);if(Math.abs(x-cx)>2||Math.abs(z-cz)>2){scene.remove(c.group);c.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});c.disposables.forEach(o=>o.dispose());chunks.delete(k);removed++;}}
 for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++)if(!chunks.has(`${x},${z}`))makeChunk(x,z);
}
function showLocation(d){$('#location span').textContent=`${d.name}　第${d.number}街区`;$('#location').classList.add('show');clearTimeout(locationTimer);locationTimer=setTimeout(()=>$('#location').classList.remove('show'),2600);}
updateChunks();
const keys=new Set(),stick={x:0,y:0,id:null},look={id:null,x:0,y:0};
function resetInput(){keys.clear();stick.x=stick.y=0;stick.id=look.id=null;$('#knob').style.transform='';}
function pause(){if(!playing)return;playing=false;resetInput();$('#menu').hidden=false;$('#hud').hidden=true;if(audio)audio.suspend();}
function resume(){playing=true;$('#menu').hidden=true;$('#hud').hidden=false;if(audio&&soundOn)audio.resume().catch(()=>{});}
function initAudio(){try{const Audio=window.AudioContext||window.webkitAudioContext;audio=new Audio();const b=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1);const source=audio.createBufferSource();source.buffer=b;source.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=330;const gain=audio.createGain();gain.gain.value=.027;source.connect(filter).connect(gain).connect(audio.destination);source.start();audio.resume().catch(()=>{});}catch{soundOn=false;$('#sound').textContent='環境音：利用できません';$('#sound').disabled=true;}}
$('#start').disabled=false;$('#start').innerHTML='歩き始める <span>→</span>';
$('#start').onclick=()=>{started=true;$('#title').hidden=true;initAudio();resume();showLocation(chunks.get(current).d);$('#hint').textContent=matchMedia('(pointer:coarse)').matches?'左スティックで歩く · 右側をドラッグで見回す':'WASDで歩く · ドラッグで見回す';clearTimeout(hintTimer);hintTimer=setTimeout(()=>$('#hint').style.opacity=0,8000);};
$('#pause').onclick=pause;$('#resume').onclick=resume;$('#sound').onclick=()=>{soundOn=!soundOn;$('#sound').textContent=`環境音：${soundOn?'入':'切'}`;$('#sound').setAttribute('aria-pressed',String(soundOn));};
addEventListener('keydown',e=>{if(e.code==='Escape'){playing?pause():started&&resume();return;}if(playing&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
const joystick=$('#stick');
function moveStick(e){const r=joystick.getBoundingClientRect();let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const len=Math.hypot(x,y),limit=38;if(len>limit){x*=limit/len;y*=limit/len;}stick.x=x/limit;stick.y=y/limit;$('#knob').style.transform=`translate(${x}px,${y}px)`;}
joystick.addEventListener('pointerdown',e=>{if(!playing||stick.id!==null)return;e.preventDefault();stick.id=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)moveStick(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===stick.id){stick.id=null;stick.x=stick.y=0;$('#knob').style.transform='';}});
const canvas=renderer.domElement;canvas.addEventListener('pointerdown',e=>{if(!playing||look.id!==null||(e.pointerType==='touch'&&e.clientX<innerWidth*.42))return;e.preventDefault();look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==look.id||!playing)return;yaw-=(e.clientX-look.x)*.003;pitch=Math.max(-1.15,Math.min(1.15,pitch-(e.clientY-look.y)*.003));look.x=e.clientX;look.y=e.clientY;});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===look.id)look.id=null;});
for(const event of ['dblclick','contextmenu','gesturestart','gesturechange','dragstart'])document.addEventListener(event,e=>e.preventDefault(),{passive:false});
function blocked(x,z){for(const c of chunks.values())for(const b of c.colliders)if(Math.abs(x-b.x)<b.w&&Math.abs(z-b.z)<b.d)return true;return false;}
function move(dt){let x=stick.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z=stick.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}const speed=3.8*dt,dx=(x*Math.cos(yaw)+z*Math.sin(yaw))*speed,dz=(-x*Math.sin(yaw)+z*Math.cos(yaw))*speed;if(!blocked(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(!blocked(camera.position.x,camera.position.z+dz))camera.position.z+=dz;}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);resetInput();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('#menu h2').textContent='描画が中断されました';$('#menu p:not(.eyebrow)').textContent='ページを再読み込みしてください。';$('#resume').disabled=true;});
const targetSky=new THREE.Color(),lightSky=new THREE.Color('#a9b2ac'),darkSky=new THREE.Color('#788582');let previous=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;if(playing){elapsed+=dt;move(dt);updateChunks();}camera.rotation.set(pitch,yaw,0);const t=Math.min(passed/65,1);targetSky.copy(lightSky).lerp(darkSky,t);sky.lerp(targetSky,Math.min(dt*.4,1));scene.fog.color.copy(sky);scene.fog.far+=(105-t*26-scene.fog.far)*dt*.3;skyDome.position.copy(camera.position);skyMaterial.uniforms.dusk.value=t;skyMaterial.uniforms.drift.value=elapsed*.00035;renderer.render(scene,camera);}requestAnimationFrame(frame);
// Read-only diagnostics for soak testing; never displayed in the exploration UI.
Object.defineProperty(window,'newtownStats',{get:()=>({chunks:chunks.size,memories:memories.size,passed,generated,removed,loops,elapsed,playing,position:camera.position.toArray(),geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles})});
}
