# 🎮 MiniGame Hub

免費線上小遊戲網站。**免下載、免註冊、完全免費**,打開瀏覽器就能玩。純前端(HTML / CSS / 原生 JavaScript),無框架、無建置步驟,靠 Google AdSense 廣告維運。

## 遊戲

| 遊戲 | 說明 |
|------|------|
| [2048](2048.html) | 合併相同數字,朝 2048 前進 |
| [貪吃蛇](snake.html) | 吃食物變長,別撞牆或自己 |
| [跳躍鳥](flappy.html) | 點一下飛一下,躲過水管 |
| [記憶翻牌](memory.html) | 翻牌找出相同配對,步數越少越好 |

每款遊戲都支援鍵盤、觸控滑動,行動裝置還提供螢幕方向鍵;最高分存在 `localStorage`,不會上傳任何資料。

## 執行

只需 Node.js(用於本地靜態伺服器;純靜態網站也可直接用任意靜態伺服器或 `file://` 開啟)。

```bash
npm start
# 或
node server.js
```

然後開啟 <http://localhost:8099>。

## 測試

```bash
npm test
```

跑 2048 的核心邏輯 fuzz 測試:5 萬個隨機棋盤,驗證無格子/ID 碰撞、永遠緊湊靠齊、合併後總值守恆,外加幾組已知的合併結果。

## 啟用 AdSense

廣告整合在 [js/ads.js](js/ads.js),採「先佔位、核准後升級」:

1. 申請 AdSense: <https://adsense.google.com/start>
2. 核准後取得 publisher id(形如 `ca-pub-1234567890`)
3. 把 id 貼到 `js/ads.js` 頂部的 `PUBLISHER_ID`
4. (可選)在 HTML 的 `.ad-slot` 上設定 `data-ad-slot="..."` 指定個別廣告單位

在 `PUBLISHER_ID` 設定前,每個廣告位會顯示「核准後自動顯示」的佔位框,版面不變形、沒有假廣告。

## 目錄結構

```
├── index.html        # 主頁
├── 2048.html         # 遊戲
├── snake.html
├── flappy.html
├── memory.html
├── privacy.html      # 隱私權政策
├── css/style.css     # 全站樣式(深色街机主題)
├── js/ads.js         # AdSense 載入器
├── server.js         # 本地靜態伺服器
├── favicon.svg       # 網站圖示
├── _test2048.js      # 2048 邏輯 fuzz 測試
└── package.json
```
