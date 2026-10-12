require('dotenv').config();

const express = require("express");

const pool = require("./db");

const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Сервер работает!");
});

app.get('/users', (req, res) => {
  const { search } = req.query;

  let sql = 'SELECT id, first_name, last_name, email FROM public.users1';
  let values = [];

  if (search) {
    sql += ' WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1';
    values.push(`%${search}%`);
  }

  sql += ' ORDER BY id';

  pool.query(sql, values)
    .then(result => {
      res.json(result.rows);
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

app.get("/users/:id", (req, res) => {
  const { id } = req.params;

  pool
    .query(
      "SELECT id, first_name, last_name, email FROM public.users1 WHERE id = $1",
      [id],
    )
    .then((result) => {
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }
      res.json(result.rows[0]);
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

app.post("/users", (req, res) => {
  const { first_name, last_name, email } = req.body;

  pool
    .query(
      "INSERT INTO public.users1 (first_name, last_name, email) VALUES ($1, $2, $3) RETURNING *",
      [first_name, last_name, email],
    )
    .then((result) => {
      res.status(201).json(result.rows[0]);
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

app.post('/register', async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Пароль минимум 8 символов' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM public.users WHERE email = $1',
      [email]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email уже зарегистрирован' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO public.users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, first_name, last_name, email, created_at',
      [first_name, last_name, email, password_hash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
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
      'SELECT id, email, password_hash FROM public.users WHERE email = $1',
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email } = req.body;

  pool
    .query(
      "UPDATE public.users1 SET first_name = $1, last_name = $2, email = $3 WHERE id = $4 RETURNING *",
      [first_name, last_name, email, id],
    )
    .then((result) => {
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }
      res.json(result.rows[0]);
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

app.delete("/users/:id", (req, res) => {
  const { id } = req.params;

  pool
    .query("DELETE FROM public.users1 WHERE id = $1 RETURNING *", [id])
    .then((result) => {
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }
      res.json({ message: "Удалено", user: result.rows[0] });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

app.patch("/users/:id", (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  const allowed = ["first_name", "last_name", "email"];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));

  if (keys.length === 0) {
    return res.status(400).json({ error: "Нет полей для обновления" });
  }

  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const values = keys.map((key) => fields[key]);
  values.push(id);

  const sql = `UPDATE public.users1 SET ${setClause} WHERE id = $${values.length} RETURNING *`;

  pool
    .query(sql, values)
    .then((result) => {
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }
      res.json(result.rows[0]);
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
