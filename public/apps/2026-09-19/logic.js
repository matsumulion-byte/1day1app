export function normalizeReading(value) {
  return value.normalize('NFKC').replace(/[\s\u200B-\u200D\uFEFF]/gu, '')
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/ヷ/g, 'わ゙').replace(/ヸ/g, 'ゐ゙').replace(/ヹ/g, 'ゑ゙').replace(/ヺ/g, 'を゙').normalize('NFC');
}
export function isCorrect(value, question) {
  const answer = normalizeReading(value);
  return answer.length > 0 && question.readings.some(reading => normalizeReading(reading) === answer);
}
export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function createRound(questions, random = Math.random) {
  const unique = [...new Map(questions.map(q => [q.surname, q])).values()];
  const fixed = unique.find(q => q.surname === '松村');
  const pool = unique.filter(q => q.surname !== '松村');
  if (!fixed || pool.length < 9) throw new Error('10問分の問題データが必要です。');
  return shuffle([...shuffle(pool, random).slice(0, 9), fixed], random);
}
