const express = require('express');
const pool = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());

// Главная проверочная страница
app.get('/', (req, res) => {
  res.send('API пользователей работает с PostgreSQL');
});

// Создание пользователя
app.post('/api/users', async (req, res) => {
  try {
    const { first_name, last_name, age } = req.body;

    if (!first_name || !last_name || age === undefined) {
      return res.status(400).json({
        message: 'Нужно указать first_name, last_name и age'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO users (first_name, last_name, age)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [first_name, last_name, age]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при создании пользователя',
      error: error.message
    });
  }
});

// Получение всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users ORDER BY id ASC'
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при получении пользователей',
      error: error.message
    });
  }
});

// Получение одного пользователя по id
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Пользователь не найден'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при получении пользователя',
      error: error.message
    });
  }
});

// Обновление пользователя
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, age } = req.body;

    const oldUser = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (oldUser.rows.length === 0) {
      return res.status(404).json({
        message: 'Пользователь не найден'
      });
    }

    const user = oldUser.rows[0];

    const newFirstName = first_name !== undefined ? first_name : user.first_name;
    const newLastName = last_name !== undefined ? last_name : user.last_name;
    const newAge = age !== undefined ? age : user.age;

    const result = await pool.query(
      `
      UPDATE users
      SET first_name = $1,
          last_name = $2,
          age = $3
      WHERE id = $4
      RETURNING *
      `,
      [newFirstName, newLastName, newAge, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при обновлении пользователя',
      error: error.message
    });
  }
});

// Удаление пользователя
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Пользователь не найден'
      });
    }

    res.json({
      message: 'Пользователь удален',
      deletedUser: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при удалении пользователя',
      error: error.message
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});