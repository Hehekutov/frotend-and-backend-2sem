const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = 3001;

app.use(express.json());

// Подключение к MongoDB.
mongoose
  .connect('mongodb://localhost:27017/prac20')
  .then(() => {
    console.log('Подключение к MongoDB выполнено');
  })
  .catch((error) => {
    console.error('Ошибка подключения к MongoDB:', error.message);
  });

const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    default: 0
  }
});

const Counter = mongoose.model('Counter', counterSchema);

// Схема пользователя
const userSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true
  },
  first_name: {
    type: String,
    required: true
  },
  last_name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Модель User работает с коллекцией users в MongoDB
const User = mongoose.model('User', userSchema);

// Получаем следующий id для нового пользователя
async function getNextId() {
  const counter = await Counter.findOneAndUpdate(
    { name: 'user_id' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return counter.value;
}

// Проверка, что сервер работает
app.get('/', (req, res) => {
  res.send('Практика 20. API пользователей с MongoDB работает');
});

// CREATE — создать пользователя
app.post('/api/users', async (req, res) => {
  try {
    const { first_name, last_name, age } = req.body;

    if (!first_name || !last_name || age === undefined) {
      return res.status(400).json({
        message: 'Нужно указать first_name, last_name и age'
      });
    }

    const nextId = await getNextId();

    const user = new User({
      id: nextId,
      first_name,
      last_name,
      age
    });

    await user.save();

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при создании пользователя',
      error: error.message
    });
  }
});

// READ — получить всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ id: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при получении пользователей',
      error: error.message
    });
  }
});

// READ — получить одного пользователя по id
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      id: Number(req.params.id)
    });

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден'
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при получении пользователя',
      error: error.message
    });
  }
});

// UPDATE — обновить пользователя
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { first_name, last_name, age } = req.body;

    const updateData = {
      updated_at: new Date()
    };

    if (first_name !== undefined) {
      updateData.first_name = first_name;
    }

    if (last_name !== undefined) {
      updateData.last_name = last_name;
    }

    if (age !== undefined) {
      updateData.age = age;
    }

    const user = await User.findOneAndUpdate(
      { id: Number(req.params.id) },
      updateData,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден'
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при обновлении пользователя',
      error: error.message
    });
  }
});

// DELETE — удалить пользователя.
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({
      id: Number(req.params.id)
    });

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден'
      });
    }

    res.json({
      message: 'Пользователь удален',
      deletedUser: user
    });
  } catch (error) {
    res.status(500).json({
      message: 'Ошибка при удалении пользователя',
      error: error.message
    });
  }
});

// Запуск сервера.
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});