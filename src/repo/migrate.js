const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LEGACY_USERS_FILE = path.join(DATA_DIR, 'users.json');
const MIGRATED_MARKER = path.join(DATA_DIR, 'users.json.migrated');

/**
 * One-time migration: if `data/users.json` exists and the DB has no users,
 * copy each legacy record into the DB preserving id + created_at, then rename
 * the legacy file so it's never re-imported.
 *
 * Safe to call on every boot — it no-ops once migrated.
 */
function migrateLegacyUsers(repo) {
  if (!fs.existsSync(LEGACY_USERS_FILE)) return { migrated: 0, skipped: true };
  if (repo.users._count() > 0) {
    renameLegacy();
    return { migrated: 0, skipped: true };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(LEGACY_USERS_FILE, 'utf8'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[migrate] users.json is not valid JSON; skipping:', err.message);
    return { migrated: 0, skipped: true };
  }

  const legacyUsers = Array.isArray(parsed && parsed.users) ? parsed.users : [];
  if (legacyUsers.length === 0) {
    renameLegacy();
    return { migrated: 0, skipped: true };
  }

  // SQLite's AUTOINCREMENT bookkeeping is updated automatically when rows are
  // inserted with explicit ids, so we don't need to poke sqlite_sequence.
  const tx = repo._db.transaction((rows) => {
    let inserted = 0;
    for (const u of rows) {
      if (!u || typeof u.id !== 'number' || !u.username || !u.passwordHash) continue;
      repo.users._importWithId(u.id, u.username, u.passwordHash, u.createdAt || new Date().toISOString());
      inserted += 1;
    }
    return inserted;
  });

  const imported = tx(legacyUsers);
  renameLegacy();

  const skippedCount = legacyUsers.length - imported;
  // eslint-disable-next-line no-console
  console.log(
    `[migrate] imported ${imported} user(s) from users.json into DB` +
      (skippedCount > 0 ? ` (skipped ${skippedCount} malformed record(s))` : '')
  );
  return { migrated: imported, skipped: false };
}

function renameLegacy() {
  try {
    fs.renameSync(LEGACY_USERS_FILE, MIGRATED_MARKER);
  } catch (_) {
    // best-effort; ignore
  }
}

module.exports = { migrateLegacyUsers };
