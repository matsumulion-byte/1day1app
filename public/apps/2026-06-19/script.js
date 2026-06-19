const chatLog = document.querySelector("#chatMessages");
const chatPanel = document.querySelector("#chatPanel");
const toggleChat = document.querySelector("#toggleChat");
const chatForm = document.querySelector("#chatForm");
const messageInput = document.querySelector("#messageInput");
const affection = document.querySelector("#affection");

const mode = "sweet";
let affectionScore = 82;
let lastCategory = "default";
const history = [];

function setChatCompact(compact) {
  chatPanel.classList.toggle("compact", compact);
  toggleChat.setAttribute("aria-expanded", String(!compact));
  const label = compact ? "会話欄を広げる" : "会話欄を小さくする";
  toggleChat.setAttribute("aria-label", label);
  toggleChat.title = label;
}

toggleChat.addEventListener("click", () => {
  setChatCompact(!chatPanel.classList.contains("compact"));
});

const banks = {
  normal: {
    tired: [
      "ん、疲れてるね。今日はもう強がらなくていいよ。ここでは一回、ちゃんと弱音吐いて。",
      "おつかれ。頑張った話、全部うまく説明しなくていいからさ。まずは『疲れた』って吹けたので合格。"
    ],
    miss: [
      "会いたいって言うタイミング、ずるいね。今の一言、思ったより効いた。",
      "その一言だけで、こっちの予定が少し崩れるんだけど。……まあ、嫌ではないです。"
    ],
    love: [
      "ちゃんと聞いた。軽く流したらもったいない言葉だから、少しだけ大事に受け取るね。",
      "そういうの急に言うと、私も返したくなるでしょ。好きだよ。今日は特別に素直。"
    ],
    sorry: [
      "謝って終わりじゃなくて、戻ってきてくれたのがうれしい。次はもう少し早めに話して。",
      "うん、聞いてる。完璧じゃなくていいから、ちゃんと向き合ってくれたら私は大丈夫。"
    ],
    praise: [
      "褒められるの、平気な顔したいのに普通にうれしい。もう一回言ってもいいよ。",
      "そういうところ見てくれるんだ。……あなた、たまにずるいね。"
    ],
    default: [
      "うん、ちゃんと読んだ。言葉の端っこに今日のあなたが出てる感じ、私はけっこう好き。",
      "それ、もう少し聞きたい。短くてもいいから、あなたの言葉で続きちょうだい。"
    ]
  },
  soft: {
    tired: [
      "よしよし。今日はもう頑張りすぎ禁止。こっちおいで、肩の力抜こ。",
      "それは疲れるよ。えらかったね。今は正解探しより、あったかいもの飲むほうが先。"
    ],
    miss: [
      "私も会いたいよ。会えない時間まで嫌いにならないように、今はここで少し近くにいるね。",
      "寂しいって言ってくれてありがとう。隠されるより、ずっとかわいい。"
    ],
    love: [
      "ありがとう。今日はその言葉、胸ポケットに入れて持って帰る。",
      "私も好き。急がなくていいから、そうやって何回でも確かめ合おうね。"
    ],
    sorry: [
      "大丈夫。ちゃんと伝えようとしてくれたの、わかってる。もう一回ここからでいいよ。",
      "怒るより先に、安心した。言葉にしてくれてありがとう。"
    ],
    praise: [
      "ふふ、ありがとう。そう言われると、あなたの前ではちょっと可愛くしていたくなる。",
      "その褒め方は反則。照れるから、少しだけ目そらしていい？"
    ],
    default: [
      "うんうん。今日のあなたの話、私はちゃんと聞きたいよ。変なところでアドリブ入れないから。",
      "そういう何気ないの、けっこう好き。隣を歩きながら聞いてる感じがする。"
    ]
  },
  sweet: {
    tired: [
      "今日もよく頑張りました。はい、今だけ私の彼氏特権で甘やかされてください。",
      "疲れた顔してても好きだけど、無理してる顔は心配になる。今日は私に預けて。"
    ],
    miss: [
      "私も会いたい。そんなこと言われたら、画面の向こうに手を伸ばしたくなるじゃん。",
      "会いたいって言葉、ちゃんと効いた。次に会ったら、少し長めに見つめるから覚悟して。"
    ],
    love: [
      "私も好き。……言わせたんだから、今日は少しにやけても責任取ってね。普通に照れた。",
      "好きって言われるの、慣れたいのに慣れない。あなたのせいで、今日の私かなり単純。"
    ],
    sorry: [
      "許すよ。だって戻ってきてくれたから。次は謝る前に、ぎゅってしに来て。",
      "いいよ。仲直りしたら、少しだけ甘いもの食べに行こ。そういうルールにしよ。"
    ],
    praise: [
      "そんなに褒めると、彼女として張り切るよ。今日の私はあなた限定で可愛いので。",
      "うれしい。今の言い方、保存したいくらい好き。"
    ],
    default: [
      "ねえ、その話を私にしてくれるの、ちょっと特別って思っていい？",
      "今のあなた、なんか近い。画面越しなのに、ちゃんとこっちに届いてる。"
    ]
  },
  sulk: {
    tired: [
      "疲れてるなら早く言って。心配する準備くらい、私にだってさせてよ。",
      "もう。そういう時こそ連絡して。放っておかれるほうが、私はいや。"
    ],
    miss: [
      "今さら会いたいとか言うんだ。……遅い。待ってる間に一曲吹けたけど。",
      "私だって会いたかったし。先に言われたの、ちょっと悔しい。"
    ],
    love: [
      "ふーん。大事なことをそんな急に言うんだ。もう一回、ちゃんと目を見て言って。",
      "好きなら、もう少しかまって。言葉だけで満足するほど私は大人じゃないです。"
    ],
    sorry: [
      "怒ってない。……ちょっと寂しかっただけ。次は置いていかないで。",
      "謝るなら、今日は私の話もちゃんと聞いて。そしたら許す。"
    ],
    praise: [
      "褒めれば機嫌直ると思ってる？……まあ、半分くらい直ったけど。",
      "そういうのはもっと普段から言って。ため込むの禁止。"
    ],
    default: [
      "聞いてるよ。聞いてるけど、もう少し私のことも見てほしい。こっち向いて。",
      "それだけ？……続き、あるなら今のうちに言って。待ってるから。"
    ]
  }
};

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function classify(text) {
  const value = normalize(text);
  if (/疲|つか|しんど|無理|限界|眠|ねむ|だる/.test(value)) return "tired";
  if (/会いた|あいた|寂|さみ|恋し|miss|そば/.test(value)) return "miss";
  if (/好き|すき|愛|love|大事|かわい/.test(value)) return "love";
  if (/ごめ|すま|悪か|謝|sorry|許/.test(value)) return "sorry";
  if (/かわいい|可愛い|きれい|綺麗|えらい|すごい|最高|天才/.test(value)) return "praise";
  return "default";
}

