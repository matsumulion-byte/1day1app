const WHAT = [
    "歯ブラシ","靴下","リモコン","冷蔵庫","目覚まし時計",
    "ペン","傘","スマホケース","枕","ドア"
  ];
  
  const HOW = [
    "テンションを測る","無駄に光る","勝手に褒めてくる",
    "過去を思い出させる","やる気を吸い取る",
    "ちょっとだけ回転する","変な音が鳴る",
    "他人と同期する","匂いを変える","意味なく通知する"
  ];
  
  const WHEN = [
    "雨の日だけ","深夜2時に","会議中だけ","触ってないときに",
    "寝る直前に","なんとなく","週に一度だけ",
    "誰かに見られているとき","忙しいときほど","完全に忘れた頃に"
  ];
  
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randStar = () => "★".repeat(Math.floor(Math.random()*5)+1) + "☆".repeat(5 - Math.floor(Math.random()*5));
  
  const titleEl = document.getElementById("title");
  const descEl = document.getElementById("desc");
  const statsEl = document.getElementById("stats");
  const card = document.getElementById("card");
  
  let currentText = "";
  
  document.getElementById("generate").onclick = () => {
    const w = rand(WHAT);
    const h = rand(HOW);
    const t = rand(WHEN);
  
    const title = `${t}${h}${w}`;
    const desc = `${t}、${h}機能が発動する。`;
  
    const stats = `
  実用性：${randStar()}
  無駄度：${randStar()}
  欲しさ：${randStar()}
    `;
  
    titleEl.textContent = title;
    descEl.textContent = desc;
    statsEl.textContent = stats;
  
    currentText = `私は「${title}」を発明しました。\n無駄度MAXかも。\n#ムダ発明研究所`;
  
    card.classList.remove("active");
    setTimeout(() => card.classList.add("active"), 10);
  };
  
  document.getElementById("share").onclick = () => {
    if (!currentText) return;
  
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(currentText)}`;
    window.open(url, "_blank");
  };