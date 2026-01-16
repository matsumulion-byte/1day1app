// 各ヒーローが出る全パターンをリストアップ

const HEROES = {
  spiderman: { id: "spiderman", name: "スパイダーマンタイプ" },
  ironman: { id: "ironman", name: "アイアンマンタイプ" },
  superman: { id: "superman", name: "スーパーマンタイプ" },
  batman: { id: "batman", name: "バットマンタイプ" },
  ultraman: { id: "ultraman", name: "ウルトラマンタイプ" },
  kamenrider: { id: "kamenrider", name: "仮面ライダータイプ" },
  godzilla: { id: "godzilla", name: "ゴジラ（レア）" }
};

const QUESTIONS = [
  {
    q: "トラブル発生。最初の一手は？",
    a: [
      { t: "とにかく現場へ行く", points: { spiderman: 2, ultraman: 1 }, tag: "action" },
      { t: "原因を特定して仕組みで潰す", points: { ironman: 2, batman: 1 }, tag: "logic" },
      { t: "まずは勝てる準備を整える", points: { batman: 2, superman: 1 }, tag: "prep" }
    ]
  },
  {
    q: "あなたの強さの源は？",
    a: [
      { t: "才能やスペック（存在感）", points: { superman: 2, ultraman: 1 }, tag: "power" },
      { t: "頭脳・道具・発明", points: { ironman: 2, batman: 1 }, tag: "logic" },
      { t: "粘りと伸びしろ（成長）", points: { spiderman: 2, kamenrider: 1 }, tag: "growth" }
    ]
  },
  {
    q: "チームでの立ち位置は？",
    a: [
      { t: "前で引っ張る（象徴）", points: { superman: 2, captain: 0 }, tag: "lead" },
      { t: "裏で勝ち筋を作る（参謀）", points: { batman: 2, ironman: 1 }, tag: "prep" },
      { t: "必要な時だけ全力で出る（切り札）", points: { ultraman: 2, kamenrider: 1 }, tag: "burst" }
    ]
  },
  {
    q: "理不尽な状況、どう向き合う？",
    a: [
      { t: "正面突破して空気を変える", points: { ultraman: 2, superman: 1 }, tag: "action" },
      { t: "ルールの外で解決してしまう", points: { batman: 2, kamenrider: 1 }, tag: "shadow" },
      { t: "工夫して「勝てる形」に変える", points: { ironman: 2, spiderman: 1 }, tag: "logic" }
    ]
  },
  {
    q: "「正義」とは？",
    a: [
      { t: "守ること（安心の提供）", points: { superman: 2, ultraman: 1 }, tag: "protect" },
      { t: "戦い続けること（継続）", points: { kamenrider: 2, batman: 1 }, tag: "persist" },
      { t: "迷いながらでも動くこと（人間味）", points: { spiderman: 2, ironman: 1 }, tag: "growth" }
    ]
  }
];

// 質問の選択肢テキストを取得
function getChoiceText(qIndex, aIndex) {
  return QUESTIONS[qIndex].a[aIndex].t;
}

// 回答パターンから結果を計算
function computeResult(answers) {
  const heroKeys = Object.keys(HEROES).filter(k => k !== "godzilla");
  const points = Object.fromEntries(heroKeys.map(k => [k, 0]));
  const tags = [];
  
  for (let qIdx = 0; qIdx < QUESTIONS.length; qIdx++) {
    const opt = QUESTIONS[qIdx].a[answers[qIdx]];
    if (opt.tag) tags.push(opt.tag);
    for (const [k, v] of Object.entries(opt.points || {})) {
      if (points[k] != null) {
        points[k] += v;
      }
    }
  }
  
  // 最高得点を取得
  const entries = Object.entries(points);
  entries.sort((a, b) => b[1] - a[1]);
  const topScore = entries[0][1];
  const tied = entries.filter(e => e[1] === topScore).map(e => e[0]);
  
  // 同点時の判定（直近の回答で最後に加点された方を優先）
  if (tied.length === 1) {
    return tied[0];
  }
  
  // tie-break
  for (let idx = answers.length - 1; idx >= 0; idx--) {
    const picked = QUESTIONS[idx].a[answers[idx]];
    const keys = Object.keys(picked.points || {});
    const prefer = keys.find(k => tied.includes(k) && (picked.points[k] || 0) > 0);
    if (prefer) return prefer;
  }
  
  return tied[0];
}

// 各ヒーローが出る全パターンを収集
function findAllPatternsForHero(heroId) {
  const patterns = [];
  const totalCombinations = Math.pow(3, QUESTIONS.length); // 3^5 = 243
  
  for (let i = 0; i < totalCombinations; i++) {
    const answers = [];
    let num = i;
    for (let q = 0; q < QUESTIONS.length; q++) {
      answers.push(num % 3);
      num = Math.floor(num / 3);
    }
    
    const result = computeResult(answers);
    if (result === heroId) {
      patterns.push(answers);
    }
  }
  
  return patterns;
}

// パターンを読みやすい形式で表示
function formatPattern(pattern) {
  return pattern.map((a, i) => {
    const text = getChoiceText(i, a);
    return `Q${i+1}: ${text}`;
  });
}

// 各ヒーローのパターンを表示
console.log("=== 各ヒーローが出る回答パターン ===\n");

const heroKeys = Object.keys(HEROES).filter(k => k !== "godzilla");

for (const heroId of heroKeys) {
  console.log(`\n【${HEROES[heroId].name}】`);
  const patterns = findAllPatternsForHero(heroId);
  console.log(`全${patterns.length}パターン\n`);
  
  // 最初の10パターンと最後のパターンを表示
  const displayCount = Math.min(10, patterns.length);
  for (let i = 0; i < displayCount; i++) {
    const pattern = patterns[i];
    console.log(`パターン ${i + 1}:`);
    formatPattern(pattern).forEach(line => console.log(`  ${line}`));
    console.log("");
  }
  
  if (patterns.length > displayCount) {
    console.log(`... 他 ${patterns.length - displayCount} パターン\n`);
  }
  
  // 統計情報
  const choiceCounts = [0, 0, 0];
  patterns.forEach(p => {
    p.forEach(a => choiceCounts[a]++);
  });
  console.log(`統計: 選択肢1が${choiceCounts[0]}回、選択肢2が${choiceCounts[1]}回、選択肢3が${choiceCounts[2]}回`);
}

// ゴジラについて
console.log("\n\n【ゴジラ（レア）】");
console.log("ゴジラは確率判定のため、特定の回答パターンで出現確率が上がります。");
console.log("\n出現確率が上がる条件:");
console.log("- shadowタグが2つ以上: ベース1.5% + 5% = 6.5%");
console.log("- persistタグが2つ以上: ベース1.5% + 4% = 5.5%");
console.log("- logicタグが3つ以上: ベース1.5% + 2% = 3.5%");
console.log("- 複数条件が重なると最大18%まで上昇");
console.log("\nゴジラが出やすい回答例:");
console.log("Q1: ルールの外で解決してしまう (shadow)");
console.log("Q2: 頭脳・道具・発明 (logic)");
console.log("Q3: 裏で勝ち筋を作る (prep)");
console.log("Q4: ルールの外で解決してしまう (shadow)");
console.log("Q5: 戦い続けること（継続） (persist)");
console.log("→ shadow×2, persist×1, logic×1 で確率が上がります");
