function $(id) {
  return document.getElementById(id);
}

const STORAGE_KEY = 'notes-app-shell-v3';
const MAX_CHARS = 300;

const contentDiv = $('app-content');
const homeBtn = $('home-btn');
const aboutBtn = $('about-btn');
const enablePushBtn = $('enable-push');
const disablePushBtn = $('disable-push');
const networkStatus = $('network-status');
const secureStatus = $('secure-status');

const socket = typeof io === 'function' ? io() : null;

let currentPage = 'home';
let vapidPublicKey = '';

function showToast(message, duration = 2600) {
  const toast = $('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function normalizeReminder(value) {
  if (!value) {
    return null;
  }

  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach(button => {
    button.classList.toggle('is-active', button.id === activeId);
  });
}

function renderNotes() {
  const list = $('notes-list');
  const count = $('notes-count');
  const empty = $('notes-empty');
  const searchInput = $('search-input');

  if (!list || !count || !empty) {
    return;
  }

  const notes = loadNotes();
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const visibleNotes = notes.filter(note => note.text.toLowerCase().includes(query));

  count.textContent = query ? `${visibleNotes.length} из ${notes.length}` : `${notes.length} шт.`;

  if (!visibleNotes.length) {
    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent = query ? 'По запросу ничего не найдено.' : 'Заметок пока нет. Добавьте первую запись.';
    return;
  }

  empty.hidden = true;
  list.innerHTML = visibleNotes.map(note => `
    <li class="note-card">
      <div>
        <p class="note-text">${escapeHtml(note.text)}</p>
        <span class="note-date">${formatDate(note.createdAt)}</span>
        ${note.reminder ? `<span class="reminder-badge">Напоминание: ${formatDate(note.reminder)}</span>` : ''}
      </div>
      <button class="icon-button" type="button" data-note-id="${note.id}" aria-label="Удалить заметку">×</button>
    </li>
  `).join('');
}

function addNote(text, options = {}) {
  const notes = loadNotes();
  const note = {
    id: options.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    text: text.trim().slice(0, MAX_CHARS),
    createdAt: options.createdAt || new Date().toISOString(),
    reminder: normalizeReminder(options.reminder)
  };

  notes.unshift(note);
  saveNotes(notes);
  renderNotes();

  if (!options.skipSocket && socket) {
    if (note.reminder) {
      socket.emit('newReminder', {
        id: note.id,
        text: note.text,
        createdAt: note.createdAt,
        reminder: note.reminder
      });
    } else {
      socket.emit('newTask', {
        id: note.id,
        text: note.text,
        createdAt: note.createdAt
      });
    }
  }

  return note;
}

function deleteNote(id) {
  const notes = loadNotes().filter(note => note.id !== id);
  saveNotes(notes);
  renderNotes();
  showToast('Заметка удалена');
}

function clearNotes() {
  if (!loadNotes().length) {
    showToast('Список уже пуст');
    return;
  }

  if (!confirm('Удалить все заметки?')) {
    return;
  }

  saveNotes([]);
  renderNotes();
  showToast('Все заметки удалены');
}

async function loadContent(page) {
  currentPage = page;

  try {
    const response = await fetch(`./content/${page}.html`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    contentDiv.innerHTML = html;

    if (page === 'home') {
      initNotes();
    }
  } catch (error) {
    console.error(error);
    contentDiv.innerHTML = `
      <div class="error-card">
        <p>Не удалось загрузить раздел. Проверьте соединение или кэш Service Worker.</p>
      </div>
    `;
  }
}

function initNotes() {
  const form = $('note-form');
  const input = $('note-input');
  const count = $('char-count');
  const reminderForm = $('reminder-form');
  const reminderText = $('reminder-text');
  const reminderTime = $('reminder-time');
  const searchInput = $('search-input');
  const clearBtn = $('clear-btn');
  const notesList = $('notes-list');

  if (!form || !input || !count || !reminderForm || !reminderText || !reminderTime || !searchInput || !clearBtn || !notesList) {
    return;
  }

  function updateCounter() {
    if (input.value.length > MAX_CHARS) {
      input.value = input.value.slice(0, MAX_CHARS);
    }
    count.textContent = `${input.value.length} / ${MAX_CHARS}`;
  }

  updateCounter();
  renderNotes();

  input.addEventListener('input', updateCounter);

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();

    if (!text) {
      showToast('Введите текст заметки');
      input.focus();
      return;
    }

    addNote(text);
    input.value = '';
    updateCounter();
    showToast('Заметка добавлена');
  });

  reminderForm.addEventListener('submit', event => {
    event.preventDefault();

    const text = reminderText.value.trim();
    const timestamp = new Date(reminderTime.value).getTime();

    if (!text || Number.isNaN(timestamp)) {
      showToast('Заполните текст и дату напоминания');
      return;
    }

    if (timestamp <= Date.now()) {
      showToast('Дата напоминания должна быть в будущем', 3200);
      return;
    }

    addNote(text, { reminder: timestamp });
    reminderText.value = '';
    reminderTime.value = '';
    showToast('Заметка с напоминанием добавлена');
  });

  searchInput.addEventListener('input', renderNotes);
  clearBtn.addEventListener('click', clearNotes);

  notesList.addEventListener('click', event => {
    const button = event.target.closest('[data-note-id]');
    if (button) {
      deleteNote(button.dataset.noteId);
    }
  });
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  networkStatus.textContent = online ? 'Онлайн' : 'Офлайн';
  networkStatus.classList.toggle('is-online', online);
  networkStatus.classList.toggle('is-offline', !online);
}

