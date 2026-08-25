(() => {
  "use strict";

  // 読み（かな）を添えて、拗音を1拍として数えた音数を確認済み。
  const fives = [
    ["月曜日", "げつようび"], ["まだ眠い", "まだねむい"], ["もう五時か", "もうごじか"],
    ["傘がない", "かさがない"], ["猫が見る", "ねこがみる"], ["風ぬるい", "かぜぬるい"],
    ["靴ぬれて", "くつぬれて"], ["夢だった", "ゆめだった"], ["米を炊く", "こめをたく"],
    ["バスが来る", "ばすがくる"], ["席がない", "せきがない"], ["腹が鳴る", "はらがなる"],
    ["鍵がない", "かぎがない"], ["夏の雲", "なつのくも"], ["蝉しぐれ", "せみしぐれ"],
    ["冷やし麺", "ひやしめん"], ["窓の月", "まどのつき"], ["金がない", "かねがない"],
    ["恋でした", "こいでした"], ["君が好き", "きみがすき"], ["既読だけ", "きどくだけ"],
    ["課長来る", "かちょうくる"], ["判を押す", "はんをおす"], ["茶がうまい", "ちゃがうまい"],
    ["犬は寝る", "いぬはねる"], ["鳥が飛ぶ", "とりがとぶ"], ["やや寒い", "ややさむい"],
    ["夜明け前", "よあけまえ"], ["箸がない", "はしがない"], ["たぶん無理", "たぶんむり"],
    ["海遠い", "うみとおい"], ["星ひとつ", "ほしひとつ"], ["味うすい", "あじうすい"],
    ["髪を切る", "かみをきる"], ["蚊に刺され", "かにさされ"], ["皿を割る", "さらをわる"],
    ["明日やる", "あしたやる"], ["水を飲む", "みずをのむ"], ["無言です", "むごんです"],
    ["駅にいる", "えきにいる"], ["風が吹く", "かぜがふく"], ["すぐ帰る", "すぐかえる"],
    ["ひとりごと", "ひとりごと"], ["空を見る", "そらをみる"], ["塩むすび", "しおむすび"],
    ["本を閉じ", "ほんをとじ"], ["朝が来た", "あさがきた"], ["レジ袋", "れじぶくろ"]
  ];

  const sevens = [
    ["会議は続く", "かいぎはつづく"], ["財布を忘れ", "さいふをわすれ"],
    ["理由などない", "りゆうなどない"], ["冷房強め", "れいぼうつよめ"],
    ["返事は明日", "へんじはあした"], ["プリン別腹", "ぷりんべつばら"],
    ["メールが五件", "めーるがごけん"], ["上司見ている", "じょうしみている"],
    ["電車は行った", "でんしゃはいった"], ["締切きのう", "しめきりきのう"],
    ["今日定時です", "きょうていじです"], ["暗証忘れ", "あんしょうわすれ"],
    ["名前出てこぬ", "なまえでてこぬ"], ["氷が溶ける", "こおりがとける"],
    ["麦茶がぬるい", "むぎちゃがぬるい"], ["花火は遠く", "はなびはとおく"],
    ["夕立のあと", "ゆうだちのあと"], ["素麺ばかり", "そうめんばかり"],
    ["エアコン負けた", "えあこんまけた"], ["アイスが消えた", "あいすがきえた"],
    ["給料日前", "きゅうりょうびまえ"], ["小銭足りない", "こぜにたりない"],
    ["家賃を払う", "やちんをはらう"], ["レシート長い", "れしーとながい"],
    ["宝くじ買う", "たからくじかう"], ["君から既読", "きみからきどく"],
    ["デートは雨か", "でーとはあめか"], ["告白できず", "こくはくできず"],
    ["指輪まぶしい", "ゆびわまぶしい"], ["あの人誰だ", "あのひとだれだ"],
    ["部長笑った", "ぶちょうわらった"], ["隣も休み", "となりもやすみ"],
    ["空気を読まず", "くうきをよまず"], ["話が長い", "はなしがながい"],
    ["鳩だけ集う", "はとだけつどう"], ["豆腐が揺れる", "とうふがゆれる"],
    ["カーテン踊る", "かーてんおどる"], ["階段きしむ", "かいだんきしむ"],
    ["消しゴム丸い", "けしごむまるい"], ["雲だけ速い", "くもだけはやい"],
    ["自販機ぬるい", "じはんきぬるい"], ["廊下にきのこ", "ろうかにきのこ"],
    ["昨日のカレー", "きのうのかれー"], ["卵割りすぎ", "たまごわりすぎ"],
    ["味噌汁しみる", "みそしるしみる"], ["唐揚げひとつ", "からあげひとつ"],
    ["ラーメン伸びる", "らーめんのびる"], ["おにぎり固い", "おにぎりかたい"],
    ["誰にも言わず", "だれにもいわず"], ["答えは風に", "こたえはかぜに"],
    ["記憶あいまい", "きおくあいまい"], ["だいたい平気", "だいたいへいき"],
    ["帰ればわかる", "かえればわかる"], ["何かが違う", "なにかがちがう"],
    ["静かに焦る", "しずかにあせる"], ["しばらく待とう", "しばらくまとう"]
  ];

  const lines = [...document.querySelectorAll(".line")];
  const poem = document.querySelector("#senryu");
  const button = document.querySelector("#generate");
  const MATSUMURA = "松村です";
  let timer = null;

  const pick = (list) => list[Math.floor(Math.random() * list.length)][0];

  function makeSenryu() {
    return Math.random() < .5
      ? [MATSUMURA, pick(sevens), pick(fives)]
      : [pick(fives), pick(sevens), MATSUMURA];
  }

  function render(verse, final = false) {
    lines.forEach((line, index) => {
      line.textContent = verse[index];
      line.classList.toggle("matsumura", final && verse[index] === MATSUMURA);
    });
  }

  function generate(animate = true) {
    clearInterval(timer);
    poem.classList.remove("settled");

    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      render(makeSenryu(), true);
      poem.classList.add("settled");
      return;
    }

    button.disabled = true;
    poem.classList.add("spinning");
    let ticks = 0;
    render(makeSenryu());

    timer = setInterval(() => {
      ticks += 1;
      render(makeSenryu());
      if (ticks >= 8) {
        clearInterval(timer);
        timer = null;
        render(makeSenryu(), true);
        poem.classList.remove("spinning");
        void poem.offsetWidth;
        poem.classList.add("settled");
        button.disabled = false;
      }
    }, 48);
  }

  // 開発時にも音数の崩れを発見できる簡易検算。
  function moraCount(kana) {
    return [...kana.replace(/[ぁぃぅぇぉゃゅょァィゥェォャュョ]/g, "")].length;
  }
  console.assert(fives.every(([, reading]) => moraCount(reading) === 5), "5音句に音数違反があります");
  console.assert(sevens.every(([, reading]) => moraCount(reading) === 7), "7音句に音数違反があります");

  button.addEventListener("click", () => generate(true));
  generate(false);
})();
