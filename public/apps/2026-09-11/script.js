const $ = id => document.getElementById(id);
const canvas = $('canvas');
const hint = $('hint');
const resetButton = $('reset');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
for (const type of ['dblclick', 'gesturestart']) {
  document.addEventListener(type, event => event.preventDefault(), { passive: false });
}
for (const element of [canvas, resetButton]) {
  for (const type of ['contextmenu', 'dragstart']) element.addEventListener(type, event => event.preventDefault());
}
try {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');
  const results = [
    { name: '打製石器', use: '肉を切る', quality: 72, evaluation: 'まあ使える' },
    { name: '槍の穂先', use: '狩り', quality: 88, evaluation: '頼もしい' },
    { name: '石のナイフ', use: '皮をはいで加工する', quality: 64, evaluation: '悪くない' },
    { name: 'ただの石', use: '特になし', quality: 12, evaluation: 'やり直し' },
    { name: '謎のオブジェ', use: '儀式かもしれない', quality: 47, evaluation: '思想が強い' }
  ];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
  camera.position.set(0, 0.4, 6.3);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffefd5, 0x584734, 2.3));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-3, 5, 4);
  scene.add(light);
  const stone = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x918777, roughness: 1, flatShading: true }));
  scene.add(stone);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0x655139, transparent: true, opacity: 0.13, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.48;
  shadow.scale.set(1.25, 0.65, 1);
  scene.add(shadow);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const vertex = new THREE.Vector3();
  let count = 0, shake = 0, targetRotation = 0, frame = 0, previousTime = 0;
  let soundAnimation;
  function updateProgress() {
    $('count').textContent = `削り回数: ${count} / 8`;
    $('progress').value = count;
  }
  function createStone() {
    const geometry = new THREE.IcosahedronGeometry(1.12, 2);
    const positions = geometry.attributes.position;
    const offsets = new Map();
    // 共有座標には同じ変形を適用して表面の隙間を防ぐ。
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      const key = vertex.toArray().map(n => n.toFixed(5)).join(',');
      if (!offsets.has(key)) offsets.set(key, 0.9 + Math.random() * 0.2);
      const scale = offsets.get(key);
      positions.setXYZ(i, vertex.x * scale, vertex.y * scale * 1.14, vertex.z * scale * 0.87);
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    stone.geometry.dispose();
    stone.geometry = geometry;
    stone.rotation.set(0.12, 0.35, -0.1);
    stone.position.set(0, 0, 0);
    targetRotation = stone.rotation.y;
    shake = 0;
    count = 0;
    soundAnimation?.cancel();
    $('sound').textContent = '';
    $('result').hidden = true;
    hint.textContent = '石をタップして削ろう';
    canvas.setAttribute('aria-disabled', 'false');
    canvas.style.cursor = 'pointer';
    updateProgress();
    draw();
  }
  function finish() {
    const result = results[Math.floor(Math.random() * results.length)];
    $('result-name').textContent = result.name;
    $('use').textContent = result.use;
    $('quality').textContent = `${result.quality}%`;
    $('evaluation').textContent = result.evaluation;
    $('rating').textContent = `「${result.evaluation}」`;
    $('result').hidden = false;
    hint.textContent = '完成！ これで今日を生きのびよう。';
    canvas.setAttribute('aria-disabled', 'true');
    canvas.style.cursor = 'default';
  }
  function chip(localPoint) {
    if (count >= 8) return;
    const positions = stone.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      const influence = Math.max(0, 1 - vertex.distanceTo(localPoint) / 0.95);
      vertex.multiplyScalar(1 - 0.2 * influence);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    positions.needsUpdate = true;
    stone.geometry.computeVertexNormals();
    stone.geometry.computeBoundingSphere();
    count++;
    targetRotation += 0.26;
    shake = reducedMotion ? 0 : 1;
    if (reducedMotion) stone.rotation.y = targetRotation;
    updateProgress();
    hint.textContent = ['いいぞ。石っぽい。', '削れている。たぶん。', '文明の音がする。', '指は削らないように。'][(count - 1) % 4];
    $('sound').textContent = count === 8 ? 'できた！' : 'カツン！';
    soundAnimation?.cancel();
    soundAnimation = $('sound').animate([
      { opacity: 1, transform: 'translateY(0) rotate(-8deg)' },
      { opacity: 0, transform: `translateY(${reducedMotion ? 0 : -22}px) rotate(4deg)` }
    ], { duration: 550, easing: 'ease-out' });
    if (count === 8) finish();
    draw();
  }
  function strike(x, y) {
    if (count >= 8) return;
    pointer.set(x, y);
    stone.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(stone)[0];
    if (hit) chip(stone.worldToLocal(hit.point.clone()));
  }
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    strike(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) strike(0, 0);
    }
  });
  resetButton.addEventListener('click', createStone);
  function resize() {
    const rect = $('stage').getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    draw();
  }
  // 操作後の短い揺れだけ描画し、静止時は処理を止める。
  function draw() {
    renderer.render(scene, camera);
    if (!frame && !document.hidden && (shake > 0.001 || Math.abs(targetRotation - stone.rotation.y) > 0.001)) {
      previousTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }
  function animate(time) {
    frame = 0;
    const dt = Math.min((time - previousTime) / 1000, 0.05);
    stone.rotation.y += (targetRotation - stone.rotation.y) * (1 - Math.exp(-12 * dt));
    shake *= Math.exp(-11 * dt);
    stone.position.x = Math.sin(time * 0.065) * shake * 0.075;
    stone.rotation.z = -0.1 + Math.sin(time * 0.05) * shake * 0.075;
    if (shake < 0.001) {
      shake = 0;
      stone.position.x = 0;
      stone.rotation.z = -0.1;
    }
    draw();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else draw();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    count = 8;
    resetButton.disabled = true;
    canvas.setAttribute('aria-disabled', 'true');
    hint.textContent = '3D表示が停止しました。ページを再読み込みしてください。';
  });
  createStone();
  new ResizeObserver(resize).observe($('stage'));
  resize();
  resetButton.disabled = false;
} catch (error) {
  console.error(error);
  hint.textContent = '3Dを表示できませんでした。通信環境とWebGL対応を確認し、再読み込みしてください。';
  canvas.setAttribute('aria-disabled', 'true');
  resetButton.disabled = true;
}
