# Todo List

一個用 Node.js + Express + EJS 建立的簡單 Todo List 網站。支援使用者註冊、登入，每個帳號只看得到自己的待辦事項。使用者與待辦事項皆永久儲存於 SQLite 資料庫（`data/app.db`），伺服器重啟不會遺失資料；密碼以 bcrypt 雜湊存放。

## 功能

- 註冊 / 登入 / 登出（express-session cookie + bcrypt）
- 每個帳號擁有獨立的待辦事項清單
- 新增（支援多行標題）、切換完成狀態、刪除
- 以「全部 / 未完成 / 已完成」篩選
- 一鍵清除所有已完成的項目
- **資料永久儲存於 SQLite**（`data/app.db`）；儲存層抽象成 repository 介面，未來可換成其他資料庫

## 執行方式

需要 Node.js 18 以上版本。

```bash
npm install
npm start
```

啟動後開啟 <http://localhost:3000>，首次進入會被導向 `/login`；可以點「註冊新帳號」建立第一個使用者。

開發模式（檔案變更自動重啟）：

```bash
npm run dev
```

## 環境變數

- `PORT`：監聽埠號，預設 `3000`
- `SESSION_SECRET`：session cookie 簽章密鑰。**正式環境請務必設定**，未設定時會使用 `dev-insecure-secret-change-me`
- `DB_DRIVER`：儲存後端，預設 `sqlite`（目前唯一支援的選項，未來可擴充）
- `DATABASE_FILE`：SQLite 檔案位置，預設 `data/app.db`

```bash
PORT=4000 SESSION_SECRET=$(openssl rand -hex 32) npm start
```

## 舊版 `users.json` 自動遷移

若 `data/users.json` 仍存在（舊版的使用者儲存格式），伺服器第一次啟動時會自動把所有使用者搬進 SQLite，保留原本的 `id` 與 `createdAt`；成功後會把原檔改名為 `users.json.migrated` 避免重複匯入。

## 專案結構

```
.
├── src/
│   ├── app.js          # Express 主程式與路由
│   ├── users.js        # 使用者邏輯（驗證 + bcrypt，呼叫 repo）
│   └── repo/
│       ├── index.js    # 儲存層 factory（依 DB_DRIVER 選擇 driver）
│       ├── sqlite.js   # SQLite driver（better-sqlite3）
│       └── migrate.js  # 從 users.json 一次性遷移到 DB
├── views/
│   ├── index.ejs       # 首頁（Todo 列表）
│   ├── login.ejs       # 登入頁
│   ├── register.ejs    # 註冊頁
│   └── 404.ejs         # 404 頁面
├── public/
│   └── styles.css      # 前端樣式
├── data/               # 執行時自動建立；存放 app.db（已被 .gitignore 忽略）
├── package.json
└── README.md
```

## 擴充到其他資料庫

`src/repo/index.js` 透過 `DB_DRIVER` 選擇 driver。新增一個 driver 只需要實作同樣的介面並在 `index.js` 註冊：

```js
{
  users: { findById, findByUsername, create({ username, passwordHash }) },
  todos: { listByUserId, create({ userId, title }), toggle(id, userId),
           remove(id, userId), clearCompleted(userId) },
  close(),
}
```

應用層（`src/app.js`、`src/users.js`）不依賴 SQLite，換 driver 不需要動它們。