function updateSecureStatus() {
  const secure = window.isSecureContext;
  secureStatus.textContent = secure ? 'HTTPS / secure' : 'HTTP';
  secureStatus.classList.toggle('is-secure', secure);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function fetchRuntimeConfig() {
  try {
    const response = await fetch('./config');
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    vapidPublicKey = data.publicKey || '';
  } catch (error) {
    console.error('Не удалось получить конфиг:', error);
  }
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !vapidPublicKey) {
    showToast('Push-уведомления недоступны');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    await fetch('./subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    return true;
  } catch (error) {
    console.error('Ошибка подписки:', error);
    showToast('Не удалось включить уведомления', 3200);
    return false;
  }
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return true;
  }

  await fetch('./unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint })
  });

  await subscription.unsubscribe();
  return true;
}

async function syncPushButtons() {
  if (!('serviceWorker' in navigator)) {
    enablePushBtn.hidden = true;
    disablePushBtn.hidden = true;
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  enablePushBtn.hidden = Boolean(subscription);
  disablePushBtn.hidden = !subscription;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register('./sw.js');
    await syncPushButtons();
  } catch (error) {
    console.error('Ошибка регистрации SW:', error);
  }
}

homeBtn.addEventListener('click', () => {
  setActiveButton('home-btn');
  loadContent('home');
});

aboutBtn.addEventListener('click', () => {
  setActiveButton('about-btn');
  loadContent('about');
});

enablePushBtn.addEventListener('click', async () => {
  if (Notification.permission === 'denied') {
    showToast('Разрешите уведомления в настройках браузера', 3200);
    return;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('Разрешение на уведомления не выдано', 3200);
      return;
    }
  }

  const success = await subscribeToPush();
  if (success) {
    await syncPushButtons();
    showToast('Push-уведомления включены');
  }
});

disablePushBtn.addEventListener('click', async () => {
  const success = await unsubscribeFromPush();
  if (success) {
    await syncPushButtons();
    showToast('Push-уведомления отключены');
  }
});

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

if (socket) {
  socket.on('taskAdded', task => {
    if (!task || !task.text) {
      return;
    }

    if (task.sourceSocketId !== socket.id) {
      showToast(`Новая задача от другого клиента: ${task.text}`, 3400);
    }

    const notes = loadNotes();
    if (!notes.some(note => note.id === task.id)) {
      addNote(task.text, {
        id: task.id,
        createdAt: task.createdAt,
        reminder: task.reminder,
        skipSocket: true
      });
      showToast(`Синхронизирована задача: ${task.text}`, 3400);
    } else if (currentPage === 'home') {
      renderNotes();
    }
  });
}

(async () => {
  updateNetworkStatus();
  updateSecureStatus();
  await fetchRuntimeConfig();
  await registerServiceWorker();
  setActiveButton('home-btn');
  await loadContent('home');
})();
