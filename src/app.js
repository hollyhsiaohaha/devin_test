const path = require('path');
const express = require('express');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '..', 'public')));

const todos = [];
let nextId = 1;

function findTodo(id) {
  return todos.find((todo) => todo.id === id);
}

function redirectBack(req, res, fallback = '/todos') {
  res.redirect(req.get('Referrer') || fallback);
}

app.get('/', (req, res) => {
  res.redirect('/todos');
});

app.get('/todos', (req, res) => {
  const filter = req.query.filter || 'all';
  const filtered = todos.filter((todo) => {
    if (filter === 'active') return !todo.done;
    if (filter === 'completed') return todo.done;
    return true;
  });
  res.render('index', {
    todos: filtered,
    filter,
    total: todos.length,
    remaining: todos.filter((t) => !t.done).length,
  });
});

app.post('/todos', (req, res) => {
  const title = (req.body.title || '').trim();
  if (title) {
    todos.push({
      id: nextId++,
      title,
      done: false,
      createdAt: new Date(),
    });
  }
  res.redirect('/todos');
});

app.post('/todos/:id/toggle', (req, res) => {
  const todo = findTodo(Number(req.params.id));
  if (todo) {
    todo.done = !todo.done;
  }
  redirectBack(req, res);
});

app.delete('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = todos.findIndex((todo) => todo.id === id);
  if (index !== -1) {
    todos.splice(index, 1);
  }
  redirectBack(req, res);
});

app.post('/todos/clear-completed', (req, res) => {
  for (let i = todos.length - 1; i >= 0; i -= 1) {
    if (todos[i].done) todos.splice(i, 1);
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
