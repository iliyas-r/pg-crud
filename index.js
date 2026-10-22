require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Поля пользователя, которые можно отдавать наружу. password_hash сюда не входит.
const PUBLIC_FIELDS = 'id, first_name, last_name, email, created_at';

// Поля, которые разрешено менять через PATCH/PUT.
const EDITABLE_FIELDS = ['first_name', 'last_name', 'email'];

app.use(express.json());
app.use(express.static('public'));

// ---------------------------------------------------------------------------
// Авторизация: проверка JWT из заголовка Authorization: Bearer <token>
// ---------------------------------------------------------------------------
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Требуется токен авторизации' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Токен недействителен или истёк' });
  }
}

// ---------------------------------------------------------------------------
// Валидация
// ---------------------------------------------------------------------------
function validateUser(body) {
  const errors = [];
  const firstName = (body.first_name || '').trim();
  const lastName = (body.last_name || '').trim();
  const email = (body.email || '').trim();

  if (!firstName) errors.push('first_name обязателен');
  if (!lastName) errors.push('last_name обязателен');
  if (!email) errors.push('email обязателен');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email некорректен');

  return errors;
}

// ---------------------------------------------------------------------------
// Служебное
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.send('Сервер работает!');
});

// Все маршруты ниже требуют валидный JWT
app.use('/users', auth);

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
app.get('/users', async (req, res) => {
  try {
    const { search } = req.query;

    let sql = `SELECT ${PUBLIC_FIELDS} FROM public.users`;
    const values = [];

    if (search) {
      sql += ' WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1';
      values.push(`%${search}%`);
    }

    sql += ' ORDER BY id';

    const result = await pool.query(sql, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM public.users WHERE id = $1`,
      [req.params.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/users', async (req, res) => {
  const errors = validateUser(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Некорректные данные', details: errors });
  }

  const { first_name, last_name, email, password } = req.body;

  try {
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const result = await pool.query(
      `INSERT INTO public.users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PUBLIC_FIELDS}`,
      [first_name.trim(), last_name.trim(), email.trim(), passwordHash],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email уже занят' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/users/:id', async (req, res) => {
  const errors = validateUser(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Некорректные данные', details: errors });
  }

  const { first_name, last_name, email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE public.users
          SET first_name = $1, last_name = $2, email = $3
        WHERE id = $4
        RETURNING ${PUBLIC_FIELDS}`,
      [first_name.trim(), last_name.trim(), email.trim(), req.params.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email уже занят' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.patch('/users/:id', async (req, res) => {
  // Собираем SET только из белого списка — нельзя обновить произвольную колонку из тела запроса
  const keys = Object.keys(req.body).filter((key) => EDITABLE_FIELDS.includes(key));

  if (keys.length === 0) {
    return res.status(400).json({ error: 'Нет полей для обновления' });
  }

  if ('email' in req.body && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email || '')) {
    return res.status(400).json({ error: 'email некорректен' });
  }

  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = keys.map((key) => req.body[key]);
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE public.users SET ${setClause} WHERE id = $${values.length} RETURNING ${PUBLIC_FIELDS}`,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email уже занят' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM public.users WHERE id = $1 RETURNING ${PUBLIC_FIELDS}`,
      [req.params.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ message: 'Удалено', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Регистрация и вход
// ---------------------------------------------------------------------------
app.post('/register', async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Пароль минимум 8 символов' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM public.users WHERE lower(email) = lower($1)',
      [email.trim()],
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email уже зарегистрирован' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO public.users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PUBLIC_FIELDS}`,
      [first_name.trim(), last_name.trim(), email.trim(), passwordHash],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email уже зарегистрирован' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM public.users WHERE lower(email) = lower($1)',
      [email.trim()],
    );

    // Одинаковый ответ для «нет такого пользователя» и «неверный пароль» —
    // чтобы нельзя было перебором узнать, какие email зарегистрированы
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Обработчик ошибок (в т.ч. битый JSON в теле запроса)
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
  }

  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
