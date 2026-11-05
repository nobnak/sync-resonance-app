/**
 * SynchroEcho Visual Renderer
 * High-performance 2D Canvas rendering with glow, water ripples, caustics, and phase visualization.
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
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  initDust() {
    this.ambientDust = [];
    for (let i = 0; i < 45; i++) {
      this.ambientDust.push({
        x: Math.random() * (this.width || 800),
        y: Math.random() * (this.height || 600),
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
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
    // Kの値に応じて背景のトーンをわずかにシフト
    // K > 0 (ホタル): 暖かい漆黒とアンバー、K < 0 (カエル): 深いアクア・ティールと夜の湿原
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
      // 平均位相が0付近（発火タイミング）のとき、背景が息を吸うように輝く
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

    // 4. カエルモード時の相互排他リンク（斥力場の可視化）
    if (this.sim.k < -0.2) {
      this.renderRepulsionLinks(ctx);
    }

    // 5. 波紋・リップルの描画
    this.renderRipples(ctx);

    // 6. 各エージェント（ホタル / カエル）の描画
    for (const a of this.sim.agents) {
      this.renderAgent(ctx, a);
    }

    // 7. ドラッグ中のターゲット強調
    if (this.sim.draggedAgent) {
      const da = this.sim.draggedAgent;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(da.x, da.y, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /**
   * カエル同士の斥力リンク（近い個体同士が位相を押し合っている状態）
   */
  renderRepulsionLinks(ctx) {
    const agents = this.sim.agents;
    const n = agents.length;
    const linkDistThreshold = 180;

    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a1 = agents[i];
        const a2 = agents[j];
        const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);
        if (dist < linkDistThreshold) {
          // 位相差が π（反同期）に近いほど美しく整った緑のリンク、衝突中（位相差0）は赤みを帯びる
          const phaseDiff = Math.abs(Math.sin((a1.phase - a2.phase) * 0.5)); // 1.0=完全反同期, 0.0=衝突
          const alpha = (1.0 - dist / linkDistThreshold) * 0.35;

          if (phaseDiff > 0.8) {
            ctx.strokeStyle = `rgba(46, 204, 113, ${alpha * 1.2})`; // 調和した反同期
          } else {
            ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.8})`; // 衝突中の緊張
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
        // 外乱ショックウェーブ（シアン色の鋭い衝撃波）
        ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.8})`;
        ctx.lineWidth = 2.5;
      } else if (r.type >= 0.5) {
        // ホタルの光輪（ソフトな黄金の拡散）
        ctx.strokeStyle = `rgba(245, 176, 65, ${r.opacity * 0.45})`;
        ctx.lineWidth = 1.5;
      } else {
        // カエルの水面波紋（エメラルドの同心円）
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
   * 個体エージェントの描画
   */
  renderAgent(ctx, a) {
    const type = a.typeWeight; // 0.0(カエル) 〜 1.0(ホタル)
    const flash = a.flashTimer; // 1.0 -> 0.0

    // 位相リング（発火までの蓄積を時計回りの弧で表示）
    const radius = 14;
    ctx.save();

    // 1. 位相インジケーター（各個体がどのタイミングにあるかを可視化）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 位相の前進アーク
    const ringColor = type >= 0.5 ? 'rgba(245, 176, 65, 0.5)' : 'rgba(46, 204, 113, 0.5)';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(a.x, a.y, radius, -Math.PI / 2, -Math.PI / 2 + a.phase, false);
    ctx.stroke();

    // 2. ホタルとしての描画（発光・ブルーム・残光）
    if (type > 0.2) {
      const fireflyAlpha = type;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; // 加算合成で光を重ねる

      const glowRadius = 8 + flash * 36;
      const glowGrad = ctx.createRadialGradient(a.x, a.y, 1, a.x, a.y, glowRadius);
      glowGrad.addColorStop(0, `rgba(255, 255, 230, ${fireflyAlpha * (0.8 + flash * 0.2)})`);
      glowGrad.addColorStop(0.3, `rgba(245, 176, 65, ${fireflyAlpha * (0.6 * flash + 0.15)})`);
      glowGrad.addColorStop(1, 'rgba(245, 176, 65, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(a.x, a.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. カエルとしての描画（蓮の葉・水面上の実体感）
    if (type < 0.8) {
      const frogAlpha = 1.0 - type;
      ctx.save();
      // 蓮の葉の台座
      const padRadius = 9 + (1.0 - flash) * 2;
      ctx.fillStyle = `rgba(20, 60, 40, ${frogAlpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, padRadius, 0, Math.PI * 2);
      ctx.fill();

      // カエルの本体（鳴いた瞬間に明るく跳ねる）
      const bodyRadius = 5 + flash * 3;
      const bodyColor = flash > 0.1
        ? `rgba(74, 222, 128, ${frogAlpha})`
        : `rgba(34, 197, 94, ${frogAlpha * 0.8})`;
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

    // 4. 音高ラベル（小文字でノート番号・音階を表示）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`#${a.pitchIndex + 1}`, a.x, a.y + radius + 11);

    ctx.restore();
  }
}

window.Renderer = Renderer;
