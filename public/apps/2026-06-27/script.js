const startScreen = document.getElementById("start");
const quizScreen = document.getElementById("quiz");
const resultScreen = document.getElementById("result");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");

const img0 = document.getElementById("img0");
const img1 = document.getElementById("img1");
const cards = document.querySelectorAll(".card");

const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const answerText = document.getElementById("answerText");

const originalImage = "/apps/2026-06-27/original.jpg";
const fakeImage = "/apps/2026-06-27/fake.jpg";

let correctIndex = 0;

function showScreen(screen) {
  [startScreen, quizScreen, resultScreen].forEach((el) => {
    el.classList.remove("active");
  });
  screen.classList.add("active");
}

function setupQuiz() {
  const originalIsLeft = Math.random() < 0.5;

  if (originalIsLeft) {
    img0.src = originalImage;
    img1.src = fakeImage;
    correctIndex = 0;
  } else {
    img0.src = fakeImage;
    img1.src = originalImage;
    correctIndex = 1;
  }

  showScreen(quizScreen);
}

function answer(selectedIndex) {
  const isCorrect = selectedIndex === correctIndex;
  const correctLabel = correctIndex === 0 ? "A" : "B";
  const fakeLabel = correctIndex === 0 ? "B" : "A";

  resultTitle.textContent = isCorrect ? "正解！" : "不正解！";
  resultText.textContent = `本物の松村は ${correctLabel} でした。`;

  answerText.innerHTML = `
    ${fakeLabel} は、AIで<strong>三角筋を少しだけ強くした松村</strong>です。<br><br>
    AIは、こういう細かな加工も自然にできます。<br>
    画像だけで本物かどうか判断するのは、少しずつ難しくなっています。
  `;

  showScreen(resultScreen);
}

startBtn.addEventListener("click", setupQuiz);
retryBtn.addEventListener("click", setupQuiz);

cards.forEach((card) => {
  card.addEventListener("click", () => {
    answer(Number(card.dataset.index));
  });
});
