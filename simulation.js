/**
 * SynchroEcho Simulation Engine
 * Non-linear Coupled Oscillator Network (Kuramoto Model with Spatial Metric & Coupling Inversion)
 */

class SimulationEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.agents = [];
    this.ripples = []; // 視覚および外乱用の波紋

    // パラメータ
    this.k = 0.8;             // 結合強度 (-1.5: 強い斥力 〜 +1.5: 強い引力)
    this.agentCount = 12;     // 個体数 (2〜32)
    this.baseSpeed = 1.0;     // テンポ速度
    this.baseOmega = 2.4;     // 基本角速度 (rad/s, 約0.38Hz 〜 2.6秒周期)
    this.spatialRadius = 0.45;// 相互作用の空間的有効半径 (正規化幅基準)

    // コールバック
    this.onPulseCallback = null;

    // 秩序度 (Kuramoto Order Parameter: 0.0〜1.0)
    this.orderParameter = 0.0;
    this.meanPhase = 0.0;

    // ドラッグ操作中のエージェント
    this.draggedAgent = null;

    this.initAgents();
  }

  initAgents() {
    this.agents = [];
    const width = this.canvas.width || 800;
    const height = this.canvas.height || 600;

    for (let i = 0; i < this.agentCount; i++) {
      // 初期位相はランダムに均一分散
      const phase = Math.random() * Math.PI * 2;
      
      // 固有角速度にわずかな個体差（自然なゆらぎ ±4%）を付与
      const freqVariance = (Math.random() - 0.5) * 0.08;
      const omega = this.baseOmega * (1.0 + freqVariance);

      // 初期配置（画面内に均等〜ややランダムに分散）
      const padding = 80;
      const x = padding + Math.random() * (width - padding * 2);
      const y = padding + Math.random() * (height - padding * 2);

      this.agents.push({
        id: i,
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        phase: phase,
        omega: omega,
        flashTimer: 0.0,
        pitchIndex: i,
        pan: (x / width) * 2 - 1,
        // typeWeight: 0.0(カエル) 〜 1.0(ホタル)
        typeWeight: this.k >= 0 ? Math.min(1.0, 0.5 + this.k * 0.5) : Math.max(0.0, 0.5 + this.k * 0.5)
      });
    }
  }

  setAgentCount(count) {
    if (this.agentCount === count) return;
    this.agentCount = count;
    this.initAgents();
  }

  setCoupling(k) {
    this.k = k;
    // typeWeight を更新
    const type = k >= 0 ? Math.min(1.0, 0.5 + k * 0.5) : Math.max(0.0, 0.5 + k * 0.5);
    this.agents.forEach(a => a.typeWeight = type);
  }

  setSpeed(speed) {
    this.baseSpeed = speed;
  }

  /**
   * 物理・位相ステップの更新 (dt: 秒)
   */
  update(dt) {
    const width = this.canvas.width || 800;
    const height = this.canvas.height || 600;
    const n = this.agents.length;
    if (n === 0) return;

    // typeWeightの動的追従
    const targetType = this.k >= 0 ? Math.min(1.0, 0.5 + this.k * 0.5) : Math.max(0.0, 0.5 + this.k * 0.5);

    // 1. 各エージェントに対する結合相互作用の計算
    // dθ_i/dt = ω_i + (K / N) * Σ_j W(d_ij) * sin(θ_j - θ_i)
    const dPhases = new Float32Array(n);
    const diag = Math.hypot(width, height);
    const rThreshold = this.spatialRadius * diag;

    for (let i = 0; i < n; i++) {
      const a1 = this.agents[i];
      let couplingSum = 0;
      let weightSum = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a2 = this.agents[j];
        const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);

        // 距離による減衰関数: 1 / (1 + (d / R)^2)
        const normalizedDist = dist / (rThreshold * 0.5);
        const spatialWeight = 1.0 / (1.0 + normalizedDist * normalizedDist);

        // 蔵本相互作用（引力: K>0 で位相差を0へ, 斥力: K<0 で位相差を離す）
        couplingSum += spatialWeight * Math.sin(a2.phase - a1.phase);
        weightSum += spatialWeight;
      }

      // 重み正規化（近傍の密度差による暴走防止）
      const effCoupling = weightSum > 0 ? (couplingSum / weightSum) : 0;
      dPhases[i] = a1.omega * this.baseSpeed + this.k * 1.5 * effCoupling;
    }

    // 2. 位相の前進とパルストリガー判定
    for (let i = 0; i < n; i++) {
      const a = this.agents[i];
      const prevPhase = a.phase;
      a.phase += dPhases[i] * dt;
      a.typeWeight += (targetType - a.typeWeight) * 0.08; // スムーズな遷移

      // 周期 2π の境界跨ぎを検出（発音・発光トリガー）
      if (a.phase >= Math.PI * 2) {
        a.phase = a.phase % (Math.PI * 2);
        a.flashTimer = 1.0;

        // 音響トリガーコールバック
        if (this.onPulseCallback) {
          this.onPulseCallback(a, 1.0);
        }

        // 視覚用リップルの発生（カエル斥力時は大きく、ホタル時は光輪）
        this.ripples.push({
          x: a.x,
          y: a.y,
          radius: 4,
          maxRadius: this.k < 0 ? 120 : 70,
          opacity: 0.9,
          type: a.typeWeight
        });
      }

      // 発光タイマーの減衰
      if (a.flashTimer > 0) {
        a.flashTimer = Math.max(0, a.flashTimer - dt * (a.typeWeight > 0.5 ? 1.5 : 4.0));
      }

      // 位置の微小ドリフト（ホタルは浮遊、カエルは水面でほぼ静止）
      if (a !== this.draggedAgent) {
        const driftScale = a.typeWeight * 0.8 + 0.1;
        a.x += a.vx * driftScale;
        a.y += a.vy * driftScale;

        // 画面端での跳ね返り
        const pad = 40;
        if (a.x < pad) { a.x = pad; a.vx = Math.abs(a.vx); }
        if (a.x > width - pad) { a.x = width - pad; a.vx = -Math.abs(a.vx); }
        if (a.y < pad) { a.y = pad; a.vy = Math.abs(a.vy); }
        if (a.y > height - pad) { a.y = height - pad; a.vy = -Math.abs(a.vy); }

        // パンニング値の更新
        a.pan = (a.x / width) * 2 - 1;
      }
    }

    // 3. 蔵本秩序度 (Order Parameter) の計算
    // r * e^(i*psi) = (1/N) * Σ e^(i*θ_j)
    let sumCos = 0;
    let sumSin = 0;
    for (let i = 0; i < n; i++) {
      sumCos += Math.cos(this.agents[i].phase);
      sumSin += Math.sin(this.agents[i].phase);
    }
    this.orderParameter = Math.hypot(sumCos / n, sumSin / n);
    this.meanPhase = Math.atan2(sumSin / n, sumCos / n);

    // 4. リップルの更新
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += dt * 90;
      r.opacity -= dt * 1.1;
      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  /**
   * 外乱（摂動）の注入
   * @param {number} x - クリック位置 X
   * @param {number} y - クリック位置 Y
   */
  perturbAt(x, y) {
    const shockRadius = 240;
    this.agents.forEach(a => {
      const dist = Math.hypot(a.x - x, a.y - y);
      if (dist < shockRadius) {
        const power = (1.0 - dist / shockRadius);
        // 位相を大きくランダムにシフト（同期の崩壊）
        a.phase = (a.phase + (Math.random() - 0.5) * Math.PI * 2 * power + Math.PI * 2) % (Math.PI * 2);
        // 位置もわずかに揺らす
        a.vx += (Math.random() - 0.5) * 2.0 * power;
        a.vy += (Math.random() - 0.5) * 2.0 * power;
      }
    });

    // 画面に大きな波紋を追加
    this.ripples.push({
      x: x,
      y: y,
      radius: 5,
      maxRadius: shockRadius,
      opacity: 1.0,
      type: 0.5,
      isShockwave: true
    });
  }

  /**
   * 全体外乱（突風・捕食者の接近など）
   */
  perturbAll() {
    this.agents.forEach(a => {
      a.phase = Math.random() * Math.PI * 2;
      a.vx = (Math.random() - 0.5) * 3;
      a.vy = (Math.random() - 0.5) * 3;
    });

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ripples.push({
      x: w / 2,
      y: h / 2,
      radius: 10,
      maxRadius: Math.hypot(w, h) / 2,
      opacity: 1.0,
      type: 0.5,
      isShockwave: true
    });
  }

  /**
   * マウス・タッチ操作によるドラッグ開始
   */
  findAgentAt(x, y, radius = 30) {
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (Math.hypot(a.x - x, a.y - y) <= radius) {
        return a;
      }
    }
    return null;
  }
}

window.SimulationEngine = SimulationEngine;
