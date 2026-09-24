'use strict';
const $ = id => document.getElementById(id);
const species = ['ニシローランドゴリラ', 'マウンテンゴリラ', 'ヒガシローランドゴリラ', 'クロスリバーゴリラ'];
const slogans = ['穏やかな顔して、心はジャングル。', '背中で語る。バナナで黙る。', 'その存在感、森には隠せない。', 'レアな野生、見つかりました。'];
const positions = ['だいたい右奥', '無言の参謀', 'バナナ係', 'たまに仕切る', 'なんとなく中央', '見た目より温厚'];
const reasonPool = ['眉間の圧が強い', 'バナナへの潜在的信頼が高い', '胸を叩く準備ができている', '森での存在感がある', '群れの空気を読んでいそう', '視線にシルバーバックの片鱗がある', '木陰で静かに強そう', 'なんとなくドラミングがうまそう'];
const pick = items => items[Math.floor(Math.random() * items.length)];
let photoUrl = '', busy = false, resultData = null, selectionId = 0;
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
// Integer partition: every result adds up to exactly 100, with one clear winner.
function createResult() {
  const winner = Math.floor(Math.random() * 4), lead = 51 + Math.floor(Math.random() * 35);
  const remainder = 100 - lead, a = Math.floor(Math.random() * (remainder + 1)), b = Math.floor(Math.random() * (remainder - a + 1));
  const rest = shuffle([a, b, remainder - a - b]);
  const values = species.map((_, i) => i === winner ? lead : rest.pop());
  return { winner, values, degree: Math.floor(Math.random() * 101), rank: pick(['S', 'A', 'B', 'C', 'D']), power: 100 + Math.floor(Math.random() * 9900), position: pick(positions), reasons: shuffle(reasonPool).slice(0, 3) };
}
async function readPhoto(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file || busy) return;
  const token = ++selectionId;
  $('error').textContent = '';
  if (file.size > 25 * 1024 * 1024) { $('error').textContent = '25MB以下の画像を選んでください。'; return; }
  if (file.type && !file.type.startsWith('image/')) { $('error').textContent = '画像ファイルを選んでください。'; return; }
  const url = URL.createObjectURL(file), image = new Image();
  $('judge').disabled = true;
  try {
    image.src = url;
    await image.decode();
    if (token !== selectionId) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = url;
    $('preview').src = photoUrl;
    $('preview').hidden = false; $('placeholder').hidden = true; $('photoTag').hidden = false;
  } catch { if (token === selectionId) $('error').textContent = '画像を読み込めませんでした。JPEG・PNGなど別の画像をお試しください。'; }
  finally { if (url !== photoUrl) URL.revokeObjectURL(url); if (token === selectionId) $('judge').disabled = !photoUrl; }
}
function showResult(data) {
  resultData = data;
  $('resultPhoto').src = photoUrl;
  $('resultTitle').textContent = species[data.winner];
  $('catchphrase').textContent = slogans[data.winner];
  $('bars').replaceChildren();
  species.map((name, i) => ({ name, value: data.values[i] })).sort((a, b) => b.value - a.value).forEach(({ name, value }) => {
    const row = document.createElement('div'); row.className = 'bar-row';
    row.innerHTML = `<div class="bar-caption"><span>${name}</span><strong>${value}<small>%</small></strong></div><div class="bar-track"><div class="bar-fill" style="width:${value}%"></div></div>`;
    $('bars').append(row);
  });
  $('degree').innerHTML = `${data.degree}<small>%</small>`; $('rank').textContent = data.rank;
  $('power').innerHTML = `${data.power.toLocaleString()}<small>GORILLA</small>`;
  $('position').textContent = data.position;
  $('reasons').replaceChildren(...data.reasons.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  $('loading').hidden = true; $('result').hidden = false; $('saveStatus').textContent = '';
  $('resultTitle').tabIndex = -1; $('resultTitle').focus({ preventScroll: true });
}
async function diagnose() {
  if (!photoUrl || busy) return;
  busy = true; $('inputPanel').hidden = true; $('result').hidden = true; $('loading').hidden = false;
  $('loadingText').textContent = '胸板を解析中…';
  const messages = ['ドラミング適性を測定中…', 'バナナ親和性を確認中…'];
  window.scrollTo({ top: 0, behavior: 'instant' });
  for (const message of messages) { await new Promise(resolve => setTimeout(resolve, 700)); $('loadingText').textContent = message; }
  await new Promise(resolve => setTimeout(resolve, 700));
  showResult(createResult()); busy = false;
}
// A self-contained, high-resolution share card. The selected photo never leaves this browser.
async function saveCard() {
  if (!resultData) return;
  const data = resultData, canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#132d25'; ctx.fillRect(0, 0, 900, 1200);
  ctx.fillStyle = '#f5f4e9'; ctx.beginPath(); ctx.roundRect(35, 35, 830, 1130, 28); ctx.fill();
  const text = (value, x, y, size = 25, color = '#18382c', weight = 600) => { ctx.fillStyle = color; ctx.font = `${weight} ${size}px sans-serif`; ctx.fillText(value, x, y); };
  text('GORILLA LAB. / 非科学研究所', 75, 90, 21); text('ゴリラ判定', 75, 155, 45);
  const photo = $('preview'), s = Math.min(photo.naturalWidth, photo.naturalHeight);
  ctx.save(); ctx.beginPath(); ctx.roundRect(680, 85, 135, 150, 12); ctx.clip(); ctx.drawImage(photo, (photo.naturalWidth - s) / 2, (photo.naturalHeight - s) / 2, s, s, 680, 85, 135, 150); ctx.restore();
  text('あなたにひそむ野生は…', 75, 213, 22); text(species[data.winner], 75, 278, 43); text(slogans[data.winner], 75, 326, 24);
  species.map((name, i) => ({name, value:data.values[i]})).sort((a,b) => b.value-a.value).forEach((item, i) => {
    const y = 395 + i * 82; text(item.name, 75, y, 24); text(`${item.value}%`, 735, y, 28);
    ctx.fillStyle = '#dfe5d4'; ctx.fillRect(75, y + 16, 740, 10); ctx.fillStyle = '#527443'; ctx.fillRect(75, y + 16, 740 * item.value / 100, 10);
  });
  text('ゴリラ度', 75, 730, 21); text(`${data.degree}%`, 75, 785, 43);
  text('シルバーバック適性', 465, 730, 21); text(data.rank, 465, 785, 43);
  text('ドラミング力', 75, 838, 21); text(`${data.power.toLocaleString()} GORILLA`, 75, 883, 30);
  text('群れでの立場', 465, 838, 21); text(data.position, 465, 883, 30);
  text('研究員の判定メモ', 75, 950, 22); data.reasons.forEach((reason, i) => text(`↳ ${reason}`, 75, 990 + i * 34, 22));
  text('※この判定はジョークです。学術的根拠はありません。', 75, 1125, 19, '#64745c', 400);
  canvas.toBlob(blob => {
    if (!blob) { $('saveStatus').textContent = '保存に失敗しました。スクリーンショットも使えます。'; return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'gorilla-report.png'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    $('saveStatus').textContent = '結果カードをPNGで書き出しました。SNSに添付してどうぞ。';
  }, 'image/png');
}
$('cameraButton').onclick = () => $('camera').click(); $('uploadButton').onclick = () => $('upload').click();
$('camera').onchange = readPhoto; $('upload').onchange = readPhoto;
$('judge').onclick = diagnose; $('retry').onclick = diagnose; $('save').onclick = saveCard;
$('change').onclick = () => { $('result').hidden = true; $('inputPanel').hidden = false; $('uploadButton').focus(); };
document.addEventListener('dblclick', event => event.preventDefault(), { passive: false });
document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
document.querySelectorAll('button').forEach(button => button.addEventListener('contextmenu', event => event.preventDefault()));
