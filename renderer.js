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
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.hypot(w, h) / 1.5);
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

    // 4. 格子ネットワーク構造（格子線の描画）
    this.renderLatticeMesh(ctx);

    // 5. 結合状態のリンク線
    if (this.sim.k < -0.15) {
      this.renderRepulsionLinks(ctx); // カエル反同期リンク
    } else if (this.sim.k > 0.25) {
      this.renderAttractionLinks(ctx); // ホタル同期調和リンク
    }

    // 6. 水面波紋・光輪リップル
    this.renderRipples(ctx);

    // 7. 各格子ノード（ホタル / カエル）の描画
    for (const a of this.sim.agents) {
      this.renderAgent(ctx, a);
    }
  }

  /**
   * 格子ノード同士を結ぶ基本トポロジー線の描画
   */
  renderLatticeMesh(ctx) {
    const agents = this.sim.agents;
    const n = agents.length;
    if (n <= 1) return;

    ctx.save();
    const isFirefly = this.sim.k >= 0;
    ctx.strokeStyle = isFirefly ? 'rgba(245, 176, 65, 0.06)' : 'rgba(46, 204, 113, 0.06)';
    ctx.lineWidth = 1;

    for (let i = 0; i < n; i++) {
      const a1 = agents[i];
      for (let j = i + 1; j < n; j++) {
        const a2 = agents[j];
        const dr = Math.abs(a1.row - a2.row);
        const dc = Math.abs(a1.col - a2.col);
        const isNeighbor = (dr + dc === 1) || (n <= 4 && dr <= 1 && dc <= 1);

        if (isNeighbor) {
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
   * ホタル同期時の同相リンク（近傍ノード同士の位相が揃ったときに輝く）
   */
  renderAttractionLinks(ctx) {
    const agents = this.sim.agents;
    const n = agents.length;
    if (n <= 1) return;

    ctx.save();
    for (let i = 0; i < n; i++) {
      const a1 = agents[i];
      for (let j = i + 1; j < n; j++) {
        const a2 = agents[j];
        const dr = Math.abs(a1.row - a2.row);
        const dc = Math.abs(a1.col - a2.col);
        const isNeighbor = (dr + dc === 1) || (n <= 4 && dr <= 1 && dc <= 1);

        if (isNeighbor) {
          const syncMetric = Math.max(0, Math.cos(a1.phase - a2.phase));
          if (syncMetric > 0.65) {
            const alpha = (syncMetric - 0.65) / 0.35;
            ctx.strokeStyle = `rgba(245, 176, 65, ${alpha * 0.45})`;
            ctx.lineWidth = 1 + alpha * 1.5;
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x, a2.y);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  /**
   * カエル反同期時の排他リンク（逆相で美しいグリーン、同相衝突時は赤）
   */
  renderRepulsionLinks(ctx) {
    const agents = this.sim.agents;
    const n = agents.length;
    if (n <= 1) return;

    ctx.save();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < n; i++) {
      const a1 = agents[i];
      for (let j = i + 1; j < n; j++) {
        const a2 = agents[j];
        const dr = Math.abs(a1.row - a2.row);
        const dc = Math.abs(a1.col - a2.col);
        const isNeighbor = (dr + dc === 1) || (n <= 4 && dr <= 1 && dc <= 1);

        if (isNeighbor) {
          // 位相差 π (180°) で完全反同期 (1.0)
          const phaseDiff = Math.abs(Math.sin((a1.phase - a2.phase) * 0.5));
          if (phaseDiff > 0.75) {
            const alpha = (phaseDiff - 0.75) / 0.25;
            ctx.strokeStyle = `rgba(46, 204, 113, ${0.15 + alpha * 0.45})`;
          } else {
            const conflict = (0.75 - phaseDiff) / 0.75;
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.1 + conflict * 0.5})`;
          }
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
   * 水面波紋・光輪リップルの描画
   */
  renderRipples(ctx) {
    ctx.save();
    for (const r of this.sim.ripples) {
      if (r.isShockwave) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.8})`;
        ctx.lineWidth = 2.5;
      } else if (r.type >= 0.5) {
        ctx.strokeStyle = `rgba(245, 176, 65, ${r.opacity * 0.45})`;
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = `rgba(46, 204, 113, ${r.opacity * 0.6})`;
        ctx.lineWidth = 2.0;
      }

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 個体エージェントの描画（固定ノード）
   */
  renderAgent(ctx, a) {
    const type = a.typeWeight; // 0.0(カエル) 〜 1.0(ホタル)
    const flash = a.flashTimer; // 1.0 -> 0.0
    const radius = 15;

    ctx.save();

    // 1. 固定台座リング（背景グリッド上のノード位置表示）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. 位相の前進アーク（時計回りの進捗）
    const ringColor = type >= 0.5 ? 'rgba(245, 176, 65, 0.65)' : 'rgba(46, 204, 113, 0.65)';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(a.x, a.y, radius, -Math.PI / 2, -Math.PI / 2 + a.phase, false);
    ctx.stroke();

    // 3. ホタルとしての描画（発光・ブルーム・残光）
    if (type > 0.2) {
      const fireflyAlpha = type;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const glowRadius = 9 + flash * 38;
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
      const padRadius = 10 + (1.0 - flash) * 2;
      ctx.fillStyle = `rgba(20, 60, 40, ${frogAlpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, padRadius, 0, Math.PI * 2);
      ctx.fill();

      // カエルの本体
      const bodyRadius = 5.5 + flash * 3;
      const bodyColor = flash > 0.1
        ? `rgba(74, 222, 128, ${frogAlpha})`
        : `rgba(34, 197, 94, ${frogAlpha * 0.85})`;
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(a.x, a.y, bodyRadius, 0, Math.PI * 2);
      ctx.fill();

      // 目のアクセント
      if (flash > 0.05) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(a.x - 2, a.y - 2, 1.2, 0, Math.PI * 2);
        ctx.arc(a.x + 2, a.y - 2, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. 音高ラベル（小文字でノート番号）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`#${a.pitchIndex + 1}`, a.x, a.y + radius + 11);

    ctx.restore();
  }
}

window.Renderer = Renderer;
