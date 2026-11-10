# DReAmD
tHiS gAmE Is VErY sAfE.:::)))

ホラードリームコア系の一人称探索ゲーム（ブラウザで動作・PC/スマホ対応）。

▶ **プレイ**：https://dreamd-game.netlify.app

## 遊び方
- **PC**：クリックで開始 → `W A S D` で移動、マウスで視点、`Esc` で一時停止
- **スマホ**：タップで開始 → 画面左側を親指でドラッグして移動、右側をドラッグで視点
- ヘッドホン推奨

## ローカルで動かす
ES Modules を使っているため、`index.html` を直接開くのではなくローカルサーバー経由で開いてください。

```bash
python3 -m http.server 8000
```

その後 http://localhost:8000 を開きます。GitHub Pages などの静的ホスティングにもそのまま置けます。

## 構成
- `index.html` … 画面・UI・スタイル
- `js/main.js` … 描画ループ、ポストエフェクト、移動・衝突判定、エリア遷移（バージョン表記もここ）
- `js/zones.js` … 各エリア（プール／キノコの庭／草原／廊下）
- `js/textures.js` … キャンバスで生成するテクスチャ
- `js/audio.js` … Web Audio による環境音・効果音
- `js/ui.js` … メッセージ表示（崩れた大文字小文字）
- `js/controls.js` … キーボード・マウス・タッチ操作
- `vendor/three.module.min.js` … three.js r170（MIT License）

デバッグ用：`?zone=0〜3` を URL に付けるとそのエリアから開始します。

更新履歴は [CHANGELOG.md](CHANGELOG.md) を参照。
