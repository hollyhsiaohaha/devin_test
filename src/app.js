const path = require('path');
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');

const users = require('./users');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  session({
    name: 'todo.sid',
    secret: process.env.SESSION_SECRET || 'dev-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? users.publicView(users.findById(req.session.userId))
    : null;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  return next();
}

function requireGuest(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/todos');
  }
  return next();
}

const todos = [];
let nextId = 1;

function findTodo(id, userId) {
  return todos.find((todo) => todo.id === id && todo.userId === userId);
}

function redirectBack(req, res, fallback = '/todos') {
  res.redirect(req.get('Referrer') || fallback);
}

app.get('/', (req, res) => {
  res.redirect(req.session.userId ? '/todos' : '/login');
});

app.get('/register', requireGuest, (req, res) => {
  res.render('register', { error: null, values: { username: '' } });
});

app.post('/register', requireGuest, async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const { user, error } = await users.createUser(username, password);
  if (error) {
    return res.status(400).render('register', {
      error,
      values: { username },
    });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error');
    req.session.userId = user.id;
    return res.redirect('/todos');
  });
});

app.get('/login', requireGuest, (req, res) => {
  res.render('login', { error: null, values: { username: '' } });
});

app.post('/login', requireGuest, async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const user = await users.verifyCredentials(username, password);
  if (!user) {
    return res.status(401).render('login', {
      error: '使用者名稱或密碼錯誤',
      values: { username },
    });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error');
    req.session.userId = user.id;
    return res.redirect('/todos');
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('todo.sid');
    res.redirect('/login');
  });
});

app.get('/todos', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const mine = todos.filter((t) => t.userId === userId);
  const filter = req.query.filter || 'all';
  const filtered = mine.filter((todo) => {
    if (filter === 'active') return !todo.done;
    if (filter === 'completed') return todo.done;
    return true;
  });
  res.render('index', {
    todos: filtered,
    filter,
    total: mine.length,
    remaining: mine.filter((t) => !t.done).length,
  });
});

app.post('/todos', requireAuth, (req, res) => {
  const title = (req.body.title || '').trim();
  if (title) {
    todos.push({
      id: nextId++,
      userId: req.session.userId,
      title,
      done: false,
      createdAt: new Date(),
    });
  }
  res.redirect('/todos');
});

app.post('/todos/:id/toggle', requireAuth, (req, res) => {
  const todo = findTodo(Number(req.params.id), req.session.userId);
  if (todo) {
    todo.done = !todo.done;
  }
  redirectBack(req, res);
});

app.delete('/todos/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId;
  const index = todos.findIndex((t) => t.id === id && t.userId === userId);
  if (index !== -1) {
    todos.splice(index, 1);
  }
  redirectBack(req, res);
});

app.post('/todos/clear-completed', requireAuth, (req, res) => {
  const userId = req.session.userId;
  for (let i = todos.length - 1; i >= 0; i -= 1) {
    if (todos[i].userId === userId && todos[i].done) {
      todos.splice(i, 1);
    }
  }
  redirectBack(req, res);
});

app.use((req, res) => {
  res.status(404).render('404');
});

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Todo List app listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
