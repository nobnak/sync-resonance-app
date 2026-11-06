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
  Oscillators are distributed across a centered 2D square regular grid adapted to the viewport aspect ratio. This renders domino-like wave propagation and checkerboard alternation clearly legible to the human eye.
- **Atmospheric Breeze Wave (Organic Breathing Dynamics)**  
  Standard Kuramoto models inevitably freeze into static fixed-point equilibria once synchronized ($r = 1.00$ or fixed constants). SynchroEcho introduces an **Atmospheric Breeze Wave (2D Spatially Correlated Low-Frequency Fluctuation)** inspired by wind rippling across a forest or wetland. By defeating the law of large numbers cancellation, the swarm's order parameter actively breathes and wanders across $r \approx 75\% \sim 95\%$ in steady state.
- **Musically Meaningful Acoustic Design**  
  Tuned so that every stage—scattered chaos, transient wave formation, and settled order—creates engaging, harmonious musical textures rather than abrasive beeps.
  - **Firefly Mode (Attractive Coupling)**: Warm bell and electric piano tones rich in harmonic overtones. Pentatonic and modal scale degrees are dispersed across nodes, coalescing from a soft ambient texture into a resonant unison chord (fortissimo) upon synchronization.
  - **Frog Mode (Repulsive Coupling)**: Crisp attack marimba and woodblock percussion. Repulsive dynamics prevent acoustic collisions, weaving intricate interlocking polyrhythms reminiscent of Balinese gamelan kotekan.
- **Spatial Audio (Stereo Panning)**  
  Each node's horizontal position ($X$) maps dynamically to stereo panning, letting you perceive rhythmic ripples traveling across the acoustic field.
- **Rich Parameter Controls with Time-Dilation Invariance**  
  - **Coupling Strength ($K$)**: Seamlessly slide between repulsive (-1.5), neutral chaos (0), and attractive (+1.5).
  - **Agent Count ($N$)**: 2 to 100 oscillators (automatically snaps to balanced 2D grids from $2\times2$ to $10\times10$).
  - **Tempo / Playback Speed**: Linearly scales the entire phase velocity vector without warping the underlying synchronization threshold or phase-space trajectory.
  - **Natural Frequency Spread ($\pm 0\% \sim \pm 30\%$)**: Adjusts the dispersion of individual natural frequencies $\omega_i$.
  - **Biological Noise ($\pm 0\% \sim \pm 20\%$)**: Governs the amplitude of the atmospheric wave and microscopic Brownian diffusion.
  - **Coupling Radius Multiplier**: Tunes the interaction reach from $1.0\times$ (strict nearest-neighbors only) to $6.0\times$ (all-to-all mean-field coupling).
- **Curated One-Click Presets (Responsive Grid Layout)**  
  - ✨ **Firefly Swarm (36)**: 6×6 grid attractive coupling. A resonant chorus breathing organically between $75\% \sim 95\%$ order under the atmospheric breeze.
  - 🌌 **Hundred Vistas (100)**: 10×10 grid. Optical and acoustic wave fronts rolling across the entire field.
  - 🐸 **Frog Chorus (36)**: Local repulsive coupling (radius $1.2\times$). Crisp checkerboard alternation and layered polyrhythmic grooves.
  - 🐸 **Frog Canon (4)**: 2×2 grid. Diagonal pairs alternating in a tight, ping-pong interlocking round.
  - ⏱️ **Phasing (Reich 9)**: Sub-threshold coupling ($K=0.12$) with high frequency variance. Minimalist phase shifting in the style of Steve Reich.
  - 🌀 **Chaos Swarm (64)**: Zero coupling ($K=0$). Independent, asynchronous flashes and tones forming a generative ambient soundscape.
- **Real-Time Interactive Gestures**  
  - **Direct Node Stimulation**: Tap any node on the grid to stimulate its phase and trigger visible, audible ripples propagating outward.
  - **Screen Tap / "Wind Gust" Button**: Instantly injects a shockwave that scrambles oscillator phases to observe the dynamic recovery from tension to harmony.

---

## 🔬 Mathematical Model

The simulation is built upon the **Kuramoto Model** augmented with a distance-decay spatial kernel and spatial atmospheric fluctuation.

### 1. Phase Evolution Equation

The phase $\theta_i \in [0, 2\pi)$ of each grid node $i$ evolves according to:

$$\frac{d\theta_i}{dt} = \left( \omega_i^{\text{eff}}(\mathbf{x}_i, t) + K \cdot c \cdot \frac{\sum_{j \neq i} W(d_{ij}) \sin(\theta_j - \theta_i)}{\sum_{j \neq i} W(d_{ij})} \right) \cdot v_{\text{speed}}$$

- $\mathbf{x}_i = (x_i, y_i)$: 2D spatial coordinate of node $i$
- $K$: Coupling strength ($K > 0$: in-phase entrainment $\Delta\theta \to 0$; $K < 0$: anti-phase exclusion $\Delta\theta \to \pi$)
- $c = 1.6$: Interaction sensitivity constant
- $v_{\text{speed}}$: Tempo multiplier for time dilation invariance
- $W(d_{ij})$: Cauchy/Lorentzian spatial weighting kernel
  $$W(d_{ij}) = \frac{1}{1 + \left( \frac{d_{ij}}{R_{\text{eff}}} \right)^2}, \quad R_{\text{eff}} = \text{cellSpacing} \times \text{radiusMultiplier}$$

### 2. Atmospheric Breeze Wave (Spatially Correlated Fluctuation)

Each oscillator's effective natural frequency $\omega_i^{\text{eff}}$ is dynamically modulated by a 2D composite traveling atmospheric wave $W_{\text{breeze}}$:

$$\omega_i^{\text{eff}}(\mathbf{x}_i, t) = \omega_i \cdot \left( 1 + W_{\text{breeze}}(\mathbf{x}_i, t) \right)$$

$$\omega_i = \omega_0 \cdot (1 + \text{freqNorm}_i \cdot \text{freqSpread})$$

$$W_{\text{breeze}}(\mathbf{x}_i, t) = \sigma_{\text{wind}} \cdot \left[ 0.55 \sin(0.45 t + 0.005 x_i + 0.003 y_i) + 0.45 \cos(0.32 t - 0.004 x_i + 0.006 y_i) \right]$$

where $\sigma_{\text{wind}} = \text{noiseLevel} \times 4.2$. Because this wave possesses spatial coherence, it is not cancelled out by the law of large numbers, allowing the order parameter to smoothly undulate in steady state.

### 3. Stochastic Phase Stepping (Euler-Maruyama)

At each discrete time step $\Delta t$, Brownian micro-increments are added:

$$\theta_i(t + \Delta t) = \theta_i(t) + \left( \frac{d\theta_i}{dt} \right) \Delta t + \sigma_{\text{micro}} \cdot \xi_i \sqrt{\Delta t} \cdot v_{\text{speed}}$$

- $\xi_i \sim \text{Uniform}(-0.5, 0.5)$
- $\sigma_{\text{micro}} = \text{noiseLevel} \times 2.0$

### 4. Kuramoto Order Parameter

Global coherence is quantified by the magnitude of the complex order parameter $r \in [0, 1]$:

$$r e^{i\psi} = \frac{1}{N} \sum_{j=1}^N e^{i\theta_j}$$

- **$r \to 1.0$**: Rigid crystalline synchronization (all oscillators locked to identical phase)
- **$r \approx 0.75 \sim 0.95$**: Organic breathing swarm (riding the atmospheric wave with natural shimmer)
- **$r \to 0.0$**: Complete anti-synchrony (maximally dispersed checkerboard alternation) or uniform chaos
