import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from './data.js';
import { createRound, isCorrect, normalizeReading } from './logic.js';

test('31 unique entries, with readings and source URLs', () => {
  assert.ok(QUESTIONS.length >= 31);
  assert.equal(new Set(QUESTIONS.map(q => q.surname)).size, QUESTIONS.length);
  for (const q of QUESTIONS) {
    assert.ok(q.description && q.source.startsWith('https://'));
    assert.ok(q.readings.length > 0);
    for (const reading of q.readings) assert.ok(isCorrect(reading, q));
  }
});
test('10 distinct questions, exactly one 松村, all positions reachable', () => {
  let seed = 919;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const positions = new Set();
  const before = JSON.stringify(QUESTIONS);
  for (let i = 0; i < 10000; i++) {
    const round = createRound(QUESTIONS, random);
    assert.equal(round.length, 10);
    assert.equal(new Set(round.map(q => q.surname)).size, 10);
    assert.equal(round.filter(q => q.surname === '松村').length, 1);
    positions.add(round.findIndex(q => q.surname === '松村'));
  }
  assert.equal(positions.size, 10);
  assert.equal(JSON.stringify(QUESTIONS), before);
});
test('kana width, composed dakuten and whitespace; no overly broad matching', () => {
  assert.equal(normalizeReading('　ﾀ ｶ ナ\tシ　'), 'たかなし');
  assert.equal(normalizeReading('ｶﾞカ\u3099'), 'がが');
  const q = QUESTIONS.find(q => q.surname === '東海林');
  assert.ok(isCorrect('　トウカイリン ', q));
  assert.ok(isCorrect('ショウジ', q));
  assert.equal(isCorrect('', q), false);
  assert.equal(isCorrect('　 ', q), false);
  assert.equal(isCorrect('しょう', q), false);
});
