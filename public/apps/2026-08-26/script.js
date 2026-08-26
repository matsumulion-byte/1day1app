(() => {
  "use strict";

  const realSkills = [
    "チャンスB","対左投手B","盗塁B","走塁B","送球B","ケガしにくさB","アベレージヒッター","パワーヒッター",
    "広角打法","流し打ち","固め打ち","粘り打ち","バント○","バント職人","内野安打○","初球○",
    "チャンスメーカー","ヘッドスライディング","代打○","逆境○","サヨナラ男","満塁男","レーザービーム",
    "守備職人","キャッチャーB","ムードメーカー","意外性","いぶし銀","ローボールヒッター",
    "ハイボールヒッター","対ストレート○","悪球打ち","プレッシャーラン","かく乱","突破口","高速チャージ"
  ];
  const fictionalSkills = [
    "二巡目覚醒","三塁線職人","甘球絶対逃さない","高め絶対主義","低め殺し","謎の飛距離","七回から本気",
    "先頭打者キラー","打球加速","外野前ヒット職人","フェンス直撃○","真っすぐ一本","初見投手○",
    "右方向ロマン","球際強者","逆風打法","最終打席○","深守備適性"
  ];
  const positions = ["投手","捕手","一塁手","二塁手","三塁手","遊撃手","外野手"];
  const hands = ["右投右打","右投左打","右投両打","左投左打","左投右打"];
  const statNames = ["ミート","パワー","走力","肩力","守備力","捕球"];
  const rankColors = {G:"#748391",F:"#4b9fc4",E:"#45a968",D:"#d1a71b",C:"#e68421",B:"#e0504d",A:"#e6326a",S:"#9b46d0"};
  const typeProfiles = [
    {name:"長距離砲",boost:[-5,20,-8,7,-6,-5],comments:["一振りで、試合の空気まで変えていく。","長打力は本物。打球音からもう違う。"]},
    {name:"俊足巧打",boost:[15,-8,20,-5,5,2],comments:["塁に出したら最後。気づけば得点圏。","転がせば何かが起きる、厄介なリードオフ。"]},
    {name:"守備職人",boost:[3,-8,5,12,20,17],comments:["その一歩目が、ヒットをアウトに変える。","派手さより確実性。守備で試合を締める。"]},
    {name:"万能型",boost:[8,8,8,8,8,8],comments:["攻・走・守、どこに置いても計算できる。","穴らしい穴がない。監督に愛される万能型。"]},
    {name:"ロマン砲",boost:[-15,28,-10,13,-12,-10],comments:["長打力は本物。粗さも、また本物。","当たれば場外。観客が待つのは、その一発。"]},
    {name:"韋駄天",boost:[3,-10,28,2,8,0],comments:["ダイヤモンドが、この選手には少し狭い。","脚で守備を崩す、スピードのスペシャリスト。"]},
    {name:"強肩強打",boost:[2,18,-4,24,-3,-3],comments:["強い打球と強い送球。武器が実にわかりやすい。","肩とバットで、球場の端まで支配する。"]},
    {name:"いぶし銀",boost:[13,-4,-1,2,13,15],comments:["数字以上の仕事をする、勝負どころの職人。","気づけば仕事を終えている。ベンチの切り札。"]}
  ];

  const form = document.querySelector("#assessment-form");
  const input = document.querySelector("#player-name");
  const error = document.querySelector("#error");
  const result = document.querySelector("#result");
  const statsEl = document.querySelector("#stats");
  const skillsEl = document.querySelector("#skills");

  function hashName(text) {
    let hash = 2166136261;
    for (const char of text.normalize("NFKC")) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    return function () {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const between = (random, min, max) => Math.floor(random() * (max - min + 1)) + min;
  const choose = (random, list) => list[Math.floor(random() * list.length)];
  function shuffled(random, list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function rankOf(value) {
    if (value >= 90) return "S"; if (value >= 80) return "A"; if (value >= 70) return "B"; if (value >= 60) return "C";
    if (value >= 50) return "D"; if (value >= 40) return "E"; if (value >= 30) return "F"; return "G";
  }

  function assess(name) {
    const random = mulberry32(hashName(name));
    const profile = choose(random, typeProfiles);
    const values = profile.boost.map(boost => Math.max(18, Math.min(100, between(random, 37, 78) + boost)));
    const trajectory = Math.max(1, Math.min(4, Math.round((values[1] + between(random, -10, 10)) / 25)));
    const position = choose(random, positions);
    const realCount = between(random, 5, 7);
    const fictionCount = between(random, 3, 5);
    const skillCount = Math.min(12, realCount + fictionCount);
    const skills = shuffled(random, [
      ...shuffled(random, realSkills).slice(0, skillCount - fictionCount).map(name => ({name, fictional:false})),
      ...shuffled(random, fictionalSkills).slice(0, fictionCount).map(name => ({name, fictional:true}))
    ]);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const overall = Math.max(35, Math.min(99, Math.round(average * .78 + Math.max(...values) * .22 + skills.length * .65)));
    return {name, profile, values, trajectory, position, hand:choose(random, hands), skills, overall, comment:choose(random, profile.comments), number:between(random, 1, 99)};
  }

  function render(player) {
    document.querySelector("#result-name").textContent = player.name;
    document.querySelector("#handedness").textContent = player.hand;
    document.querySelector("#position").textContent = player.position;
    document.querySelector("#position-label").textContent = `NO.${String(player.number).padStart(2,"0")} / ${player.position}`;
    document.querySelector("#player-type").textContent = player.profile.name;
    document.querySelector("#uniform-number").textContent = player.number;
    document.querySelector("#overall").textContent = player.overall;
    document.querySelector("#overall-badge").textContent = player.overall;
    document.querySelector("#comment").textContent = `「${player.comment}」`;
    statsEl.innerHTML = `<div class="stat trajectory" style="--value:${player.trajectory * 25}%;--rank-color:#f2a71b"><span class="stat-name">弾道</span><span class="rank">${player.trajectory}</span></div>` + player.values.map((value,index) => {
      const rank = rankOf(value);
      return `<div class="stat" style="--value:${value}%;--rank-color:${rankColors[rank]}"><span class="stat-name">${statNames[index]}</span><span class="rank">${rank}</span><span class="stat-value">${value}</span></div>`;
    }).join("");
    skillsEl.innerHTML = player.skills.map((skill,index) => `<span class="skill ${index < 2 ? "gold" : index % 3 === 0 ? "blue" : ""}">${skill.name}</span>`).join("");
    result.hidden = false;
    result.classList.remove("reveal");
    void result.offsetWidth;
    result.classList.add("reveal");
    result.dataset.name = player.name;
    result.dataset.type = player.profile.name;
    setTimeout(() => result.scrollIntoView({behavior:"smooth", block:"start"}), 120);
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) {
      error.textContent = "選手名を入力してください。";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    error.textContent = "";
    input.removeAttribute("aria-invalid");
    render(assess(name));
  });

  document.querySelector("#retry").addEventListener("click", () => {
    result.hidden = true;
    input.focus();
    input.select();
    window.scrollTo({top:0, behavior:"smooth"});
  });

  document.querySelector("#share").addEventListener("click", () => {
    const text = `${result.dataset.name}の査定結果は「${result.dataset.type}」！\n名前で野球選手能力を査定してみよう⚾\n#名前で選手査定 #1日1アプリ`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  input.addEventListener("input", () => { if (error.textContent) error.textContent = ""; input.removeAttribute("aria-invalid"); });
  document.addEventListener("dblclick", event => event.preventDefault(), {passive:false});
  document.addEventListener("gesturestart", event => event.preventDefault(), {passive:false});
})();
