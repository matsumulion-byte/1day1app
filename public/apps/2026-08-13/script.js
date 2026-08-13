const OPTIONS = {
  when: ["午前2時", "丑三つ時", "残業中", "夏休み最後の夜", "終電後", "雨の夜", "日曜日の夕方", "深夜3時33分", "お盆の夜", "誰もいない昼休み"],
  where: ["学校のトイレ", "誰もいない会社", "山道", "古い旅館", "ファミレス", "エレベーター", "カラオケボックス", "コンビニ", "公園", "ビジネスホテル", "地下駐車場", "自宅の浴室"],
  who: ["白い服の女", "知らないおじさん", "自分そっくりの人", "顔のない子ども", "大量の子ども", "ずっと笑っている老人", "黒い影", "誰も乗っていない車椅子", "昔の自分", "こちらを見ている店員", "びしょ濡れの男", "写真でしか見たことのない人"],
  line: ["「まだ気づいてないんですか？」", "「それ、誰のこと？」", "「昨日も来ましたよね？」", "「ずっと後ろにいましたよ」", "「あなた、三人ですよね？」", "「ここには誰も住んでませんよ」", "「それ、あなたの声ですよ」", "「帰ったと思ってたんですけど」", "「今、振り返りました？」", "「次はあなたですよ」", "「その人、十年前に死んでますよ」", "「さっきから誰と話してるんですか？」"]
};

const STORY_TEMPLATES = [
  ({when, where, who, line}) => `${when}、私は${where}にいた。\n\nいつもの場所なのに、その日は時計の音だけがやけに近かった。誰かが廊下を往復しているらしく、足音が私の前で止まるたび、蛍光灯がひとつずつ消えた。\n\n最後の灯りの下に、${who}がいた。声をかけても動かない。ただ、私が息をするより少し早く、同じ呼吸を繰り返していた。\n\n逃げようと扉を押すと、背中側から小さな声がした。\n\n${line}`,
  ({when, where, who, line}) => `${when}の${where}で、忘れ物に気づいた。\n\n戻ると、さっきまで消えていた照明が点いていた。床には濡れた足跡があり、入口からではなく、私の足元から奥へ続いている。\n\n辿った先では、${who}が壁に向かって立っていた。鏡にだけ、その顔が映っている。なぜか鏡の中の私は笑っていた。\n\nそのとき、ポケットの中の携帯が震えた。発信者は私自身だった。出ると、\n\n${line}`,
  ({when, where, who, line}) => `${when}、${where}に私以外はいないはずだった。\n\nそれなのに、少し離れた場所から私の名前を呼ぶ声がした。返事をするたび、声は遠ざかる。やがて古い扉の前で途切れた。\n\n扉を開けると、狭い暗がりに${who}が座っていた。膝の上には、今朝撮ったばかりの私の写真が何枚も重ねられている。最後の一枚だけ、私の後ろに赤い印があった。\n\n${line}`,
  ({when, where, who, line}) => `${when}のことだった。${where}で、私は同じ場所を三度通った。\n\n目印に置いた硬貨は、そのたび表と裏が入れ替わっている。四度目、硬貨の横に小さな歯が落ちていた。五度目には二本になった。\n\n六度目、そこに${who}が待っていた。手のひらには、見覚えのある銀歯が載っている。舌で確かめると、口の奥に穴があった。\n\nそれは嬉しそうに私を見て、こう言った。\n\n${line}`,
  ({when, where, who, line}) => `${where}を出たのは${when}だった。\n\n帰り道、ガラスに映る私の影だけが立ち止まった。振り向いても誰もいない。もう一度見ると、影の隣に${who}が立っていた。\n\n歩くほど、それはガラスの中で私に近づいてくる。最後の窓を通り過ぎたとき、映っていたのはそれだけだった。私の姿はない。\n\n背後で、私と同じ声が囁いた。\n\n${line}`
];

const RARE_EVENTS = [
  r => { r.who = "あなた"; r.rareText = "なにがいた、が書き換わりました"; },
  r => { r.line = "「画面の後ろにいますよ」"; r.rareText = "知らない声が混ざりました"; },
  r => { r.when = "いま"; r.line = "「閉じても、続きますよ」"; r.rareText = "時刻が一致しません"; },
  r => { r.where = "この画面の中"; r.who = "読んでいるあなた"; r.rareText = "場所を特定しました"; }
];

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pick = list => list[Math.floor(Math.random() * list.length)];
const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let current = null;
let running = false;

