const bcrypt = require('bcryptjs');
const repo = require('./repo');

const BCRYPT_ROUNDS = 10;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

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

  try {
    const user = repo.users.create({ username, passwordHash });
    return { user };
  } catch (e) {
    if (e && e.code === 'DUPLICATE_USERNAME') {
      return { error: '此使用者名稱已被註冊' };
    }
    throw e;
  }
}

async function verifyCredentials(username, password) {
  const user = repo.users.findByUsername(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

function findById(id) {
  return repo.users.findById(id);
}

function findByUsername(username) {
  return repo.users.findByUsername(username);
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
