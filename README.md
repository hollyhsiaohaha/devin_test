# Todo List

一個用 Node.js + Express + EJS 建立的簡單 Todo List 網站。支援使用者註冊、登入，每個帳號只看得到自己的待辦事項。待辦事項仍儲存在記憶體中（伺服器重啟會清空），使用者帳號則寫入 `data/users.json`（密碼以 bcrypt 雜湊）。

## 功能

- 註冊 / 登入 / 登出（express-session cookie + bcrypt）
- 每個帳號擁有獨立的待辦事項清單
- 新增（支援多行標題）、切換完成狀態、刪除
- 以「全部 / 未完成 / 已完成」篩選
- 一鍵清除所有已完成的項目

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

可透過環境變數設定：

- `PORT`：監聽埠號，預設 `3000`
- `SESSION_SECRET`：session cookie 簽章密鑰。**正式環境請務必設定**，未設定時會使用 `dev-insecure-secret-change-me`。

```bash
PORT=4000 SESSION_SECRET=$(openssl rand -hex 32) npm start
```

## 專案結構

```
.
├── src/
│   ├── app.js          # Express 主程式與路由
│   └── users.js        # 使用者儲存（users.json + bcrypt）
├── views/
│   ├── index.ejs       # 首頁（Todo 列表）
│   ├── login.ejs       # 登入頁
│   ├── register.ejs    # 註冊頁
│   └── 404.ejs         # 404 頁面
├── public/
│   └── styles.css      # 前端樣式
├── data/               # 執行時自動建立；存放 users.json（已被 .gitignore 忽略）
├── package.json
└── README.md
```