function impact() {
  $("app").classList.remove("screen-shake");
  $("flash").classList.remove("blink");
  document.querySelector(".grain").classList.add("active");
  void $("app").offsetWidth;
  $("app").classList.add("screen-shake");
  $("flash").classList.add("blink");
  setTimeout(() => document.querySelector(".grain").classList.remove("active"), 190);
}

async function rollRow(key) {
  const row = document.querySelector(`[data-key="${key}"]`);
  const value = row.querySelector("strong");
  row.className = "draw-row rolling";
  const duration = prefersReduced ? 80 : 520 + Math.random() * 220;
  const start = performance.now();
  while (performance.now() - start < duration) {
    value.textContent = pick(OPTIONS[key]);
    await sleep(prefersReduced ? 40 : 48 + Math.random() * 30);
  }
  value.textContent = current[key];
  row.className = "draw-row locked";
  impact();
  await sleep(prefersReduced ? 50 : 320 + Math.random() * 180);
}

async function generate() {
  if (running) return;
  running = true;
  $("intro").hidden = true; $("result").hidden = true; $("generator").hidden = false; $("composing").hidden = true;
  document.querySelectorAll(".draw-row").forEach(row => { row.className = "draw-row"; row.querySelector("strong").textContent = "──"; });
  current = { when: pick(OPTIONS.when), where: pick(OPTIONS.where), who: pick(OPTIONS.who), line: pick(OPTIONS.line), rare: Math.random() < .05 };
  for (const key of ["when", "where", "who", "line"]) await rollRow(key);
  if (current.rare) {
    await sleep(250); $("app").classList.add("blackout"); await sleep(620);
    pick(RARE_EVENTS)(current);
    for (const key of ["when", "where", "who", "line"]) {
      const el = document.querySelector(`[data-key="${key}"] strong`);
      if (el.textContent !== current[key]) { el.textContent = current[key]; el.closest(".draw-row").classList.add("corrupt"); }
    }
    await sleep(320); $("app").classList.remove("blackout"); impact(); await sleep(420);
  }
  $("composing").hidden = false;
  await sleep(prefersReduced ? 250 : 1500 + Math.random() * 650);
  showResult(); running = false;
}

function strangeScore() {
  if (Math.random() < .3) return pick([0, 1, 3, 7, 13, 97, 99, 100]);
  return Math.floor(Math.random() * 101);
}

function showResult() {
  const fear = current.rare ? 100 : strangeScore(), weird = strangeScore(), real = strangeScore();
  current.scores = {fear, weird, real};
  const story = pick(STORY_TEMPLATES)(current);
  $("generator").hidden = true; $("result").hidden = false;
  $("storyNumber").textContent = `第${String(Math.floor(Math.random()*99)+1).padStart(2,"0")}話`;
  $("combination").textContent = `${current.when}　×　${current.where}　×　${current.who}`;
  const finalIndex = story.lastIndexOf(current.line);
  $("story").textContent = story.slice(0, finalIndex);
  const last = document.createElement("span"); last.className = "last-line"; last.textContent = current.line; $("story").append(last);
  [["fear",fear],["weird",weird],["real",real]].forEach(([id,n]) => { $(`${id}Score`).textContent=n; requestAnimationFrame(() => $(`${id}Bar`).style.width=`${n}%`); });
  if (current.rare) { $("resultCard").classList.add("corrupt"); setTimeout(() => $("resultCard").classList.remove("corrupt"), 900); }
  scrollTo({top:0,behavior:prefersReduced?"auto":"smooth"});
}

function share() {
  const text = `「${current.when} × ${current.where} × ${current.who}」\n\n恐怖度：${current.scores.fear}\n意味不明度：${current.scores.weird}\n\n#怪談ジェネレーター`;
  const url = location.href;
  if (navigator.share && matchMedia("(max-width: 700px)").matches) navigator.share({title:"怪談ジェネレーター",text,url}).catch(()=>{});
  else open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,"_blank","noopener,noreferrer");
}

$("startButton").addEventListener("click", generate);
$("againButton").addEventListener("click", generate);
$("shareButton").addEventListener("click", share);
