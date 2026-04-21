const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const BCRYPT_ROUNDS = 10;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ nextId: 1, users: [] }, null, 2));
  }
}

function loadAll() {
  ensureStorage();
  const raw = fs.readFileSync(USERS_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.users)) {
    return { nextId: 1, users: [] };
  }
  return parsed;
}

function saveAll(state) {
  ensureStorage();
  fs.writeFileSync(USERS_FILE, JSON.stringify(state, null, 2));
}

function findByUsername(username) {
  const { users } = loadAll();
  const lower = username.toLowerCase();
  return users.find((u) => u.username.toLowerCase() === lower) || null;
}

function findById(id) {
  const { users } = loadAll();
  return users.find((u) => u.id === id) || null;
}

function validateRegistration(username, password) {
  if (!username || !USERNAME_RE.test(username)) {
    return '使用者名稱需為 3–32 個英數字、底線、連字號或點';
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `密碼至少需要 ${MIN_PASSWORD_LENGTH} 個字元`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `密碼長度不得超過 ${MAX_PASSWORD_LENGTH} 個字元`;
  }
  return null;
}

async function createUser(username, password) {
  const err = validateRegistration(username, password);
  if (err) return { error: err };

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const state = loadAll();
  const lower = username.toLowerCase();
  if (state.users.some((u) => u.username.toLowerCase() === lower)) {
    return { error: '此使用者名稱已被註冊' };
  }
  const user = {
    id: state.nextId,
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  state.users.push(user);
  state.nextId += 1;
  saveAll(state);
  return { user };
}

async function verifyCredentials(username, password) {
  const user = findByUsername(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

function publicView(user) {
  if (!user) return null;
  return { id: user.id, username: user.username };
}

module.exports = {
  createUser,
  verifyCredentials,
  findById,
  findByUsername,
  publicView,
};
