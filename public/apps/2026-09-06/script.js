(() => {
  'use strict';

  const questions = [
    { level: 'EASY', colors: ['#000000', '#181818', '#101010', '#202020', '#121212'] },
    { level: 'NORMAL', colors: ['#000000', '#0C0C0C', '#080808', '#101010', '#060606'] },
    { level: 'HARD', colors: ['#000000', '#040404', '#060606', '#030303', '#050505'] },
    { level: 'VERY HARD', colors: ['#000000', '#010101', '#020202', '#030303', '#020102'] },
    { level: 'TRUE BLACK', colors: ['#000000', '#010000', '#000100', '#000001', '#010101'] }
  ];
  const titles = [
    '黒ならなんでもいい人。',
    '黒を知らない。',
    'まだ黒が浅い。',
    '黒を見る目はある。',
    'ほぼ、本物を知っている。',
    'あなたは、本物の黒を知っている。'
  ];
  const $ = id => document.getElementById(id);
  const screens = ['introScreen', 'questionScreen', 'revealScreen', 'resultScreen'];
  let current = 0;
  let correct = 0;
  let acceptingAnswer = false;

  function show(id) {
    screens.forEach(screen => $(screen).classList.toggle('active', screen === id));
  }

  function shuffle(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function renderQuestion() {
    const question = questions[current];
    $('questionCount').textContent = `Q ${current + 1} / ${questions.length}`;
    $('difficulty').textContent = question.level;
    $('panelField').innerHTML = '';
    shuffle(question.colors).forEach((color, index) => {
      const panel = document.createElement('button');
      panel.type = 'button';
      panel.className = 'black-panel';
      panel.style.backgroundColor = color;
      panel.style.animationDelay = `${index * 65}ms`;
      panel.dataset.color = color;
      panel.setAttribute('aria-label', `黒の候補 ${index + 1}`);
      panel.addEventListener('click', choosePanel, { once: true });
      $('panelField').appendChild(panel);
    });
    acceptingAnswer = true;
    show('questionScreen');
  }

  function choosePanel(event) {
    if (!acceptingAnswer) return;
    acceptingAnswer = false;
    const color = event.currentTarget.dataset.color.toUpperCase();
    const isCorrect = color === '#000000';
    if (isCorrect) correct += 1;
    $('selectedPanel').style.backgroundColor = color;
    $('selectedCode').textContent = color;
    $('truthNote').hidden = isCorrect;
    $('revealKicker').textContent = isCorrect ? 'TRUE BLACK IDENTIFIED' : 'YOUR SELECTION';
    $('revealPrelude').textContent = isCorrect ? '' : 'あなたが選んだのは';
    $('revealMessage').textContent = isCorrect ? 'これが、本物の黒。' : 'それは、黒ではない。';
    show('revealScreen');
  }

  function showResult() {
    $('score').innerHTML = `${correct} <span>/ 5</span>`;
    $('resultTitle').textContent = titles[correct];
    show('resultScreen');
  }

  function startGame() {
    current = 0;
    correct = 0;
    renderQuestion();
  }

  $('startButton').addEventListener('click', startGame);
  $('replayButton').addEventListener('click', startGame);
  $('nextButton').addEventListener('click', () => {
    current += 1;
    if (current >= questions.length) showResult();
    else renderQuestion();
  });

  document.addEventListener('dblclick', event => event.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', event => {
    if (event.target.closest('button,.experience')) event.preventDefault();
  });
  document.addEventListener('dragstart', event => event.preventDefault());
})();
