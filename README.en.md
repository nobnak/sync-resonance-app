**English** | [日本語](README.md)

# SynchroEcho (Firefly Synchronization & Frog Anti-synchronization)

> **Acoustic and Mathematical Art of "Entrainment" and "Exclusion" Woven by Natural Oscillators**  
> An interactive web application designed to visually and aurally explore the catharsis of in-phase synchronization in fireflies (attractive coupling $K > 0$) and the interlocking polyrhythms of anti-phase exclusion in calling frogs (repulsive coupling $K < 0$).

🎮 **Launch the Web App (Runs directly in your browser)**  
👉 **[https://nobnak.github.io/sync-resonance-app/](https://nobnak.github.io/sync-resonance-app/)**

---

## 🌟 Key Features

- **Zero Dependencies (Pure HTML5 / CSS3 / ES6 JavaScript)**  
  Built entirely with native browser standards—**Web Audio API** and **HTML5 Canvas 2D**—with zero third-party libraries or npm dependencies. Extremely lightweight and fast, running seamlessly on GitHub Pages.
- **Adaptive 2D Lattice Grid Layout**  
  Oscillators are distributed across a 2D regular grid centered to the viewport aspect ratio. This makes domino-like wave propagation and checkerboard alternation clearly legible to the human eye.
- **Musically Meaningful Acoustic Design**  
  Tuned so that every stage—scattered chaos, transient wave formation, and settled order—creates engaging, harmonious musical textures rather than abrasive beeps.
  - **Firefly Mode (Attractive)**: Warm bell/electric-piano tones based on pentatonic intervals. Begins with soft, ambient chords in chaos and builds to a resonant unison chord (fortissimo) upon full synchronization.
  - **Frog Mode (Repulsive)**: Crisp attack woodblock/marimba percussion. Repulsive dynamics prevent acoustic collisions, weaving intricate interlocking polyrhythms reminiscent of Balinese gamelan kotekan.
- **Spatial Audio (Stereo Panning)**  
  Each node's horizontal position ($X$) maps dynamically to stereo panning, letting you perceive rhythmic ripples traveling across the acoustic field.
- **Rich Parameter Controls with Time-Dilation Invariance**  
  - **Coupling Strength ($K$)**: Seamlessly slide between repulsive (-1.5), neutral chaos (0), and attractive (+1.5).
  - **Agent Count ($N$)**: 2 to 100 oscillators (automatically snaps to balanced 2D grids from $2\times2$ to $10\times10$).
  - **Tempo / Playback Speed**: Linearly scales the entire phase velocity vector without warping the underlying synchronization threshold or phase-space trajectory.
  - **Natural Frequency Spread ($\pm 0\% \sim \pm 30\%$)**: Adjusts the dispersion of individual natural frequencies $\omega_i$.
  - **Biological Noise ($\pm 0\% \sim \pm 20\%$)**: Injects frame-by-frame stochastic perturbations.
  - **Coupling Radius Multiplier**: Tunes the interaction reach from $1.0\times$ (strict nearest-neighbors only) to $6.0\times$ (all-to-all mean-field coupling).
- **Curated One-Click Presets**  
  - ✨ **Firefly Swarm (36)**: 6×6 grid attractive coupling. Watch scattered chaos coalesce into a magnificent unison chord.
  - 🌌 **Hundred Vistas (100)**: 10×10 grid. Mesmerizing optical and acoustic wave fronts rolling across the entire field.
  - 🐸 **Frog Chorus (36)**: Local repulsive coupling. Crisp checkerboard alternation and layered polyrhythmic grooves.
  - 🐸 **Frog Canon (4)**: 2×2 grid. Diagonal pairs alternating in a tight, ping-pong interlocking round.
  - ⏱️ **Phasing (Reich 9)**: Sub-threshold coupling ($K=0.12$) with high frequency variance. Minimalist phase shifting in the style of Steve Reich.
  - 🌀 **Chaos Swarm (64)**: Zero coupling ($K=0$). Independent, asynchronous flashes and tones forming a generative ambient soundscape.
- **Real-Time Interactive Gestures**  
  - **Screen Tap / "Wind Gust" Button**: Instantly scrambles oscillator phases to observe the dynamic recovery from tension to harmony.
  - **Direct Node Stimulation**: Tap any node on the grid to perturb its phase and trigger visible, audible ripples that propagate outward.

---

## 🔬 Mathematical Model

The underlying simulation is built upon the **Kuramoto Model** augmented with a distance-decay spatial kernel:

$$\frac{d\theta_i}{dt} = \left( \omega_i + K \cdot c \cdot \frac{\sum_{j \neq i} W(d_{ij}) \sin(\theta_j - \theta_i)}{\sum_{j \neq i} W(d_{ij})} \right) \cdot v_{\text{speed}} + \eta_i(t)$$

- $\theta_i$: Phase of the $i$-th oscillator ($[0, 2\pi)$)
- $\omega_i$: Natural angular frequency of oscillator $i$ ($\omega_0 \cdot (1 + \Delta\omega_i)$)
- $K$: Coupling constant
  - **$K > 0$ (Firefly)**: In-phase attraction ($\Delta\theta \to 0$)
  - **$K < 0$ (Frog)**: Anti-phase repulsion ($\Delta\theta \to \pi$)
- $W(d_{ij})$: Cauchy/Lorentzian spatial weighting kernel $\frac{1}{1 + (d_{ij} / R)^2}$ where $R = \text{cellSpacing} \times \text{radiusMultiplier}$
- $v_{\text{speed}}$: Tempo multiplier for time dilation invariance
- $\eta_i(t)$: Stochastic biological noise term
- **Kuramoto Order Parameter $r$**:
  $$r e^{i\psi} = \frac{1}{N} \sum_{j=1}^N e^{i\theta_j}$$
  Measures global coherence: $r \to 1.0$ under full in-phase synchrony, and $r \to 0.0$ under complete phase dispersion (anti-synchrony or uniform chaos).
