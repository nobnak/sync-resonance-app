/**
 * SynchroEcho Application Controller
 * Glues UI, Simulation, Audio Engine, and Renderer
 */

(function () {
  'use strict';

  // DOM要素の参照
  const canvas = document.getElementById('canvas');
  const startOverlay = document.getElementById('start-overlay');
  const btnStart = document.getElementById('btn-start');
  const hud = document.getElementById('hud');

  const modeIcon = document.getElementById('mode-icon');
  const modeTitle = document.getElementById('mode-title');
  const modeDesc = document.getElementById('mode-desc');

  const orderValue = document.getElementById('order-value');
  const orderMeterFill = document.getElementById('order-meter-fill');

  const sliderK = document.getElementById('slider-k');
  const valK = document.getElementById('val-k');
  const sliderN = document.getElementById('slider-n');
  const valN = document.getElementById('val-n');
  const sliderSpeed = document.getElementById('slider-speed');
  const valSpeed = document.getElementById('val-speed');

  const btnPerturb = document.getElementById('btn-perturb');
  const btnMute = document.getElementById('btn-mute');
  const btnInfo = document.getElementById('btn-info');
  const btnToggleHud = document.getElementById('btn-toggle-hud');
  const infoDrawer = document.getElementById('info-drawer');
  const btnCloseInfo = document.getElementById('btn-close-info');

  const presetButtons = document.querySelectorAll('.preset-btn');

  // インスタンス
  const audio = new window.AudioEngine();
  const sim = new window.SimulationEngine(canvas);
  const renderer = new window.Renderer(canvas, sim);

  // パルス発生時の音響コールバック
  sim.onPulseCallback = (agent, intensity) => {
    audio.triggerPulse(agent, intensity);
  };

  // プリセット定義
  const PRESETS = {
    'firefly': {
      k: 0.85,
      n: 12,
      speed: 1.0,
      title: 'ホタルの同期',
      icon: '✨',
      desc: '引力結合 (K > 0)：カオスから壮大な斉唱コードへの収斂'
    },
    'frog-duet': {
      k: -1.2,
      n: 2,
      speed: 1.1,
      title: 'カエルの掛け合い (2匹)',
      icon: '🐸',
      desc: '完全逆相 (位相差 180°)：衝突を避けた交代発声 (A-B-A-B)'
    },
    'frog-poly': {
      k: -1.05,
      n: 4,
      speed: 1.25,
      title: 'カエルの輪唱 (4匹)',
      icon: '🐸',
      desc: '四位相分散：ガムラン調のインターロッキング・ポリリズム'
    },
    'reich': {
      k: 0.12,
      n: 3,
      speed: 1.4,
      title: 'スティーヴ・ライヒ（フェージング）',
      icon: '⏱️',
      desc: '極小結合 (K ≒ 0.1)：微細な速度差によるミニマル音楽的フェーズシフト'
    },
    'chaos': {
      k: 0.0,
      n: 16,
      speed: 1.0,
      title: '完全カオス (非結合)',
      icon: '🌀',
      desc: '結合なし (K = 0)：それぞれが独立して鳴り続ける無秩序なアンビエント'
    }
  };

  function applyPreset(presetKey) {
    const p = PRESETS[presetKey];
    if (!p) return;

    // UI値の更新
    sliderK.value = p.k;
    valK.textContent = (p.k >= 0 ? '+' : '') + p.k.toFixed(2);
    sliderN.value = p.n;
    valN.textContent = p.n;
    sliderSpeed.value = p.speed;
    valSpeed.textContent = p.speed.toFixed(1) + 'x';

    modeTitle.textContent = p.title;
    modeIcon.textContent = p.icon;
    modeDesc.textContent = p.desc;

    // エンジンへの反映
    sim.setCoupling(p.k);
    sim.setAgentCount(p.n);
    sim.setSpeed(p.speed);

    // ボタンのアクティブ状態
    presetButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });
  }

  function updateModeLabelFromK(k) {
    if (k > 0.25) {
      modeTitle.textContent = 'ホタルの同期';
      modeIcon.textContent = '✨';
      modeDesc.textContent = `引力結合 (K = ${k > 0 ? '+' : ''}${k.toFixed(2)})：斉唱への引き込み`;
    } else if (k < -0.25) {
      modeTitle.textContent = 'カエルの反同期';
      modeIcon.textContent = '🐸';
      modeDesc.textContent = `斥力結合 (K = ${k.toFixed(2)})：排他ポリリズムの形成`;
    } else {
      modeTitle.textContent = '遷移 / カオス領域';
      modeIcon.textContent = '🌀';
      modeDesc.textContent = `微弱結合 (K = ${k >= 0 ? '+' : ''}${k.toFixed(2)})：アンビエントな揺らぎ`;
    }
  }

  // リサイズ処理
  function handleResize() {
    renderer.resize();
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // 開始ボタン（オーディオロック解除）
  btnStart.addEventListener('click', async () => {
    await audio.resume();
    startOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    // 初期プリセットの適用
    applyPreset('firefly');
  });

  // プリセットボタンのイベント
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyPreset(btn.dataset.preset);
    });
  });

  // スライダー群のイベント
  sliderK.addEventListener('input', (e) => {
    const k = parseFloat(e.target.value);
    valK.textContent = (k >= 0 ? '+' : '') + k.toFixed(2);
    sim.setCoupling(k);
    updateModeLabelFromK(k);
    // プリセットのアクティブを外す
    presetButtons.forEach(b => b.classList.remove('active'));
  });

  sliderN.addEventListener('input', (e) => {
    const n = parseInt(e.target.value, 10);
    valN.textContent = n;
    sim.setAgentCount(n);
    presetButtons.forEach(b => b.classList.remove('active'));
  });

  sliderSpeed.addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value);
    valSpeed.textContent = speed.toFixed(1) + 'x';
    sim.setSpeed(speed);
  });

  // 外乱ボタン
  btnPerturb.addEventListener('click', () => {
    sim.perturbAll();
  });

  // ミュートボタン
  let isMuted = false;
  btnMute.addEventListener('click', () => {
    isMuted = !isMuted;
    audio.setMute(isMuted);
    btnMute.textContent = isMuted ? '🔇 ミュート中' : '🔊 音声 ON';
    btnMute.style.borderColor = isMuted ? '#ef4444' : 'rgba(255,255,255,0.1)';
  });

  // 解説ドロワーのトグル
  btnInfo.addEventListener('click', () => {
    infoDrawer.classList.toggle('hidden');
  });
  btnCloseInfo.addEventListener('click', () => {
    infoDrawer.classList.add('hidden');
  });

  // HUD最小化・展開トグル
  let isHudCollapsed = false;
  if (btnToggleHud) {
    btnToggleHud.addEventListener('click', () => {
      isHudCollapsed = !isHudCollapsed;
      hud.classList.toggle('collapsed', isHudCollapsed);
      btnToggleHud.textContent = isHudCollapsed ? '🔽' : '🔼';
      sim.setHudCollapsed(isHudCollapsed);
    });
  }

  // マウス・タッチ操作（キャンバスのインタラクション：ノード刺激または水面波紋）
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function handlePointer(e) {
    const pos = getCanvasPos(e);
    // 格子ノードをクリックした場合はノードを直接励起、余白は波紋ショックウェーブ
    const hit = sim.findAgentAt(pos.x, pos.y, 28);
    if (hit) {
      sim.perturbAgent(hit);
    } else {
      sim.perturbAt(pos.x, pos.y);
    }
    if (e.cancelable && e.type === 'touchstart') {
      e.preventDefault();
    }
  }

  canvas.addEventListener('mousedown', handlePointer);
  canvas.addEventListener('touchstart', handlePointer, { passive: false });

  // メインループ
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // シミュレーション更新
    sim.update(dt);

    // 描画
    renderer.render();

    // 秩序度メーターの更新
    const order = sim.orderParameter;
    orderValue.textContent = order.toFixed(2);
    orderMeterFill.style.width = `${(order * 100).toFixed(1)}%`;

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
