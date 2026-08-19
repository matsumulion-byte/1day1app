const P = (text, reading, overflow = false) => ({ text, reading, overflow });

const pools = [
  [
    P("夏の雲","なつのくも"),P("蝉しぐれ","せみしぐれ"),P("猫がいる","ねこがいる"),P("午後三時","ごごさんじ"),P("冷やし麺","ひやしめん"),
    P("青い空","あおいそら"),P("風の音","かぜのおと"),P("月あかり","つきあかり"),P("朝の駅","あさのえき"),P("雨あがる","あめあがる"),
    P("花ひらく","はなひらく"),P("雪の朝","ゆきのあさ"),P("秋の暮れ","あきのくれ"),P("春の風","はるのかぜ"),P("星ひとつ","ほしひとつ"),
    P("犬が寝る","いぬがねる"),P("鳥が飛ぶ","とりがとぶ"),P("海を見る","うみをみる"),P("山の影","やまのかげ"),P("川ひかる","かわひかる"),
    P("傘ひとつ","かさひとつ"),P("窓の外","まどのそと"),P("駅にいる","えきにいる"),P("靴を履く","くつをはく"),P("鍵がない","かぎがない"),
    P("飯を炊く","めしをたく"),P("水を飲む","みずをのむ"),P("パンを焼く","ぱんをやく"),P("豆腐買う","とうふかう"),P("蕎麦すする","そばすする"),
    P("席がない","せきがない"),P("バスを待つ","ばすをまつ"),P("会議中","かいぎちゅう"),P("メール来る","めーるくる"),P("課長来る","かちょうくる"),
    P("宿題だ","しゅくだいだ"),P("テストの日","てすとのひ"),P("チャイム鳴る","ちゃいむなる"),P("本を読む","ほんをよむ"),P("ペンがない","ぺんがない"),
    P("恋をする","こいをする"),P("君を待つ","きみをまつ"),P("手をつなぐ","てをつなぐ"),P("声が好き","こえがすき"),P("既読つく","きどくつく"),
    P("通知ゼロ","つうちぜろ"),P("ログインだ","ろぐいんだ"),P("猫動画","ねこどうが"),P("推しがいる","おしがいる"),P("バズりたい","ばずりたい"),
    P("二度寝する","にどねする"),P("まだ眠い","まだねむい"),P("腹が鳴る","はらがなる"),P("蚊に刺され","かにさされ"),P("何もない","なにもない"),
    P("茶がうまい","ちゃがうまい"),P("風呂が沸く","ふろがわく"),P("髪を切る","かみをきる"),P("夢を見る","ゆめをみる"),P("夜が来る","よるがくる"),P("松村です","まつむらです",true)
  ],
  [
    P("誰も来ないね","だれもこないね"),P("カレーを食べる","かれーをたべる"),P("部長が笑う","ぶちょうがわらう"),P("電車を降りる","でんしゃをおりる"),P("名前忘れた","なまえわすれた"),
    P("風だけが知る","かぜだけがしる"),P("静かに暮れる","しずかにくれる"),P("遠く鳴いてる","とおくないてる"),P("光こぼれる","ひかりこぼれる"),P("夕焼けを待つ","ゆうやけをまつ"),
    P("波音を聞く","なみおとをきく"),P("月だけ見てる","つきだけみてる"),P("木漏れ日揺れる","こもれびゆれる"),P("小雨降ってる","こさめふってる"),P("雲が流れる","くもがながれる"),
    P("猫が起きてる","ねこがおきてる"),P("犬まで笑う","いぬまでわらう"),P("雀が見てる","すずめがみてる"),P("金魚が黙る","きんぎょがだまる"),P("蛙帰るよ","かえるかえるよ"),
    P("プリンを分ける","ぷりんをわける"),P("餃子が焦げた","ぎょうざがこげた"),P("おでん染みてる","おでんしみてる"),P("アイスが溶ける","あいすがとける"),P("麦茶をこぼす","むぎちゃをこぼす"),
    P("信号は赤","しんごうはあか"),P("階段のぼる","かいだんのぼる"),P("自転車を押す","じてんしゃをおす"),P("財布を探す","さいふをさがす"),P("コンビニへ行く","こんびにへいく"),
    P("会議が長い","かいぎがながい"),P("資料が消えた","しりょうがきえた"),P("定時は夢さ","ていじはゆめさ"),P("社長見ている","しゃちょうみている"),P("印鑑がない","いんかんがない"),
    P("先生も寝る","せんせいもねる"),P("廊下を走る","ろうかをはしる"),P("答えは二番","こたえはにばん"),P("ノート忘れた","のーとわすれた"),P("放課後を待つ","ほうかごをまつ"),
    P("君だけ見てる","きみだけみてる"),P("返事まだない","へんじまだない"),P("言えずに帰る","いえずにかえる"),P("思い出してる","おもいだしてる"),P("さよなら言えず","さよならいえず"),
    P("タイムラインだ","たいむらいんだ"),P("パスワードどこ","ぱすわーどどこ"),P("検索をやめ","けんさくをやめ"),P("充電切れる","じゅうでんきれる"),P("コメントはゼロ","こめんとはぜろ"),
    P("靴下どこだ","くつしたどこだ"),P("冷房寒い","れいぼうさむい"),P("あくび止まらぬ","あくびとまらぬ"),P("ティッシュどこかな","てぃっしゅどこかな"),P("なんとなく行く","なんとなくいく"),
    P("昨日も同じ","きのうもおなじ"),P("まあ大丈夫","まあだいじょうぶ"),P("ひとまず寝よう","ひとまずねよう"),P("心ざわめく","こころざわめく"),P("世界は回る","せかいはまわる")
  ],
  [
    P("帰りたい","かえりたい"),P("夏休み","なつやすみ"),P("風が吹く","かぜがふく"),P("知らんけど","しらんけど"),P("また明日","またあした"),
    P("朝が来る","あさがくる"),P("日が沈む","ひがしずむ"),P("月が出る","つきがでる"),P("星が降る","ほしがふる"),P("雨の音","あめのおと"),
    P("春の夢","はるのゆめ"),P("秋の風","あきのかぜ"),P("冬の空","ふゆのそら"),P("夏の月","なつのつき"),P("花の影","はなのかげ"),
    P("猫が鳴く","ねこがなく"),P("犬が来る","いぬがくる"),P("鳥の声","とりのこえ"),P("魚跳ね","さかなはね"),P("虫がいる","むしがいる"),
    P("腹減った","はらへった"),P("飯うまい","めしうまい"),P("茶をすする","ちゃをすする"),P("パンがない","ぱんがない"),P("寿司食べる","すしたべる"),
    P("まだ仕事","まだしごと"),P("会議なう","かいぎなう"),P("休みたい","やすみたい"),P("あと五分","あとごふん"),P("締切だ","しめきりだ"),
    P("宿題だ","しゅくだいだ"),P("テスト無理","てすとむり"),P("席につく","せきにつく"),P("ベルが鳴る","べるがなる"),P("夏補習","なつほしゅう"),
    P("君が好き","きみがすき"),P("また会おう","またあおう"),P("会いたいな","あいたいな"),P("忘れない","わすれない"),P("恋だった","こいだった"),
    P("既読無視","きどくむし"),P("ログアウト","ろぐあうと"),P("通知来る","つうちくる"),P("バズらない","ばずらない"),P("フォローする","ふぉろーする"),
    P("まあいいか","まあいいか"),P("もういいよ","もういいよ"),P("なぜだろう","なぜだろう"),P("それはそれ","それはそれ"),P("たぶん無理","たぶんむり"),
    P("寝てしまう","ねてしまう"),P("二度寝した","にどねした"),P("風呂入る","ふろはいる"),P("鍵閉める","かぎしめる"),P("靴を脱ぐ","くつをぬぐ"),
    P("空を見る","そらをみる"),P("夢のあと","ゆめのあと"),P("何もせず","なにもせず"),P("ただいまよ","ただいまよ"),P("おやすみな","おやすみな"),P("松村です","まつむらです",true)
  ]
];

