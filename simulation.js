/**
 * SynchroEcho Simulation Engine
 * Non-linear Coupled Oscillator Network (Kuramoto Model on Spatial Lattice/Grid)
 */

class SimulationEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.agents = [];
    this.ripples = []; // 視覚および外乱用の波紋

    // パラメータ
    this.k = 0.8;             // 結合強度 (-1.5: 強い斥力 〜 +1.5: 強い引力)
    this.agentCount = 36;     // 個体数 (2〜256)
    this.baseSpeed = 1.0;     // テンポ速度
    this.baseOmega = 2.4;     // 基本角速度 (rad/s, 約0.38Hz 〜 2.6秒周期)
    this.spatialRadius = 0.45;// 相互作用の空間的有効半径
    this.freqSpread = 0.08;   // 固有角速度のばらつき幅 (0.0:均一 〜 0.30:強い個性)
    this.noiseLevel = 0.04;   // 毎フレームの生体ランダムゆらぎ (0.0:静的 〜 0.20:激しい混沌)

    // 格子情報
    this.gridCols = 6;
    this.gridRows = 6;
    this.cellSpacing = 60;

    // コールバック
    this.onPulseCallback = null;

    // 秩序度 (Kuramoto Order Parameter: 0.0〜1.0)
    this.orderParameter = 0.0;
    this.meanPhase = 0.0;

    // 音声同時発火制限（大量個体時のオーディオ過負荷防止）
    this.framePulseCount = 0;
    this.maxPulsesPerFrame = 16;

    // 論理画面サイズ (CSSピクセル単位)
    const rect = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    this.width = (rect && rect.width > 0) ? rect.width : (window.innerWidth || 800);
    this.height = (rect && rect.height > 0) ? rect.height : (window.innerHeight || 600);

    this.initAgents();
  }

  /**
   * レンダラー側から論理サイズ（CSSピクセル）をセット
   */
  setSize(w, h) {
    if (!w || !h || (w === this.width && h === this.height)) return;
    this.width = w;
    this.height = h;
    this.updateAgentPositions();
  }

  /**
   * 個体数 N と画面アスペクト比に応じた最適な完全格子因数分解 (Cols x Rows == N) を算出
   */
  calculateGridLayout() {
    const w = this.width;
    const h = this.height;
    const n = this.agentCount;
    const aspect = Math.max(0.2, w / h);

    // 1. n の因数分解 (c * r == n) で、c/r が画面比率に最も近いペアを探索
    let bestCols = 1;
    let bestRows = n;
    let bestScore = Infinity;

    for (let c = 1; c <= n; c++) {
      if (n % c === 0) {
        const r = n / c;
        const currentAspect = c / r;
        const score = Math.abs(Math.log(currentAspect) - Math.log(aspect));
        if (score < bestScore) {
          bestScore = score;
          bestCols = c;
          bestRows = r;
        }
      }
    }
    return { cols: bestCols, rows: bestRows };
  }

  /**
   * 格子座標の計算と固定配置（完全中央配置・正方セル・厳密格子）
   */
  updateAgentPositions() {
    const w = this.width;
    const h = this.height;
    const n = this.agents.length;
    if (n === 0) return;

    const { cols, rows } = this.calculateGridLayout();
    this.gridCols = cols;
    this.gridRows = rows;

    // 周囲マージン（画面端に寄りすぎないよう確保）
    const isNarrow = w < 600;
    const marginX = isNarrow ? 24 : Math.max(36, w * 0.06);
    const marginY = isNarrow ? 40 : Math.max(36, h * 0.06);

    const maxW = Math.max(60, w - marginX * 2);
    const maxH = Math.max(60, h - marginY * 2);

    // X方向・Y方向の等間隔ピッチを算出し、正方形セルにするため小さい方を採用
    const cellSpacingX = cols > 1 ? maxW / (cols - 1) : maxW;
    const cellSpacingY = rows > 1 ? maxH / (rows - 1) : maxH;
    const spacing = Math.min(cellSpacingX, cellSpacingY, 130);
    this.cellSpacing = spacing;

    // 格子全体の幅と高さ
    const gridW = (cols - 1) * spacing;
    const gridH = (rows - 1) * spacing;

    // 画面中心 (w/2, h/2) に完全に一致する開始座標 (startX, startY)
    const startX = (w - gridW) * 0.5;
    const startY = (h - gridH) * 0.5;

    for (let i = 0; i < n; i++) {
      const a = this.agents[i];
      const r = Math.floor(i / cols);
      const c = i % cols;

      a.row = r;
      a.col = c;
      // 厳密に列 c・行 r の格子座標へ配置（行ごとのオフセットは入れない）
      a.x = cols > 1 ? startX + c * spacing : w * 0.5;
      a.y = rows > 1 ? startY + r * spacing : h * 0.5;
      a.pan = (a.x / w) * 2 - 1; // 空間定位（[-1, +1] のステレオステージング）
    }
  }

  initAgents() {
    this.agents = [];
    for (let i = 0; i < this.agentCount; i++) {
      const phase = Math.random() * Math.PI * 2;
      // 各個体の不変の個性正規値 [-1.0, +1.0]
      const freqNorm = (Math.random() - 0.5) * 2.0;
      const omega = this.baseOmega * (1.0 + freqNorm * this.freqSpread);

      this.agents.push({
        id: i,
        x: 0,
        y: 0,
        row: 0,
        col: 0,
        phase: phase,
        freqNorm: freqNorm,
        omega: omega,
        flashTimer: 0.0,
        pitchIndex: i,
        pan: 0,
        typeWeight: this.k >= 0 ? Math.min(1.0, 0.5 + this.k * 0.5) : Math.max(0.0, 0.5 + this.k * 0.5)
      });
    }
    this.updateAgentPositions();
  }

  setAgentCount(count) {
    if (this.agentCount === count) return;
    this.agentCount = count;
    this.initAgents();
  }

  setCoupling(k) {
    this.k = k;
    const type = k >= 0 ? Math.min(1.0, 0.5 + k * 0.5) : Math.max(0.0, 0.5 + k * 0.5);
    this.agents.forEach(a => a.typeWeight = type);
  }

  setSpeed(speed) {
    this.baseSpeed = speed;
  }

  setFreqSpread(spread) {
    this.freqSpread = Math.max(0.0, Math.min(0.5, spread));
    this.agents.forEach(a => {
      a.omega = this.baseOmega * (1.0 + a.freqNorm * this.freqSpread);
    });
  }

  setNoiseLevel(noise) {
    this.noiseLevel = Math.max(0.0, Math.min(0.5, noise));
  }

  /**
   * 物理・位相ステップの更新 (dt: 秒)
   */
  update(dt) {
    const n = this.agents.length;
    if (n === 0) return;

    this.framePulseCount = 0;
    const targetType = this.k >= 0 ? Math.min(1.0, 0.5 + this.k * 0.5) : Math.max(0.0, 0.5 + this.k * 0.5);

    // 格子間隔に基づく局所有効半径の算出（格子間をリレー式に伝播する波面を生成）
    const rRef = Math.max(this.cellSpacing * 1.85, 45);
    const invR2 = 1.0 / (rRef * rRef);

    // 1. 各格子点に対する結合相互作用の計算 (O(N^2) 高速ループ)
    const dPhases = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const a1 = this.agents[i];
      let couplingSum = 0;
      let weightSum = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a2 = this.agents[j];
        const dx = a1.x - a2.x;
        const dy = a1.y - a2.y;
        const d2 = dx * dx + dy * dy;

        // 距離の2乗減衰カーネル: 1 / (1 + (d / R)^2)
        const spatialWeight = 1.0 / (1.0 + d2 * invR2);

        couplingSum += spatialWeight * Math.sin(a2.phase - a1.phase);
        weightSum += spatialWeight;
      }

      const effCoupling = weightSum > 0 ? (couplingSum / weightSum) : 0;
      dPhases[i] = a1.omega * this.baseSpeed + this.k * 1.6 * effCoupling;
    }

    // 2. 位相の前進とパルストリガー判定
    const maxRipples = n > 64 ? 16 : 28;
    const noiseAmp = this.noiseLevel * 4.5;

    for (let i = 0; i < n; i++) {
      const a = this.agents[i];
      // 生体ゆらぎ（Langevinノイズ項）：固定ロックの硬直を打破し息づくような生きた揺らぎを維持
      const noise = noiseAmp > 0 ? (Math.random() - 0.5) * noiseAmp : 0;
      a.phase += (dPhases[i] + noise) * dt;
      a.typeWeight += (targetType - a.typeWeight) * 0.08;

      if (a.phase >= Math.PI * 2) {
        a.phase = a.phase % (Math.PI * 2);
        a.flashTimer = 1.0;

        // 同時発火時のオーディオ過負荷防止
        if (this.onPulseCallback && this.framePulseCount < this.maxPulsesPerFrame) {
          this.onPulseCallback(a, 1.0);
          this.framePulseCount++;
        }

        // リップル生成（過剰生成を防止）
        if (this.ripples.length < maxRipples) {
          this.ripples.push({
            x: a.x,
            y: a.y,
            radius: Math.max(3, this.cellSpacing * 0.1),
            maxRadius: this.k < 0 ? this.cellSpacing * 1.8 : this.cellSpacing * 1.3,
            opacity: 0.85,
            type: a.typeWeight
          });
        }
      }

      if (a.flashTimer > 0) {
        a.flashTimer = Math.max(0, a.flashTimer - dt * (a.typeWeight > 0.5 ? 1.6 : 4.0));
      }
    }

    // 3. 蔵本秩序度 (Order Parameter)
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
      r.radius += dt * (this.cellSpacing * 1.6 + 40);
      r.opacity -= dt * 1.2;
      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  /**
   * 格子ノードへの直接タップ刺激
   */
  perturbAgent(agent) {
    if (!agent) return;
    agent.phase = (agent.phase + Math.PI) % (Math.PI * 2);
    agent.flashTimer = 1.0;

    if (this.onPulseCallback) {
      this.onPulseCallback(agent, 1.2);
    }

    const shockRadius = Math.max(160, this.cellSpacing * 3.5);
    this.ripples.push({
      x: agent.x,
      y: agent.y,
      radius: 6,
      maxRadius: shockRadius,
      opacity: 1.0,
      type: agent.typeWeight,
      isShockwave: true
    });

    const shockRadius2 = shockRadius * shockRadius;
    this.agents.forEach(other => {
      if (other === agent) return;
      const dx = other.x - agent.x;
      const dy = other.y - agent.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < shockRadius2) {
        const falloff = 1.0 - Math.sqrt(d2) / shockRadius;
        other.phase = (other.phase + (Math.random() - 0.5) * Math.PI * 1.5 * falloff + Math.PI * 2) % (Math.PI * 2);
      }
    });
  }

  /**
   * 任意座標のクリックによる波紋外乱
   */
  perturbAt(x, y) {
    const shockRadius = Math.max(180, this.cellSpacing * 3.8);
    const shockRadius2 = shockRadius * shockRadius;

    this.agents.forEach(a => {
      const dx = a.x - x;
      const dy = a.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < shockRadius2) {
        const power = (1.0 - Math.sqrt(d2) / shockRadius);
        a.phase = (a.phase + (Math.random() - 0.5) * Math.PI * 2 * power + Math.PI * 2) % (Math.PI * 2);
      }
    });

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

  perturbAll() {
    this.agents.forEach(a => {
      a.phase = Math.random() * Math.PI * 2;
    });

    this.ripples.push({
      x: this.width * 0.5,
      y: this.height * 0.5,
      radius: 10,
      maxRadius: Math.hypot(this.width, this.height) * 0.5,
      opacity: 1.0,
      type: 0.5,
      isShockwave: true
    });
  }

  findAgentAt(x, y, radius = 30) {
    const rThreshold = Math.max(radius, this.cellSpacing * 0.45);
    const r2 = rThreshold * rThreshold;
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      const dx = a.x - x;
      const dy = a.y - y;
      if (dx * dx + dy * dy <= r2) {
        return a;
      }
    }
    return null;
  }
}

window.SimulationEngine = SimulationEngine;
