/**
 * SynchroEcho Audio Engine
 * Web Audio API based procedural sound synthesis for Firefly (Harmonic Chimes) & Frog (Wood Percussion)
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.reverbNode = null;
    this.isMuted = false;
    this.isInitialized = false;

    // 音階テーブル（Dメジャー・ペンタトニック／リディアン系）
    // 散乱時は美しいアンビエント和音、同期時は壮大なユニゾンコードに収斂
    this.fireflyScale = [
      146.83, // D3
      220.00, // A3
      293.66, // D4
      329.63, // E4
      369.99, // F#4
      440.00, // A4
      493.88, // B4
      554.37, // C#5
      587.33, // D5
      659.25, // E5
      739.99, // F#5
      880.00  // A5
    ];

    // カエルの音階テーブル（マリンバ／ガムラン調ポリリズム識別用音階）
    this.frogScale = [
      164.81, // E3
      196.00, // G3
      220.00, // A3
      246.94, // B3
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      493.88, // B4
      587.33, // D5
      659.25  // E5
    ];
  }

  init() {
    if (this.isInitialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // マスターリミッター／コンプレッサー（完全同期時のクリッピングを防ぎつつ音圧を最大化）
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    // マスターゲイン
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.voiceGainScale = 1.0;

    // 手続き型リバーブ（水辺・夜の空間の広がり）
    this.reverbNode = this.createProceduralReverb(2.2, 2.8);

    // 接続ルート: 個別音源 -> compressor -> masterGain -> destination
    //                        \-> reverbNode -> masterGain
    this.reverbNode.connect(this.masterGain);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  async resume() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setMute(mute) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.85, now, 0.05);
    }
  }

  setVoiceScale(agentCount) {
    this.voiceGainScale = Math.min(1.0, Math.sqrt(16 / Math.max(1, agentCount)));
  }

  /**
   * 手続き型インパルス応答（リバーブ用）の生成
   */
  createProceduralReverb(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const length = rate * seconds;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const d = Math.exp(-n * decay);
      left[i] = (Math.random() * 2 - 1) * d;
      right[i] = (Math.random() * 2 - 1) * d;
    }

    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;

    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.35;
    convolver.connect(reverbGain);

    return convolver;
  }

  /**
   * 発音トリガー（エージェントの位相が発光/鳴声点に達した瞬間にコール）
   * @param {Object} agent - エージェント情報 { id, x, y, pan, pitchIndex, typeWeight (0:カエル〜1:ホタル) }
   * @param {number} intensity - 発光/発声強度 (0.0〜1.0)
   */
  triggerPulse(agent, intensity = 1.0) {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // ステレオパンナー
    let panner;
    try {
      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, agent.pan || 0)), now);
    } catch {
      panner = this.ctx.createGain(); // フォールバック
    }

    // typeWeight: 0.0=純粋なカエル, 1.0=純粋なホタル
    const type = agent.typeWeight !== undefined ? agent.typeWeight : 1.0;
    const voiceScale = this.voiceGainScale || 1.0;

    if (type >= 0.5) {
      // ホタルの音色（ウォーム・チャイム／ローズ・ベル調）
      this.playFireflyTone(agent, now, panner, intensity * voiceScale, (type - 0.5) * 2);
    } else {
      // カエルの音色（ウッドブロック／マリンバ／水滴調パーカッション）
      this.playFrogTone(agent, now, panner, intensity * voiceScale, (0.5 - type) * 2);
    }
  }

  /**
   * ホタルの発音（ベル／チャイム・和音系）
   */
  playFireflyTone(agent, now, panner, intensity, weight) {
    const scale = this.fireflyScale;
    const freq = scale[agent.pitchIndex % scale.length];

    // 基音オシレーター（Sine）
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    // 倍音オシレーター（Triangle: 温かみと鈴鳴り感）
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.005, now); // わずかなデチューン

    // 音量エンベロープ
    const gainNode = this.ctx.createGain();
    const peakGain = 0.18 * intensity * (0.6 + weight * 0.4);
    gainNode.gain.setValueAtTime(0.0001, now);
    // 指数アタック（18ms）
    gainNode.gain.exponentialRampToValueAtTime(peakGain, now + 0.018);
    // 長い滑らかな減衰（0.9s〜1.6s）
    const decayDuration = 0.9 + (agent.pitchIndex % 4) * 0.2;
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decayDuration);

    // 接続
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.compressor);
    panner.connect(this.reverbNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + decayDuration + 0.1);
    osc2.stop(now + decayDuration + 0.1);
  }

  /**
   * カエルの発音（ウッド・マリンバ／カリンバ／共鳴木琴調）
   * ホタルと同等の音圧・響きを持ちつつ、反同期ポリリズムが明確に聴き取れるクリアな打弦音
   */
  playFrogTone(agent, now, panner, intensity, weight) {
    const scale = this.frogScale;
    const baseFreq = scale[agent.pitchIndex % scale.length];

    // 基音オシレーター（Sine: 澄んだ音程感）
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    // 共鳴倍音オシレーター（Triangle: ウッドマレット・マリンバの共鳴胴）
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    // わずかなピッチアタックで撥音の歯切れ良さを強調
    osc2.frequency.setValueAtTime(baseFreq * 2.08, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, now + 0.03);

    // 音量エンベロープ（ホタルと同等の十分な音圧と自然な減衰）
    const gainNode = this.ctx.createGain();
    const peakGain = 0.22 * intensity * (0.8 + weight * 0.2);
    const decayDuration = 0.5 + (agent.pitchIndex % 3) * 0.15; // 0.5s 〜 0.8s の澄んだ余韻

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(peakGain, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decayDuration);

    // 接続（コンプレッサーとリバーブへホタル同様にフルルーティング）
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.compressor);
    panner.connect(this.reverbNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + decayDuration + 0.05);
    osc2.stop(now + decayDuration + 0.05);
  }
}

window.AudioEngine = AudioEngine;
