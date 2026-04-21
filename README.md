# Todo List

一個用 Node.js + Express + EJS 建立的簡單 Todo List 網站。資料儲存在記憶體中，伺服器重啟後會清空。

## 功能

- 新增待辦事項
- 切換完成狀態
- 刪除待辦事項
- 以「全部 / 未完成 / 已完成」篩選
- 一鍵清除所有已完成的項目

## 執行方式

需要 Node.js 18 以上版本。

```bash
npm install
npm start
```

啟動後開啟 <http://localhost:3000>。

開發模式（檔案變更自動重啟）：

```bash
npm run dev
```

可透過環境變數 `PORT` 修改監聽埠號：

```bash
PORT=4000 npm start
```

## 專案結構

```
.
├── src/
│   └── app.js          # Express 主程式與路由
├── views/
│   ├── index.ejs       # 首頁（Todo 列表）
│   └── 404.ejs         # 404 頁面
├── public/
│   └── styles.css      # 前端樣式
├── package.json
└── README.md
```
