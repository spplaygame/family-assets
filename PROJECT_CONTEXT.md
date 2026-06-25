# Family Assets 專案交接紀錄
更新日期：2026-06-25

## 這份文件用途

這份文件是給下一個 Codex / AI 視窗接手用的專案記憶。新視窗請先讀：

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `git status --short`
4. 最近幾筆 commit

不要只靠聊天記憶，因為聊天上下文會壓縮或遺失。

---

## 重要安全提醒

使用者曾經在對話中貼過 GitHub Personal Access Token。這件事之後要持續提醒：

- 不要再要求使用者把 token 貼到聊天裡。
- 如果 GitHub 上的舊 token `family-assets-deploy` 尚未撤銷，請提醒使用者撤銷。
- 本機曾檢查並清除 `.git-credentials` 明文憑證。
- Git credential helper 已改用 Git Credential Manager。
- 之後 push 應使用安全登入流程，不要明文儲存 token。

---

## 已完成並已推送的重要 commit

目前已完成並推送過的主要工作：

- `64846b6`：修復 10 個資產邏輯問題。
- `c1db565`：修復標的今日損益，包含同 ticker 共用報價、啟動自動更新、prevClose 不再用現價回填。
- `89240ea`：補上基金 / 加密貨幣 / 黃金手續費欄位，並修正圓餅圖同資產重複顯示與中文名稱。
- `67b9f78`：新增配息 / 利息紀錄功能。
- `3fc208e`：新增已實現損益 / 賣出持倉功能。
- `aca5558`：新增較真實的歷史市值曲線邏輯。
- `5c92016`：新增專案交接與安全移轉文件。

---

## 使用者已確認的產品方向

### 遊戲化核心概念

使用者決定用「島嶼 + 怪獸 / 居民培養」作為資產紀錄的遊戲化主題。

目前共識：

- 島嶼代表目前財務狀態。
- 怪獸 / 居民代表里程碑、習慣、重要事件。
- 不要只用資產規模決定等級，避免一開始輸入大量歷史資產就直接跳到最高等。
- 里程碑可以有：個人、家庭總資產、淨資產、資產多元化、配息 / 利息、持續紀錄、財務目標等。
- 負債里程碑簡化，只做紀念型或鼓勵型，例如還款過半、清償，不作為主要養成壓力來源。

### 初始建檔 / 島嶼前傳

使用者已同意以下規則：

1. 初次使用時可以輸入過去資產、負債、交易、配息等歷史資料。
2. 初始建檔期間不重複播放解鎖動畫，也不把舊資料當成每日連續紀錄。
3. 使用者手動按「完成初始建檔」後，系統才建立 baseline。
4. 完成初始建檔後，如果補輸入更早的歷史資料，不自動重播全部動畫，只提示「島史新增片段」，可讓使用者手動觀看。
5. 更正舊資料不應刪除已獲得成就，除非未來特別設計重算機制。

### 帳戶與名稱注意事項

目前 app 內部仍有 `me`、`wife`、`family` 等概念，但未來使用者名稱可以自訂，例如可以叫「多拉A夢」。

未來規劃：

- 免費版：一個個人帳戶，可自由命名 + 一個總資產視圖。
- 其他個人帳戶可能作為付費解鎖。
- 程式設計上不要把顯示名稱當成固定 ID。
- 遊戲資料應盡量使用穩定 ID / scope，不要硬綁「我 / 太太」文字。

---

## 目前工作狀態

目前本機工作區有未提交修改：

- `app.js` 已加入初始建檔 / 島嶼前傳資料地基，並完成表單資料接線。
- `index.html` 已加入首頁初始建檔卡片容器、現金開始持有日期、負債開始日期欄位。
- `style.css` 已加入初始建檔卡片樣式。
- `.claude/` 是未追蹤資料夾，不要加入 git。

下一個視窗請先執行檢查：

```powershell
git status --short
git diff --stat
git diff -- app.js
rg -n "game-setup-card|f-cash-date|d-start-date|APP_SCHEMA_VERSION|gameState|completeInitialSetup" app.js index.html style.css
```

---

## app.js 目前已嘗試加入的資料地基

目前 `app.js` 已經開始加入「初始建檔 / 島嶼前傳」資料地基，內容大致包含：

- `APP_SCHEMA_VERSION = 2`
- `makeId(prefix)`：產生穩定 ID。
- `createDefaultGameState()`：建立遊戲狀態。
- `let gameState = createDefaultGameState()`
- `eventDate(value)`：統一事件日期。
- `ensureDataSchema()`：替既有 assets / debts / dividends / transactions 補：
  - `id`
  - `effectiveDate`
  - `recordedAt`
  - 非現金 / 非不動產資產的 `sharesRemaining`
- `collectFinancialEvents()`：從資產、負債、配息、交易整理事件列表。
- `syncGameHistoryEvents()`：把事件分成：
  - `initial_archive`
  - `backfill`
  - `live`
- `unlockAchievement(...)`
- `saveData()` 已開始儲存：
  - `family_game_state`
  - `family_schema_version`
- `loadData()` 已開始讀取 `family_game_state` 並執行 schema 補齊。
- `getScopeMetrics(scope)`
- `completeInitialSetup()`
- `renderGameSetupCard()`
- `renderAll()` 已嘗試呼叫 `renderGameSetupCard()`。

`index.html` 已加入 `game-setup-card` 容器，`renderGameSetupCard()` 會在首頁顯示初始建檔或島史新增片段狀態。

---

## 本輪已補完的項目

- 首頁 profile bar 下方加入 `game-setup-card`，初始建檔期間會顯示目前整理到的事件數與最早日期。
- 現金資產表單加入 `f-cash-date`，用作現金資產的 `buyDate` / `effectiveDate`。
- 負債 modal 加入 `d-start-date`，新增與編輯皆會保存 `startDate` / `effectiveDate`。
- 新增 / 編輯資產時會保留既有 `id`、`recordedAt`，避免更正資料時被當成全新事件。
- 非現金 / 非不動產資產保留 `sharesRemaining` 給 FIFO 賣出使用。
- 賣出交易與配息紀錄補上穩定 ID、`effectiveDate`、`recordedAt`；配息再投入建立的新持倉也補上 ID 與日期欄位。

### 4. 驗證

完成後檢查：

```powershell
git diff --stat
git diff -- app.js index.html style.css
```

如果本機有 Node 可用，再做：

```powershell
node --check app.js
```

目前這台環境 shell 找不到 `node`，已改用內建 JavaScript parser 驗證 `app.js` 語法通過。

### 5. commit / push

建議 commit 訊息：

```text
建立初始建檔與島嶼前傳資料地基
```

push 到 main。

---

## 對使用者的溝通方式

使用者偏好繁體中文、自然、溫暖、不要太硬的工程話術。可以把技術內容翻成產品語言。

如果要講目前狀態，可以說：

「我已經開始把遊戲化的第一層資料地基放進去，但目前停在只讀權限，還不能把首頁卡片和樣式補完。新視窗接手時先讀 `PROJECT_CONTEXT.md`，再看 `git diff`，就能接著做。」

---

## 下一個視窗第一句建議

如果使用者在新視窗說「繼續」，請直接：

1. 讀 `PROJECT_CONTEXT.md`。
2. 看 `git status` / `git diff`。
3. 如果有寫入權限，補完上述三個檔案。
4. commit 並 push。

不要重新討論整個遊戲化方向，除非使用者要求。
