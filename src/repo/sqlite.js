const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = process.env.DATABASE_FILE || path.join(DATA_DIR, 'app.db');

function ensureDir(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(DB_FILE);
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT    NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
`);

function userRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function todoRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    done: Boolean(row.done),
    createdAt: row.created_at,
  };
}

// ---- users --------------------------------------------------------------

const stmts = {
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userByName: db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE'),
  insertUser: db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ),
  insertUserWithId: db.prepare(
    'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
  ),
  countUsers: db.prepare('SELECT COUNT(*) AS n FROM users'),
  maxUserId: db.prepare('SELECT COALESCE(MAX(id), 0) AS max FROM users'),

  todosByUser: db.prepare(
    'SELECT * FROM todos WHERE user_id = ? ORDER BY id ASC'
  ),
  insertTodo: db.prepare(
    'INSERT INTO todos (user_id, title) VALUES (?, ?)'
  ),
  todoById: db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?'),
  toggleTodo: db.prepare(
    'UPDATE todos SET done = CASE done WHEN 0 THEN 1 ELSE 0 END WHERE id = ? AND user_id = ?'
  ),
  deleteTodo: db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?'),
  clearCompleted: db.prepare(
    'DELETE FROM todos WHERE user_id = ? AND done = 1'
  ),
};

const users = {
  findById(id) {
    return userRow(stmts.userById.get(id));
  },
  findByUsername(username) {
    return userRow(stmts.userByName.get(username));
  },
  create({ username, passwordHash }) {
    try {
      const info = stmts.insertUser.run(username, passwordHash);
      return userRow(stmts.userById.get(info.lastInsertRowid));
    } catch (err) {
      if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const e = new Error('duplicate username');
        e.code = 'DUPLICATE_USERNAME';
        throw e;
      }
      throw err;
    }
  },
  // Used once during migration from data/users.json.
  _importWithId(id, username, passwordHash, createdAt) {
    stmts.insertUserWithId.run(id, username, passwordHash, createdAt);
  },
  _count() {
    return stmts.countUsers.get().n;
  },
  _maxId() {
    return stmts.maxUserId.get().max;
  },
};

// ---- todos --------------------------------------------------------------

const todos = {
  listByUserId(userId) {
    return stmts.todosByUser.all(userId).map(todoRow);
  },
  create({ userId, title }) {
    const info = stmts.insertTodo.run(userId, title);
    return todoRow(stmts.todoById.get(info.lastInsertRowid, userId));
  },
  toggle(id, userId) {
    return stmts.toggleTodo.run(id, userId).changes > 0;
  },
  remove(id, userId) {
    return stmts.deleteTodo.run(id, userId).changes > 0;
  },
  clearCompleted(userId) {
    return stmts.clearCompleted.run(userId).changes;
  },
};

function close() {
  db.close();
}

module.exports = { users, todos, close, _db: db };
