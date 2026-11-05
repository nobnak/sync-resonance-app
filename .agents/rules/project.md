---
description: SynchroEcho (ホタル同期・カエル反同期 音響数理Webアプリ) の開発コンテキストと方針
globs: *
---

# プロジェクト概要: SynchroEcho

ホタルの同期（同相引込み：引力 $K > 0$）とカエルの反同期（逆相排他：斥力 $K < 0$）を、単なるシミュレーションの提示にとどめず、音楽的・視覚的に美しいアート作品として体験できる Web アプリケーション。

## 背景と美学的設計意図
- **ホタル（引力型）**:
  - 非同期時（散乱期）：ペンタトニック／リディアン調のアンビエントな和音の雲。
  - 同期時（秩序期）：全エージェントが 1 拍に凝縮され、壮大なユニゾンコード（フォルテッシモ）として Drop / カタルシスを生む。
- **カエル（斥力型）**:
  - 非同期時：鳴き声同士が衝突しマスキング（雑音）。
  - 反同期時：各個体が衝突を避けて等間隔に位相をずらし、緻密なインターロッキング・ポリリズム（ガムランのコトカン調の輪唱）を形成。
- **音響エンジン**:
  - Web Audio API によるプロシージャル合成（ホタル＝倍音豊かなベル/ローズ、カエル＝減衰ウッドブロック/水滴）。
  - 各個体の $X$ 座標に連動したステレオパンニング。
- **数理モデル**:
  - 空間距離減衰カーネルを持つ蔵本モデル（Coupled Oscillator / Kuramoto Model with Spatial Metric）。

## 技術スタック
- Pure HTML5 / CSS3 / ES6 Vanilla JS（Zero Dependencies）
- Web Audio API（AudioContext, DynamicsCompressor, Convolver Reverb, BiquadFilter, StereoPanner）
- HTML5 Canvas 2D（加算合成ブルーム、水面リップル、排他力場リンク）
- GitHub Pages 完全対応（静的ホスティング）
