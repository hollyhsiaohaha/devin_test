/**
 * Storage abstraction.
 *
 * The app code only depends on the shape exported here; swapping in a new
 * backend (Postgres, MySQL, …) means adding a new driver module that exports
 * the same { users, todos, close } interface and wiring it in below.
 *
 * Driver contract:
 *   users.findById(id)                        -> User | null
 *   users.findByUsername(username)            -> User | null   (case-insensitive)
 *   users.create({ username, passwordHash })  -> User          (throws on duplicate)
 *
 *   todos.listByUserId(userId)                -> Todo[]        (oldest first)
 *   todos.create({ userId, title })           -> Todo
 *   todos.toggle(id, userId)                  -> boolean       (true if a row changed)
 *   todos.remove(id, userId)                  -> boolean
 *   todos.clearCompleted(userId)              -> number        (rows deleted)
 *
 *   close()                                   -> void
 *
 * Shape of User:  { id, username, passwordHash, createdAt }
 * Shape of Todo:  { id, userId, title, done, createdAt }
 */

const driverName = (process.env.DB_DRIVER || 'sqlite').toLowerCase();

let driver;
switch (driverName) {
  case 'sqlite':
    // eslint-disable-next-line global-require
    driver = require('./sqlite');
    break;
  default:
    throw new Error(`Unknown DB_DRIVER "${driverName}". Supported: sqlite.`);
}

module.exports = driver;
