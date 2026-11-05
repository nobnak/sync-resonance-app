/**
 * SynchroEcho Visual Renderer
 * High-performance 2D Canvas rendering on Spatial Lattice/Grid with glow, water ripples, and Kuramoto phase visualization.
 */

class Renderer {
  constructor(canvas, simulation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sim = simulation;

    // 背景の微粒子（夜の湿原・浮遊塵）
    this.ambientDust = [];
    this.initDust();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width || window.innerWidth || 800);
    const h = Math.round(rect.height || window.innerHeight || 600);

    // 物理ピクセル解像度のバッファ設定
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);

    // 累積変形を防ぎ、論理ピクセル (w, h) への自動スケーリングをセット
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.width = w;
    this.height = h;

    // シミュレーション側へ論理ピクセルサイズを通知して格子を再計算
    if (this.sim && this.sim.setSize) {
      this.sim.setSize(w, h);
    }
  }

  initDust() {
    this.ambientDust = [];
    for (let i = 0; i < 40; i++) {
      this.ambientDust.push({
        x: Math.random() * (this.width || 800),
        y: Math.random() * (this.height || 600),
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.25 + 0.08,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2
      });
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. 背景の描画（夜の沼地・森のグラデーション）
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.65);
    if (this.sim.k >= 0) {
      bgGrad.addColorStop(0, '#0c121e');
      bgGrad.addColorStop(0.7, '#070a12');
      bgGrad.addColorStop(1, '#030508');
    } else {
      bgGrad.addColorStop(0, '#09151c');
      bgGrad.addColorStop(0.7, '#050c12');
      bgGrad.addColorStop(1, '#020508');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. 完全同期時の全画面フラッシュ（ホタルのカタルシス呼吸）
    if (this.sim.k > 0.3 && this.sim.orderParameter > 0.75) {
      const syncFlash = Math.max(0, Math.cos(this.sim.meanPhase)) * (this.sim.orderParameter - 0.6) * 1.8;
      if (syncFlash > 0.05) {
        ctx.fillStyle = `rgba(245, 176, 65, ${Math.min(0.22, syncFlash * 0.22)})`;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // 3. 環境微粒子（浮遊する塵・残光）
    ctx.fillStyle = '#ffffff';
    for (const p of this.ambientDust) {
      p.x = (p.x + p.speedX + w) % w;
      p.y = (p.y + p.speedY + h) % h;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 4. 格子ネットワーク構造（格子線の描画 O(N)）
    this.renderLatticeMesh(ctx);

    // 5. 結合状態のリンク線 O(N)
    if (this.sim.k < -0.15) {
      this.renderRepulsionLinks(ctx); // カエル反同期リンク
    } else if (this.sim.k > 0.25) {
      this.renderAttractionLinks(ctx); // ホタル同期調和リンク
    }

    // 6. 水面波紋・光輪リップル
    this.renderRipples(ctx);

    // 7. 各格子ノード（ホタル / カエル）の描画
    const nodeRadius = Math.max(3.5, Math.min(14, this.sim.cellSpacing * 0.32));
    for (const a of this.sim.agents) {
      this.renderAgent(ctx, a, nodeRadius);
    }
  }

  /**
   * 格子ノード同士を結ぶ基本トポロジー線の描画 (O(N) 高速隣接走査)
   */
  renderLatticeMesh(ctx) {
    const agents = this.sim.agents;
    const n = agents.length;
    if (n <= 1) return;

    ctx.save();
    const isFirefly = this.sim.k >= 0;
    ctx.strokeStyle = isFirefly ? 'rgba(245, 176, 65, 0.07)' : 'rgba(46, 204, 113, 0.07)';
    ctx.lineWidth = Math.max(0.7, Math.min(1.5, this.sim.cellSpacing * 0.02));

    ctx.beginPath();
    const cols = this.sim.gridCols;
    for (let i = 0; i < n; i++) {
      const a1 = agents[i];
      // 右隣のノード
      if (a1.col + 1 < cols && i + 1 < n && agents[i + 1].row === a1.row) {
        ctx.moveTo(a1.x, a1.y);
        ctx.lineTo(agents[i + 1].x, agents[i + 1].y);
      }
      // 下隣のノード
      const downIdx = i + cols;
      if (downIdx < n) {
        ctx.moveTo(a1.x, a1.y);
        ctx.lineTo(agents[downIdx].x, agents[downIdx].y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * ホタル同期時の同相リンク（近傍ノード同士の位相が揃ったときに輝く O(N)）
   */
  renderAttractionLinks(ctx) {
    const agents = this.sim.agents;
    const n = agents.length;
    if (n <= 1) return;

    const cols = this.sim.gridCols;
    const baseWidth = Math.max(1, Math.min(2.5, this.sim.cellSpacing * 0.04));

    ctx.save();
    for (let i = 0; i < n; i++) {
      const a1 = agents[i];
      // 右隣と下隣をチェック
      const neighbors = [];
      if (a1.col + 1 < cols && i + 1 < n && agents[i + 1].row === a1.row) {
        neighbors.push(agents[i + 1]);
      }
      const downIdx = i + cols;
      if (downIdx < n) {
        neighbors.push(agents[downIdx]);
      }

      for (const a2 of neighbors) {
        const syncMetric = Math.max(0, Math.cos(a1.phase - a2.phase));
        if (syncMetric > 0.65) {
          const alpha = (syncMetric - 0.65) / 0.35;
          ctx.strokeStyle = `rgba(245, 176, 65, ${alpha * 0.45})`;
          ctx.lineWidth = baseWidth * (0.8 + alpha * 1.2);
          ctx.beginPath();
          ctx.moveTo(a1.x, a1.y);
          ctx.lineTo(a2.x, a2.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /**
   * カエル反同期時の排他リンク（逆相で美しいグリーン、同相衝突時は赤 O(N)）
   */
  renderRepulsionLinks(ctx) {
    const agents = this.sim.agents;
    const n = agents.length;
    if (n <= 1) return;

    const cols = this.sim.gridCols;
    const baseWidth = Math.max(1, Math.min(2.5, this.sim.cellSpacing * 0.04));

    ctx.save();
    for (let i = 0; i < n; i++) {
      const a1 = agents[i];
      const neighbors = [];
      if (a1.col + 1 < cols && i + 1 < n && agents[i + 1].row === a1.row) {
        neighbors.push(agents[i + 1]);
      }
      const downIdx = i + cols;
      if (downIdx < n) {
        neighbors.push(agents[downIdx]);
      }

      for (const a2 of neighbors) {
        // 位相差 π (180°) で完全反同期 (1.0)
        const phaseDiff = Math.abs(Math.sin((a1.phase - a2.phase) * 0.5));
        if (phaseDiff > 0.75) {
          const alpha = (phaseDiff - 0.75) / 0.25;
          ctx.strokeStyle = `rgba(46, 204, 113, ${0.15 + alpha * 0.45})`;
        } else {
          const conflict = (0.75 - phaseDiff) / 0.75;
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.1 + conflict * 0.5})`;
        }
        ctx.lineWidth = baseWidth;
        ctx.beginPath();
        ctx.moveTo(a1.x, a1.y);
        ctx.lineTo(a2.x, a2.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * 水面波紋・光輪リップルの描画
   */
  renderRipples(ctx) {
    ctx.save();
    for (const r of this.sim.ripples) {
      if (r.isShockwave) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.8})`;
        ctx.lineWidth = 2.0;
      } else if (r.type >= 0.5) {
        ctx.strokeStyle = `rgba(245, 176, 65, ${r.opacity * 0.45})`;
        ctx.lineWidth = 1.2;
      } else {
        ctx.strokeStyle = `rgba(46, 204, 113, ${r.opacity * 0.6})`;
        ctx.lineWidth = 1.5;
      }

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 個体エージェントの描画（動的スケール対応固定ノード）
   */
  renderAgent(ctx, a, radius) {
    const type = a.typeWeight; // 0.0(カエル) 〜 1.0(ホタル)
    const flash = a.flashTimer; // 1.0 -> 0.0

    ctx.save();

    // 1. 固定台座リング（背景グリッド上のノード位置表示）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = Math.max(1, radius * 0.12);
    ctx.beginPath();
    ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. 位相の前進アーク（時計回りの進捗）
    const ringColor = type >= 0.5 ? 'rgba(245, 176, 65, 0.7)' : 'rgba(46, 204, 113, 0.7)';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = Math.max(1.5, radius * 0.2);
    ctx.beginPath();
    ctx.arc(a.x, a.y, radius, -Math.PI * 0.5, -Math.PI * 0.5 + a.phase, false);
    ctx.stroke();

    // 3. ホタルとしての描画（発光・ブルーム・残光）
    if (type > 0.2) {
      const fireflyAlpha = type;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const glowRadius = radius * (0.8 + flash * 2.6);
      const glowGrad = ctx.createRadialGradient(a.x, a.y, 1, a.x, a.y, glowRadius);
      glowGrad.addColorStop(0, `rgba(255, 255, 230, ${fireflyAlpha * (0.85 + flash * 0.15)})`);
      glowGrad.addColorStop(0.3, `rgba(245, 176, 65, ${fireflyAlpha * (0.6 * flash + 0.18)})`);
      glowGrad.addColorStop(1, 'rgba(245, 176, 65, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(a.x, a.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. カエルとしての描画（蓮の葉・水面上の実体感）
    if (type < 0.8) {
      const frogAlpha = 1.0 - type;
      ctx.save();
      // 蓮の葉の台座
      const padRadius = radius * 0.75 + (1.0 - flash) * 1.5;
      ctx.fillStyle = `rgba(20, 60, 40, ${frogAlpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, padRadius, 0, Math.PI * 2);
      ctx.fill();

      // カエルの本体
      const bodyRadius = radius * 0.42 + flash * 2.5;
      const bodyColor = flash > 0.1
        ? `rgba(74, 222, 128, ${frogAlpha})`
        : `rgba(34, 197, 94, ${frogAlpha * 0.85})`;
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(a.x, a.y, bodyRadius, 0, Math.PI * 2);
      ctx.fill();

      // 目のアクセント（十分なサイズがある場合のみ）
      if (radius >= 9 && flash > 0.05) {
        ctx.fillStyle = '#ffffff';
        const eyeOffset = radius * 0.18;
        ctx.beginPath();
        ctx.arc(a.x - eyeOffset, a.y - eyeOffset, 1.0, 0, Math.PI * 2);
        ctx.arc(a.x + eyeOffset, a.y - eyeOffset, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. 音高ラベル（十分な間隔がある場合のみ表示）
    if (radius >= 9) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = `${Math.round(radius * 0.7)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`#${a.pitchIndex + 1}`, a.x, a.y + radius + 11);
    }

    ctx.restore();
  }
}

window.Renderer = Renderer;
