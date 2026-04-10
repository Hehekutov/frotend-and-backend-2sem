const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const cors = require('cors');

let socketIo;
let webpush;

try {
  socketIo = require('socket.io');
  webpush = require('web-push');
} catch (error) {
  console.error('Не хватает зависимостей для практики 16.');
  console.error('Установите: npm install socket.io web-push');
  throw error;
}

const app = express();
const rootDir = __dirname;
const httpPort = Number(process.env.PORT || 3001);
const httpsPort = Number(process.env.HTTPS_PORT || 3443);
const certPath = path.join(rootDir, 'localhost.pem');
const keyPath = path.join(rootDir, 'localhost-key.pem');
const vapidConfigPath = path.join(rootDir, 'vapid-keys.json');

const subscriptions = new Map();
const socketServers = [];
const reminders = new Map();
let vapidKeys = null;

if (fs.existsSync(vapidConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(vapidConfigPath, 'utf8'));
    if (config.publicKey && config.privateKey) {
      vapidKeys = {
        publicKey: config.publicKey,
        privateKey: config.privateKey
      };
    }
  } catch (error) {
    console.error('Не удалось прочитать vapid-keys.json:', error.message);
  }
}

if (!vapidKeys) {
  console.error('Файл vapid-keys.json не найден или заполнен неверно.');
  console.error('Заполни publicKey и privateKey вручную и перезапусти сервер.');
  process.exit(1);
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:student@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

app.use(cors());
app.use(express.json());
app.use(express.static(rootDir));

app.get('/config', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/subscribe', (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ message: 'Некорректная подписка' });
    return;
  }

  subscriptions.set(subscription.endpoint, subscription);
  res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) {
    subscriptions.delete(endpoint);
  }
  res.json({ message: 'Подписка удалена' });
});

app.post('/snooze', (req, res) => {
  const reminderId = String(req.query.reminderId || '');

  if (!reminderId || !reminders.has(reminderId)) {
    res.status(404).json({ error: 'Reminder not found' });
    return;
  }

  const reminder = reminders.get(reminderId);
  clearTimeout(reminder.timeoutId);

  const newDelay = 5 * 60 * 1000;
  const timeoutId = setTimeout(() => {
    const payload = JSON.stringify({
      title: 'Напоминание отложено',
      body: reminder.text,
      reminderId
    });

    subscriptions.forEach(async subscription => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        console.error('Push error:', error.message);
        subscriptions.delete(subscription.endpoint);
      }
    });

    reminders.delete(reminderId);
  }, newDelay);

  reminders.set(reminderId, {
    timeoutId,
    text: reminder.text,
    reminder: Date.now() + newDelay
  });

  res.json({ message: 'Reminder snoozed for 5 minutes' });
});

function broadcastTask(task, sourceSocketId) {
  const payload = {
    ...task,
    sourceSocketId
  };

  socketServers.forEach(io => io.emit('taskAdded', payload));
}

function sendPushToSubscribers(task) {
  const payload = JSON.stringify({
    title: 'Новая задача',
    body: task.text
  });

  subscriptions.forEach(async subscription => {
    try {
      await webpush.sendNotification(subscription, payload);
    } catch (error) {
      console.error('Push error:', error.message);
      subscriptions.delete(subscription.endpoint);
    }
  });
}

function scheduleReminder(reminder) {
  const reminderId = String(reminder.id);
  const reminderTime = Number(reminder.reminder);
  const delay = reminderTime - Date.now();

  if (!Number.isFinite(reminderTime) || delay <= 0) {
    return false;
  }

  if (reminders.has(reminderId)) {
    clearTimeout(reminders.get(reminderId).timeoutId);
  }

  const timeoutId = setTimeout(() => {
    const payload = JSON.stringify({
      title: 'Напоминание',
      body: reminder.text,
      reminderId
    });

    subscriptions.forEach(async subscription => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        console.error('Push error:', error.message);
        subscriptions.delete(subscription.endpoint);
      }
    });

    reminders.delete(reminderId);
  }, delay);

  reminders.set(reminderId, {
    timeoutId,
    text: reminder.text,
    reminder: reminderTime
  });

  return true;
}

function attachRealtime(server, label) {
  const io = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  socketServers.push(io);

  io.on('connection', socket => {
    console.log(`[${label}] Клиент подключён:`, socket.id);

    socket.on('newTask', task => {
      if (!task || !task.text) {
        return;
      }

      const normalizedTask = {
        id: task.id || String(Date.now()),
        text: String(task.text).slice(0, 300),
        createdAt: task.createdAt || new Date().toISOString()
      };

      broadcastTask(normalizedTask, socket.id);
      sendPushToSubscribers(normalizedTask);
    });

    socket.on('newReminder', reminder => {
      if (!reminder || !reminder.text || !reminder.id) {
        return;
      }

      const normalizedReminder = {
        id: String(reminder.id),
        text: String(reminder.text).slice(0, 300),
        createdAt: reminder.createdAt || new Date().toISOString(),
        reminder: Number(reminder.reminder)
      };

      if (!scheduleReminder(normalizedReminder)) {
        return;
      }

      broadcastTask(normalizedReminder, socket.id);
    });

    socket.on('disconnect', () => {
      console.log(`[${label}] Клиент отключён:`, socket.id);
    });
  });
}

function startServerWithFallback(server, preferredPort, label, hostLabel) {
  const tryListen = port => {
    server.once('error', error => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`${label} порт ${port} уже занят. Пробую порт ${port + 1}...`);
        tryListen(port + 1);
        return;
      }

      console.error(`${label} сервер не запустился:`, error.message);
    });

    server.once('listening', () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      console.log(`${label} сервер запущен: ${hostLabel}://localhost:${actualPort}`);
    });

    server.listen(port);
  };

  tryListen(preferredPort);
}

const httpServer = http.createServer(app);
attachRealtime(httpServer, 'HTTP');
startServerWithFallback(httpServer, httpPort, 'HTTP', 'http');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsServer = https.createServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    },
    app
  );

  attachRealtime(httpsServer, 'HTTPS');
  startServerWithFallback(httpsServer, httpsPort, 'HTTPS', 'https');
} else {
  console.log('Сертификаты localhost.pem и localhost-key.pem не найдены.');
  console.log('Это не мешает запуску по HTTP. Для практики 15 добавьте сертификаты в папку prac13-14, если нужен HTTPS.');
}
