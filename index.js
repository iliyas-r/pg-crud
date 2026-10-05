const express = require("express");

const pool = require("./db");

const app = express();
const PORT = 3000;

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
