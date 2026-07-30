const state={face:2,body:2,mask:1,costume:1};
const wrestler=document.querySelector("#wrestler");
const ringName=document.querySelector("#ringName");
const dialog=document.querySelector("#profileDialog");

document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab,.panel").forEach(el=>el.classList.remove("active"));
  tab.classList.add("active");
  document.querySelector(`#${tab.dataset.panel}`).classList.add("active");
}));

document.querySelectorAll(".choices").forEach(group=>group.addEventListener("click",event=>{
  const button=event.target.closest("button");
  if(!button)return;
  group.querySelectorAll("button").forEach(el=>el.classList.remove("selected"));
  button.classList.add("selected");
  state[group.dataset.key]=Number(button.dataset.value);
  render();
}));

function render(){
  wrestler.className=`wrestler face-${state.face} body-${state.body} mask-${state.mask} costume-${state.costume}`;
}

document.querySelector("#randomBtn").addEventListener("click",()=>{
  state.face=1+Math.floor(Math.random()*3);
  state.body=1+Math.floor(Math.random()*3);
  state.mask=Math.floor(Math.random()*4);
  state.costume=1+Math.floor(Math.random()*4);
  document.querySelectorAll(".choices").forEach(group=>{
    group.querySelectorAll("button").forEach(button=>
      button.classList.toggle("selected",Number(button.dataset.value)===state[group.dataset.key])
    );
  });
  render();
});

const moves=[
  ["爆裂火山ボンバー","両腕で抱え上げ、会場のカウントに合わせて一気にマットへ叩きつける大噴火級の一撃。"],
  ["稲妻ムーンサルト","トップロープから弧を描いて飛ぶ、一瞬の閃光のような空中殺法。"],
  ["断崖ジャーマン","相手の重心を読み切り、逃げ場のない角度で投げ切る必殺スープレックス。"],
  ["真夜中のラリアット","静寂の直後に炸裂する、見えない角度からの豪快な一閃。"],
  ["ギャラクシー・クラッチ","複雑に絡みつき、気づけば逃げ道をすべて消している宇宙式関節技。"],
  ["キングス・プレス","王者の間合いから放つ、重さと美しさを兼ね備えたダイビングプレス。"]
];
const styles=[
  ["不屈の正面突破型","何度倒されても立ち上がる。観客の声援が大きいほど、終盤の一撃が重くなる。"],
  ["変幻自在の技巧派","ロープと関節技を巧みに操る。相手の必殺技を切り返す瞬間が最大の見せ場。"],
  ["予測不能の空中派","リングの四方すべてが発射台。スピードに乗れば誰にも捕まらない。"],
  ["静かなる怪力派","表情を変えずに相手を持ち上げる。無駄のない一発で試合の空気を変える。"]
];
const catches=["観客の魂に火をつける反逆の星","リングを切り裂く孤高の稲妻","勝利を呼び込む鋼鉄の獣","千の歓声を背負う覆面戦士"];

function hash(text){return [...text].reduce((n,c)=>(n*31+c.codePointAt(0))>>>0,2166136261)}
function meter(n){return "■".repeat(Math.ceil(n/20))+"□".repeat(5-Math.ceil(n/20))}

function makeProfile(){
  const name=ringName.value.trim();
  if(!name){ringName.focus();ringName.classList.add("shake");setTimeout(()=>ringName.classList.remove("shake"),350);return}
  const h=hash(name);
  const move=moves[h%moves.length],style=styles[(h>>>3)%styles.length];
  const basePower=[65,86,94][state.body-1],baseSpeed=[91,70,53][state.body-1];
  const power=Math.min(99,basePower+(h%8)),speed=Math.min(99,baseSpeed+((h>>>5)%8)),tech=66+((h>>>9)%30);
  document.querySelector("#resultName").textContent=name;
  document.querySelector("#resultCatch").textContent=catches[(h>>>7)%catches.length];
  document.querySelector("#resultMove").textContent=move[0];
  document.querySelector("#moveDesc").textContent=move[1];
  document.querySelector("#resultStyle").textContent=style[0];
  document.querySelector("#styleDesc").textContent=style[1];
  [["powerStat",power],["speedStat",speed],["techStat",tech]].forEach(([id,n])=>{
    const el=document.querySelector(`#${id}`);el.textContent=`${meter(n)} ${n}`;el.style.setProperty("--stat",`${n}%`)
  });
  const icons=["👊","★","ϟ","♠"];
  const avatar=document.querySelector("#profileAvatar");
  avatar.textContent=icons[state.mask];
  avatar.className=`profile-avatar costume-${state.costume}`;
  dialog.showModal();
}
document.querySelector("#debutBtn").addEventListener("click",makeProfile);
ringName.addEventListener("keydown",e=>{if(e.key==="Enter")makeProfile()});
["closeBtn","againBtn"].forEach(id=>document.querySelector(`#${id}`).addEventListener("click",()=>dialog.close()));
dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
render();
