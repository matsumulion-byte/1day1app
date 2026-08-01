(() => {
  "use strict";

  const scenes = [
    {
      label:"SUNDAY · 10:04", prompt:"布団が、まだあなたを離さない。", aside:"カーテンの向こうは、たぶん晴れ。",
      tiles:[
        ["🛌","二度寝","self",44,"目覚ましを切った。","夢の続きを見たが、内容はもう覚えていない。"],
        ["👕","洗濯物","duty",24,"洗濯物を切った。","午後から雨。結果的には名采配。"],
        ["📱","母の着信","people",12,"母の着信を切った。","要件は『特にない』だったらしい。"],
        ["🍽","昨夜の皿","duty",13,"昨夜の皿を切った。","シンクと目が合わなくなった。"],
        ["🎮","積みゲーム","fun",7,"積みゲームを切った。","積んでいる限り、可能性は無限だ。"]
      ]
    },
    {
      label:"KITCHEN · 12:38", prompt:"冷蔵庫に、何もないとは言えない。", aside:"買い物へ行くには、外が少し暑すぎる。",
      tiles:[
        ["⬜","昨日の豆腐","safe",31,"昨日の豆腐を切った。","冷蔵庫の治安が、少し良くなった。"],
        ["🍮","高級プリン","fun",18,"高級プリンを切った。","いちばん良い日が、今日になった。"],
        ["🥣","誰かの作り置き","people",9,"作り置きを切った。","夜、静かな家族会議が開かれた。"],
        ["🥟","冷凍餃子","self",34,"冷凍餃子を切った。","羽根つきにはならなかった。でもうまい。"],
        ["🫥","空腹","safe",8,"空腹を切った。","水を飲んだ。空腹はまだこちらを見ている。"]
      ]
    },
    {
      label:"TRAIN · 17:21", prompt:"ひとつだけ、微妙な席が空いた。", aside:"座りたい。でも、全員が同じことを考えている。",
      tiles:[
        ["💺","空いた席","self",38,"空いた席を切った。","目の前の人が座った。妙に悔しい。"],
        ["👀","周囲の視線","safe",16,"周囲の視線を切った。","座った瞬間、世界は何も気にしていなかった。"],
        ["🎧","イヤホン","fun",11,"イヤホンを切った。","電車の音が、思ったより電車だった。"],
        ["🚪","ドア横","safe",21,"ドア横を切った。","人の波に運ばれ、ちょうどよく降りた。"],
        ["📲","あと一駅","duty",14,"あと一駅を切った。","気づけば二駅、歩いていた。"]
      ]
    },
    {
      label:"CHAT · 20:06", prompt:"三年ぶりの『久しぶり！』が届いた。", aside:"その次の文章は、まだ来ていない。",
      tiles:[
        ["↩","即レス","people",19,"即レスを切った。","会話は弾んだ。用件だけはまだ分からない。"],
        ["✓","既読","safe",26,"既読を切った。","スマホを伏せても、通知は心に残った。"],
        ["👋","スタンプ","fun",28,"スタンプを切った。","万能の手を振る熊が、すべてを引き受けた。"],
        ["？","誰だっけ","self",8,"記憶を切った。","プロフィール画像を拡大しても分からない。"],
        ["🌙","明日返す","duty",19,"明日返すを切った。","明日は、翌日になった。"]
      ]
    },
    {
      label:"BEDROOM · 00:47", prompt:"寝る理由と、寝ない理由がそろった。", aside:"充電は3%。動画はあと12分。",
      tiles:[
        ["🔌","充電器","duty",9,"充電器を切った。","朝、黒い鏡だけが残った。"],
        ["▶","続きの動画","fun",36,"続きの動画を切った。","関連動画が、次の親番を待っている。"],
        ["🛁","まだの風呂","duty",23,"風呂を切った。","明日の自分へ、重い牌を残した。"],
        ["💬","返信ひとつ","people",17,"返信を切った。","送信後に誤字を見つけた。もう戻れない。"],
        ["😴","睡眠","self",15,"睡眠を切った。","明日のあなたが、静かに振り込んだ。"]
      ]
    }
  ];

  const results = {
    self:["自分時間死守型","自分の機嫌を取れるのは自分だけ。無理な局面では、ちゃんと席を立てる打ち手です。"],
    duty:["先送り芸術型","今やらなくても世界は回る。その真理を知りつつ、明日の自分に少しだけ多く託します。"],
    people:["人間関係ベタオリ型","空気の変化には誰より敏感。波風を避ける技術で、今日も卓を丸く収めました。"],
    fun:["楽しさ全ツッパ型","期待値より胸の高鳴り。小さなご褒美を見逃さない、人生の攻め型です。"],
    safe:["様子見の達人型","危険牌には手を出さない。決めないことも立派な選択だと知っています。"]
  };

  const $ = s => document.querySelector(s);
  const screens = [...document.querySelectorAll(".screen")];
  let turn = 0, choices = [];

  function show(id){ screens.forEach(s => s.classList.toggle("active", s.id === id)); window.scrollTo(0,0); }
  function roundName(){ return ["東一局","東二局","東三局","東四局","南一局"][turn] || "終局"; }

  function renderScene(){
    const scene = scenes[turn];
    $("#round").textContent = roundName();
    $("#meter").style.width = `${(turn + 1) * 20}%`;
    $("#scene-label").textContent = scene.label;
    $("#prompt").textContent = scene.prompt;
    $("#aside").textContent = scene.aside;
    const box = $("#tiles"); box.innerHTML = "";
    scene.tiles.forEach((tile,i) => {
      const button = document.createElement("button");
      button.className = "tile";
      button.innerHTML = `<span class="icon">${tile[0]}</span><span class="name">${tile[1]}</span><span class="number">${i+1}</span>`;
      button.addEventListener("click", () => choose(tile));
      box.appendChild(button);
    });
    show("game-screen");
  }

  function choose(tile){
    choices.push(tile[2]);
    $("#discarded").innerHTML = `<span>${tile[0]}</span><b>${tile[1]}</b>`;
    $("#consequence").textContent = tile[4];
    $("#comment").textContent = tile[5];
    $("#vote").textContent = `${tile[3]}%`;
    $("#vote-bar").style.width = "0";
    show("reveal-screen");
    requestAnimationFrame(() => requestAnimationFrame(() => $("#vote-bar").style.width = `${tile[3]}%`));
    $("#next").innerHTML = turn === scenes.length - 1 ? "打ち筋を見る <span>→</span>" : "次の局面へ <span>→</span>";
  }

  function finish(){
    const counts = choices.reduce((a,k) => (a[k]=(a[k]||0)+1,a),{});
    const type = Object.keys(counts).sort((a,b) => counts[b]-counts[a])[0];
    $("#round").textContent = "終局";
    $("#result-title").textContent = results[type][0];
    $("#result-copy").textContent = results[type][1];
    const labels = {self:"自分優先",duty:"先送り",people:"気づかい",fun:"楽しさ",safe:"慎重さ"};
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3);
    $("#stats").innerHTML = top.map(([k,v]) => `<div><small>${labels[k]}</small><b>${"●".repeat(v)}${"○".repeat(5-v)}</b></div>`).join("");
    show("result-screen");
  }

  $("#start").addEventListener("click", () => { turn=0; choices=[]; renderScene(); });
  $("#next").addEventListener("click", () => { if(++turn >= scenes.length) finish(); else renderScene(); });
  $("#retry").addEventListener("click", () => { turn=0; choices=[]; renderScene(); });
  $("#share").addEventListener("click", async () => {
    const text = `今日の打ち筋は「${$("#result-title").textContent}」でした。\n#日常何切る #麻雀の日`;
    if(navigator.share){ try{ await navigator.share({title:"日常何切る",text,url:location.href}); }catch(e){} }
    else { await navigator.clipboard.writeText(`${text}\n${location.href}`); $("#share").textContent="コピーしました"; }
  });
})();
