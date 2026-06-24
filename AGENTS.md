# 專案協作規則

開始任何工作前，先完整閱讀 `PROJECT_CONTEXT.md`，並以目前程式碼與 Git 紀錄核對文件內容。

## 安全規則（最高優先）

- 絕對不可要求使用者在聊天、程式碼、commit、issue 或文件中貼出密碼、API Key、GitHub Personal Access Token、憑證或其他秘密。
- 若任何秘密曾出現在聊天或明文檔案中，一律視為已外洩；立即提醒使用者到服務端撤銷並重新產生，不能只刪除聊天或檔案。
- GitHub 憑證使用 Git Credential Manager、GitHub CLI 或作業系統安全憑證庫，不使用明文 `.git-credentials`。
- 不可把秘密寫入專案、localStorage、前端 JavaScript 或 Git 歷史。
- 專案搬移、交接、公開、上架或建立新環境時，必須主動執行 `PROJECT_CONTEXT.md` 的安全移轉檢查清單。

## 工作規則

- 程式修改後應做適度驗證，再統一 commit。
- push 前先確認沒有秘密、個人資料或不應公開的檔案。
- 使用繁體中文向使用者說明修改內容。
- 不將帳戶名稱當作識別碼；帳戶、資產、負債、交易、成就與怪獸皆使用穩定 ID。

