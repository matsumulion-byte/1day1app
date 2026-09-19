import { QUESTIONS } from '/apps/2026-09-19/data.js';
import { createRound, isCorrect, normalizeReading } from '/apps/2026-09-19/logic.js';
const $ = id => document.getElementById(id);
let round = [], index = 0, score = 0, answered = false;
let composing = false, compositionEndedAt = -Infinity, lastAdvance = -Infinity;
function show(id) {
  for (const screen of ['start', 'quiz', 'result']) $(screen).hidden = screen !== id;
  window.scrollTo(0, 0);
}
function animateQuestion() {
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $('question-area').animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180 });
  }
}
function renderQuestion() {
  answered = false;
  composing = false;
  compositionEndedAt = -Infinity;
  $('quiz').classList.remove('answered');
  $('count').textContent = `${index + 1} / 10`;
  $('bar').style.width = `${(index + 1) * 10}%`;
  $('surname').textContent = round[index].surname;
  $('answer').value = '';
  $('answer').disabled = false;
  $('answer').removeAttribute('aria-invalid');
  $('input-error').textContent = '';
  $('submit').hidden = false;
  $('submit').disabled = false;
  $('feedback').hidden = true;
  $('verdict').textContent = '';
  $('reading').textContent = '';
  $('description').textContent = '';
  $('next').textContent = index === 9 ? '結果を見る' : '次の問題';
  show('quiz');
  animateQuestion();
  // モバイルはタップでキーボードを開く。PCではすぐ入力できるようにする。
  if (matchMedia('(pointer: fine)').matches) $('answer').focus({ preventScroll: true });
  else $('surname').focus({ preventScroll: true });
}
function start() {
  round = createRound(QUESTIONS);
  index = 0; score = 0;
  renderQuestion();
}
$('begin').addEventListener('click', start);
$('retry').addEventListener('click', start);
$('answer').addEventListener('compositionstart', () => { composing = true; });
$('answer').addEventListener('compositionend', () => { composing = false; compositionEndedAt = performance.now(); });
$('answer').addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  // Safariの変換確定時はisComposingがfalseになる場合があるため229も確認する。
  if (composing || event.isComposing || event.keyCode === 229 || performance.now() - compositionEndedAt < 100) return;
  event.preventDefault();
  if (!event.repeat) $('answer-form').requestSubmit();
});
$('answer').addEventListener('input', () => {
  $('input-error').textContent = '';
  $('answer').removeAttribute('aria-invalid');
});
$('answer-form').addEventListener('submit', event => {
  event.preventDefault();
  if (answered || composing || performance.now() - compositionEndedAt < 100) return;
  if (!normalizeReading($('answer').value)) {
    $('input-error').textContent = '読み方を入力してください。';
    $('answer').setAttribute('aria-invalid', 'true');
    $('answer').focus();
    return;
  }
  answered = true;
  const question = round[index];
  const correct = isCorrect($('answer').value, question);
  if (correct) score++;
  $('answer').blur();
  $('answer').disabled = true;
  $('submit').disabled = true;
  $('submit').hidden = true;
  $('quiz').classList.add('answered');
  $('feedback').hidden = false;
  $('verdict').className = correct ? 'correct' : '';
  $('verdict').textContent = correct ? '正解！' : '不正解';
  // 別読みで正解した場合は、その読みを表示する。
  $('reading').textContent = correct ? question.readings.find(r => normalizeReading(r) === normalizeReading($('answer').value)) : question.readings[0];
  $('description').textContent = question.description;
  $('source').href = question.source;
  $('next').focus({ preventScroll: true });
});
$('next').addEventListener('click', () => {
  if (!answered || performance.now() - lastAdvance < 300) return;
  lastAdvance = performance.now();
  if (index < 9) { index++; renderQuestion(); return; }
  answered = false;
  $('score').replaceChildren(document.createTextNode('10問中 '));
  const number = document.createElement('strong');
  number.textContent = score;
  $('score').append(number, document.createTextNode('問正解'));
  show('result');
  $('result-title').focus({ preventScroll: true });
});
document.addEventListener('dblclick', event => event.preventDefault(), { passive: false });
document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
for (const button of document.querySelectorAll('button')) {
  button.addEventListener('contextmenu', event => event.preventDefault());
  button.addEventListener('dragstart', event => event.preventDefault());
}