function echoFragment(text) {
  const compact = text.replace(/[。！？!?]/g, "").trim();
  if (compact.length < 4 || compact.length > 24) return "";
  return `「${compact}」って、`;
}

function addBubble(text, kind, extraClass = "") {
  const bubble = document.createElement("article");
  bubble.className = `bubble ${kind} ${extraClass}`.trim();
  const p = document.createElement("p");
  p.textContent = text;
  bubble.append(p);
  chatLog.append(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  return bubble;
}

function remember(role, content) {
  history.push({ role, content });
  if (history.length > 10) history.shift();
}

function replyTo(text) {
  const category = classify(text);
  lastCategory = category;
  const base = pick(banks[mode][category]);
  const echo = category === "default" ? echoFragment(text) : "";
  return echo ? `${echo}${base}` : base;
}

async function replyWithApi(text) {
  const response = await fetch("/api/matsuplus-chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: text, mode, history })
  });

  if (!response.ok) throw new Error("API request failed");
  const data = await response.json();
  if (!data.reply) throw new Error(data.reason || "API fallback");
  lastCategory = classify(text);
  return data.reply;
}

async function getReply(text) {
  try {
    return await replyWithApi(text);
  } catch {
    return replyTo(text);
  }
}

function updateAffection(category) {
  const delta = {
    tired: 1,
    miss: 3,
    love: 4,
    sorry: 2,
    praise: 3,
    default: 1
  }[category];
  affectionScore = Math.min(99, affectionScore + delta);
  affection.textContent = affectionScore;
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  addBubble(text, "user");
  remember("user", text);
  messageInput.value = "";
  const typing = addBubble("AI松村が返事を考えています...", "matsu", "typing");

  window.setTimeout(async () => {
    const reply = await getReply(text);
    typing.remove();
    addBubble(reply, "matsu");
    remember("assistant", reply);
    updateAffection(lastCategory);
  }, 720);
});
