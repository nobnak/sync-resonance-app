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
    this.agentCount = 12;     // 個体数 (2〜36)
    this.baseSpeed = 1.0;     // テンポ速度
    this.baseOmega = 2.4;     // 基本角速度 (rad/s, 約0.38Hz 〜 2.6秒周期)
    this.spatialRadius = 0.45;// 相互作用の空間的有効半径

    // 格子情報
    this.gridCols = 4;
    this.gridRows = 3;

    // コールバック
    this.onPulseCallback = null;

    // 秩序度 (Kuramoto Order Parameter: 0.0〜1.0)
    this.orderParameter = 0.0;
    this.meanPhase = 0.0;

    this.initAgents();
  }

  /**
   * 個体数 N と画面アスペクト比に応じた最適な格子 (Cols x Rows) を算出
   */
  calculateGridLayout() {
    const width = this.canvas.width || 800;
    const height = this.canvas.height || 600;
    const n = this.agentCount;

    let cols, rows;
    if (n <= 3) {
      cols = n;
      rows = 1;
    } else if (n === 4) {
      cols = 2;
      rows = 2;
    } else if (n <= 6) {
      cols = 3;
      rows = 2;
    } else if (n <= 9) {
      cols = 3;
      rows = 3;
    } else if (n <= 12) {
      cols = 4;
      rows = 3;
    } else if (n <= 16) {
      cols = 4;
      rows = 4;
    } else if (n <= 20) {
      cols = 5;
      rows = 4;
    } else if (n <= 25) {
      cols = 5;
      rows = 5;
    } else {
      cols = Math.ceil(Math.sqrt(n * (width / height)));
      cols = Math.max(1, Math.min(n, cols));
      rows = Math.ceil(n / cols);
    }
    return { cols, rows };
  }

  /**
   * 格子座標の計算と固定配置（リサイズ時にも呼び出し）
   */
  updateAgentPositions() {
    const width = this.canvas.width || 800;
    const height = this.canvas.height || 600;
    const n = this.agents.length;
    if (n === 0) return;

    const { cols, rows } = this.calculateGridLayout();
    this.gridCols = cols;
    this.gridRows = rows;

    // HUD や余白を考慮した配置領域
    const padX = Math.min(180, width * 0.16);
    const padY = Math.min(140, height * 0.18);
    const usableW = Math.max(100, width - padX * 2);
    const usableH = Math.max(100, height - padY * 2);

    const spacingX = cols > 1 ? usableW / (cols - 1) : 0;
    const spacingY = rows > 1 ? usableH / (rows - 1) : 0;

    for (let i = 0; i < n; i++) {
      const a = this.agents[i];
      const r = Math.floor(i / cols);
      const c = i % cols;

      // 最終行が余る場合のセンタリング調整
      const itemsInRow = Math.min(cols, n - r * cols);
      const rowStartX = cols > 1
        ? padX + (cols - itemsInRow) * spacingX * 0.5
        : width / 2;

      a.row = r;
      a.col = c;
      a.x = cols > 1 ? rowStartX + c * spacingX : width / 2;
      a.y = rows > 1 ? padY + r * spacingY : height / 2;
      a.pan = (a.x / width) * 2 - 1; // 空間定位（固定ステレオステージング）
    }
  }

  initAgents() {
    this.agents = [];
    for (let i = 0; i < this.agentCount; i++) {
      // 初期位相はランダムに均一分散
      const phase = Math.random() * Math.PI * 2;
      
      // 固有角速度にわずかな個体差（自然なゆらぎ ±4%）を付与
      const freqVariance = (Math.random() - 0.5) * 0.08;
      const omega = this.baseOmega * (1.0 + freqVariance);

      this.agents.push({
        id: i,
        x: 0,
        y: 0,
        row: 0,
        col: 0,
        phase: phase,
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

  /**
   * 物理・位相ステップの更新 (dt: 秒)
   */
  update(dt) {
    const n = this.agents.length;
    if (n === 0) return;

    const targetType = this.k >= 0 ? Math.min(1.0, 0.5 + this.k * 0.5) : Math.max(0.0, 0.5 + this.k * 0.5);

    // 格子間隔に基づく局所有効半径の算出
    const width = this.canvas.width || 800;
    const height = this.canvas.height || 600;
    const diag = Math.hypot(width, height);
    const rThreshold = this.spatialRadius * diag;

    // 1. 各格子点に対する結合相互作用の計算
    // dθ_i/dt = ω_i + (K / N) * Σ_j W(d_ij) * sin(θ_j - θ_i)
    const dPhases = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const a1 = this.agents[i];
      let couplingSum = 0;
      let weightSum = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a2 = this.agents[j];
        const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);

        // 格子上の距離減衰カーネル: 1 / (1 + (d / R)^2)
        const normalizedDist = dist / (rThreshold * 0.45);
        const spatialWeight = 1.0 / (1.0 + normalizedDist * normalizedDist);

        couplingSum += spatialWeight * Math.sin(a2.phase - a1.phase);
        weightSum += spatialWeight;
      }

      const effCoupling = weightSum > 0 ? (couplingSum / weightSum) : 0;
      dPhases[i] = a1.omega * this.baseSpeed + this.k * 1.6 * effCoupling;
    }

    // 2. 位相の前進とパルストリガー判定（位置は格子上に固定）
    for (let i = 0; i < n; i++) {
      const a = this.agents[i];
      a.phase += dPhases[i] * dt;
      a.typeWeight += (targetType - a.typeWeight) * 0.08;

      // 周期 2π 跨ぎで発声・発光パルスを発火
      if (a.phase >= Math.PI * 2) {
        a.phase = a.phase % (Math.PI * 2);
        a.flashTimer = 1.0;

        if (this.onPulseCallback) {
          this.onPulseCallback(a, 1.0);
        }

        // 格子点からの波紋発生
        this.ripples.push({
          x: a.x,
          y: a.y,
          radius: 6,
          maxRadius: this.k < 0 ? 110 : 75,
          opacity: 0.9,
          type: a.typeWeight
        });
      }

      // 発光タイマー減衰
      if (a.flashTimer > 0) {
        a.flashTimer = Math.max(0, a.flashTimer - dt * (a.typeWeight > 0.5 ? 1.5 : 4.0));
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
      r.radius += dt * 90;
      r.opacity -= dt * 1.1;
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
    // 位相を大きく反転/シフトし、パルスを発火
    agent.phase = (agent.phase + Math.PI) % (Math.PI * 2);
    agent.flashTimer = 1.0;

    if (this.onPulseCallback) {
      this.onPulseCallback(agent, 1.2);
    }

    // 刺激点からの衝撃波紋
    this.ripples.push({
      x: agent.x,
      y: agent.y,
      radius: 8,
      maxRadius: 220,
      opacity: 1.0,
      type: agent.typeWeight,
      isShockwave: true
    });

    // 隣接格子ノードへの位相伝播・外乱
    const shockRadius = 220;
    this.agents.forEach(other => {
      if (other === agent) return;
      const d = Math.hypot(other.x - agent.x, other.y - agent.y);
      if (d < shockRadius) {
        const falloff = 1.0 - d / shockRadius;
        other.phase = (other.phase + (Math.random() - 0.5) * Math.PI * 1.5 * falloff + Math.PI * 2) % (Math.PI * 2);
      }
    });
  }

  /**
   * 任意座標のクリックによる波紋外乱
   */
  perturbAt(x, y) {
    const shockRadius = 240;
    this.agents.forEach(a => {
      const dist = Math.hypot(a.x - x, a.y - y);
      if (dist < shockRadius) {
        const power = (1.0 - dist / shockRadius);
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

  /**
   * 全体外乱（突風・一括リセット）
   */
  perturbAll() {
    this.agents.forEach(a => {
      a.phase = Math.random() * Math.PI * 2;
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
   * クリック位置にある格子ノードを検索
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
