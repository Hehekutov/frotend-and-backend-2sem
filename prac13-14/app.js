// ============================
// Утилиты
// ============================

function $(id) { return document.getElementById(id); }

function showToast(msg, duration = 2200) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.hidden = true; }, duration);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

// ============================
// Работа с заметками
// ============================

const STORAGE_KEY = 'pwa-notes-v1';
const MAX_CHARS = 300;

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function renderNotes() {
  const notes = loadNotes();
  const list  = $('notes-list');
  const empty = $('notes-empty');
  const count = $('notes-count');

  count.textContent = `${notes.length} ${pluralNote(notes.length)}`;

  if (notes.length === 0) {
    empty.hidden = false;
    list.innerHTML = '';
    return;
  }

  empty.hidden = true;

  list.innerHTML = notes.map((note, i) => `
    <li class="note-item" data-id="${note.id}">
      <div class="note-bullet">${i + 1}</div>
      <div class="note-body">
        <div class="note-text">${escapeHtml(note.text)}</div>
        <div class="note-date">${formatDate(note.createdAt)}</div>
      </div>
      <button class="note-delete" title="Удалить" data-id="${note.id}">✕</button>
    </li>
  `).join('');
}

function addNote(text) {
  const notes = loadNotes();
  notes.unshift({
    id: Date.now().toString(),
    text: text.trim(),
    createdAt: new Date().toISOString()
  });
  saveNotes(notes);
  renderNotes();
  showToast('✅ Заметка добавлена');
}

function deleteNote(id) {
  const notes = loadNotes().filter(n => n.id !== id);
  saveNotes(notes);
  renderNotes();
  showToast('🗑 Заметка удалена');
}

function clearAll() {
  if (!loadNotes().length) return;
  if (!confirm('Удалить все заметки?')) return;
  saveNotes([]);
  renderNotes();
  showToast('🧹 Все заметки удалены');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pluralNote(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'заметка';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'заметки';
  return 'заметок';
}

// ============================
// Счётчик символов
// ============================

const input    = $('note-input');
const charCount = $('char-count');

input.addEventListener('input', () => {
  const len = input.value.length;
  charCount.textContent = `${len} / ${MAX_CHARS}`;
  charCount.classList.toggle('limit', len >= MAX_CHARS);
  if (len > MAX_CHARS) input.value = input.value.slice(0, MAX_CHARS);
});

// ============================
// Форма
// ============================

$('note-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) {
    showToast('⚠️ Введите текст заметки');
    input.focus();
    return;
  }
  addNote(text);
  input.value = '';
  charCount.textContent = `0 / ${MAX_CHARS}`;
  charCount.classList.remove('limit');
  input.focus();
});

// ============================
// Удаление по клику
// ============================

$('notes-list').addEventListener('click', (e) => {
  const btn = e.target.closest('.note-delete');
  if (btn) deleteNote(btn.dataset.id);
});

$('clear-btn').addEventListener('click', clearAll);

// ============================
// Онлайн / Офлайн статус
// ============================

function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  const dot      = document.querySelector('.status-dot');
  const text     = document.querySelector('.status-text');
  const banner   = $('offline-banner');

  dot.classList.toggle('offline', !isOnline);
  text.textContent = isOnline ? 'онлайн' : 'офлайн';
  banner.hidden = isOnline;
}

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// ============================
// Регистрация Service Worker
// ============================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Зарегистрирован, scope:', reg.scope);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('🔄 Обновление доступно — перезагрузите страницу', 4000);
          }
        });
      });
    } catch (err) {
      console.error('[SW] Ошибка регистрации:', err);
    }
  });
}

// ============================
// Первоначальный рендер
// ============================

renderNotes();