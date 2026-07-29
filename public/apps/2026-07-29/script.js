(() => {
  const $ = (id) => document.getElementById(id);
  const state = { questions: [], index: 0, score: 0, results: [], answered: false };
  const positions = { 投: "投手", 捕: "捕手", 一: "一塁", 二: "二塁", 三: "三塁", 遊: "遊撃", 左: "左翼", 中: "中堅", 右: "右翼", 指: "指名" };

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function show(screen) {
    ["startScreen", "quizScreen", "resultScreen"].forEach((id) => $(id).classList.toggle("hidden", id !== screen));
  }

  function choicesFor(answer) {
    const close = DATA.map((q) => q.year).filter((year, index, all) => year !== answer && all.indexOf(year) === index)
      .sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer));
    return shuffle([answer, ...shuffle(close.slice(0, 8)).slice(0, 3)]);
  }

  function renderQuestion() {
    const question = state.questions[state.index];
    state.answered = false;
    $("questionCount").textContent = `${String(state.index + 1).padStart(2, "0")} / 10`;
    $("scoreCount").textContent = state.score;
    $("bigQuestion").textContent = String(state.index + 1).padStart(2, "0");
    $("reveal").classList.add("hidden");
    $("lineup").innerHTML = question.lineup.map((player, index) =>
      `<li style="animation-delay:${index * 28}ms"><span class="position" title="${positions[player.position] || player.position}">${player.position}</span><span class="player">${player.name}</span></li>`
    ).join("");
    $("choices").innerHTML = choicesFor(question.year).map((year) =>
      `<button class="choice" type="button" data-year="${year}">${year}</button>`
    ).join("");
    document.querySelectorAll(".choice").forEach((button) => button.addEventListener("click", answer));
  }

  function answer(event) {
    if (state.answered) return;
    state.answered = true;
    const question = state.questions[state.index];
    const selected = Number(event.currentTarget.dataset.year);
    const correct = selected === question.year;
    if (correct) state.score += 1;
    state.results.push(correct);
    document.querySelectorAll(".choice").forEach((button) => {
      button.disabled = true;
      const year = Number(button.dataset.year);
      if (year === question.year) button.classList.add("correct");
      else if (button === event.currentTarget) button.classList.add("wrong");
    });
    $("scoreCount").textContent = state.score;
    $("verdict").textContent = correct ? `正解！ ${question.year}` : `惜しい！ 正解は ${question.year}`;
    $("verdict").className = `verdict ${correct ? "correct" : "wrong"}`;
    $("gameInfo").textContent = `${question.year}年${question.date}　vs ${question.opponent}　${question.stadium}`;
    $("sourceLink").href = question.source;
    $("nextButton").innerHTML = state.index === 9 ? "試合結果を見る <span>→</span>" : "次の打順へ <span>→</span>";
    $("reveal").classList.remove("hidden");
    if (window.innerWidth < 761) $("reveal").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function next() {
    if (!state.answered) return;
    if (state.index < 9) {
      state.index += 1;
      renderQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      showResult();
    }
  }

  function showResult() {
    show("resultScreen");
    $("questionCount").textContent = "10 / 10";
    $("finalScore").textContent = state.score;
    const messages = state.score === 10
      ? ["完全試合。", "猛虎史、完全制覇。"]
      : state.score >= 8
        ? ["猛虎博士！", "時代を超えて打順が見えています。"]
        : state.score >= 5
          ? ["勝ち越し！", "記憶に残る助っ人が、年代判定の鍵です。"]
          : ["再調整や！", "もう一度、歴代打線に挑みましょう。"];
    $("resultTitle").textContent = messages[0];
    $("resultMessage").textContent = messages[1];
    $("resultTicks").innerHTML = state.results.map((ok, i) => `<span class="${ok ? "ok" : "ng"}" title="第${i + 1}問 ${ok ? "正解" : "不正解"}"></span>`).join("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function start() {
    state.questions = shuffle(DATA).slice(0, 10);
    state.index = 0;
    state.score = 0;
    state.results = [];
    $("scoreCount").textContent = "0";
    show("quizScreen");
    renderQuestion();
    window.scrollTo({ top: 0 });
  }

  $("startButton").addEventListener("click", start);
  $("retryButton").addEventListener("click", start);
  $("nextButton").addEventListener("click", next);

  fetch("/apps/2026-07-29/questions.json")
    .then((response) => {
      if (!response.ok) throw new Error("question data unavailable");
      return response.json();
    })
    .then((data) => { DATA.push(...data); $("startButton").disabled = false; })
    .catch(() => {
      $("startButton").textContent = "データを読み込めませんでした";
    });

  const DATA = [];
  $("startButton").disabled = true;
})();