const reviews = ["余韻があります。","夏の気配を感じます。","大胆な一句です。","現代社会への問いかけでしょうか。","よくわかりません。","作者にしか見えない景色があります。","季語はたぶんあります。","知らんけど。","静けさの中に勢いがあります。","切れ味だけは確かです。","三回読むと味が出ます。","令和を代表する可能性があります。","偶然とは思えない取り合わせです。","説明しない強さがあります。","たいへん自由です。"];

const smallKana = /[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/g;
const moraCount = reading => [...reading.replace(smallKana, "")].length;
const expected = [5, 7, 5];
const validPools = pools.map((pool, index) => pool.filter(item => item.overflow || moraCount(item.reading) === expected[index]));
validPools.forEach((pool, index) => { if (pool.length < 50) console.error(`${expected[index]}音の候補が不足しています: ${pool.length}`); });

const reels = [...document.querySelectorAll(".reel")];
const phrases = [...document.querySelectorAll(".phrase")];
const spinButton = document.getElementById("spinButton");
const critiqueText = document.getElementById("critiqueText");
const shareButton = document.getElementById("shareButton");
const copyButton = document.getElementById("copyButton");
const toast = document.getElementById("toast");
let current = [validPools[0][0], validPools[1][0], validPools[2][0]];
let running = [false, false, false];
let lastReview = -1;

function sample(list, previous) {
  if (list.length < 2) return list[0];
  let picked;
  do picked = list[Math.floor(Math.random() * list.length)]; while (picked === previous);
  return picked;
}

function setReview() {
  let next;
  do next = Math.floor(Math.random() * reviews.length); while (next === lastReview);
  lastReview = next;
  critiqueText.textContent = reviews[next];
  critiqueText.animate([{opacity:0,transform:"translateY(5px)"},{opacity:1,transform:"none"}],{duration:320,easing:"ease-out"});
}

function roll(index, duration = 650) {
  if (running[index]) return Promise.resolve();
  running[index] = true;
  const reel = reels[index];
  reel.classList.remove("settled");
  reel.classList.add("spinning");
  const interval = window.setInterval(() => { phrases[index].textContent = sample(validPools[index], null).text; }, 58);
  return new Promise(resolve => window.setTimeout(() => {
    window.clearInterval(interval);
    current[index] = sample(validPools[index], current[index]);
    phrases[index].textContent = current[index].text;
    reel.classList.remove("spinning");
    void reel.offsetWidth;
    reel.classList.add("settled");
    running[index] = false;
    resolve();
  }, duration));
}

async function spinAll() {
  if (running.some(Boolean)) return;
  spinButton.disabled = true;
  spinButton.querySelector("span").textContent = "詠み中…";
  const starts = [roll(0, 560), new Promise(r => setTimeout(r, 160)).then(() => roll(1, 720)), new Promise(r => setTimeout(r, 330)).then(() => roll(2, 860))];
  await Promise.all(starts);
  setReview();
  spinButton.disabled = false;
  spinButton.querySelector("span").textContent = "一句詠む";
}

async function reroll(index) {
  if (running.some(Boolean)) return;
  await roll(index, 520);
  setReview();
}

function shareText() { return `${current.map(item => item.text).join("\n")}\n\n#俳句スロット\n#俳句の日`; }
function showToast(message) { toast.textContent = message; toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800); }
async function copyHaiku() {
  try { await navigator.clipboard.writeText(shareText()); showToast("一句をコピーしました"); }
  catch { const area=document.createElement("textarea"); area.value=shareText(); document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove(); showToast("一句をコピーしました"); }
}

spinButton.addEventListener("click", spinAll);
reels.forEach((reel, index) => reel.addEventListener("click", () => reroll(index)));
copyButton.addEventListener("click", copyHaiku);
shareButton.addEventListener("click", async () => {
  const text = shareText();
  if (navigator.share) { try { await navigator.share({title:"俳句スロット",text}); return; } catch (error) { if (error.name === "AbortError") return; } }
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url,"_blank","noopener,noreferrer");
});

// ページを開いた瞬間から、偶然できた最初の一句を表示する。
current = validPools.map(pool => sample(pool, null));
current.forEach((item, index) => { phrases[index].textContent = item.text; });
setReview();
