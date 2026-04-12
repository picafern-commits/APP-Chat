const DEMO_PIN = '1234';
const STORAGE_KEYS = {
  messages: 'so_nos_messages',
  theme: 'so_nos_theme',
  logged: 'so_nos_logged'
};

const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const pinInput = document.getElementById('pinInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const clearBtn = document.getElementById('clearBtn');
const themeBtn = document.getElementById('themeBtn');
const messagesEl = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const imageInput = document.getElementById('imageInput');
const previewWrap = document.getElementById('previewWrap');
const previewImg = document.getElementById('previewImg');
const removeImageBtn = document.getElementById('removeImageBtn');

let pendingImage = '';

function loadMessages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '[]');
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function renderMessages() {
  const messages = loadMessages();
  if (!messages.length) {
    messagesEl.innerHTML = `
      <div class="empty-state">
        <p>Sem mensagens ainda.</p>
        <p>Escreve a primeira 💚</p>
      </div>
    `;
    return;
  }

  messagesEl.innerHTML = messages.map(msg => `
    <div class="message-row ${msg.author}">
      <div class="bubble">
        ${msg.image ? `<img src="${msg.image}" alt="imagem enviada">` : ''}
        ${msg.text ? `<div>${escapeHtml(msg.text)}</div>` : ''}
        <div class="meta">${formatTime(msg.ts)} · ${msg.author === 'me' ? '✔' : 'Recebida'}</div>
      </div>
    </div>
  `).join('');

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showChat() {
  loginScreen.classList.remove('active');
  chatScreen.classList.add('active');
  localStorage.setItem(STORAGE_KEYS.logged, '1');
  renderMessages();
}

function showLogin() {
  chatScreen.classList.remove('active');
  loginScreen.classList.add('active');
  localStorage.removeItem(STORAGE_KEYS.logged);
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text && !pendingImage) return;

  const messages = loadMessages();
  messages.push({
    id: crypto.randomUUID(),
    author: 'me',
    text,
    image: pendingImage,
    ts: Date.now()
  });
  saveMessages(messages);
  messageInput.value = '';
  clearPendingImage();
  renderMessages();

  setTimeout(() => {
    const replyPool = [
      'Gosto muito de ti ❤️',
      'Que mensagem linda 😘',
      'Já vi agora 💚',
      'Fala comigo 😍',
      'Estou aqui amor'
    ];
    const all = loadMessages();
    all.push({
      id: crypto.randomUUID(),
      author: 'other',
      text: replyPool[Math.floor(Math.random() * replyPool.length)],
      image: '',
      ts: Date.now()
    });
    saveMessages(all);
    renderMessages();
  }, 900);
}

function clearPendingImage() {
  pendingImage = '';
  imageInput.value = '';
  previewImg.src = '';
  previewWrap.classList.add('hidden');
}

loginBtn.addEventListener('click', () => {
  if (pinInput.value === DEMO_PIN) {
    pinInput.value = '';
    showChat();
  } else {
    alert('PIN incorreto. Usa 1234 nesta versão demo.');
  }
});

pinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', showLogin);
clearBtn.addEventListener('click', () => {
  if (confirm('Queres apagar a conversa guardada neste telemóvel?')) {
    localStorage.removeItem(STORAGE_KEYS.messages);
    renderMessages();
  }
});

themeBtn.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem(STORAGE_KEYS.theme, isLight ? 'light' : 'dark');
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

imageInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingImage = String(reader.result || '');
    previewImg.src = pendingImage;
    previewWrap.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

removeImageBtn.addEventListener('click', clearPendingImage);

(function init() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  if (savedTheme === 'light') document.body.classList.add('light');

  if (localStorage.getItem(STORAGE_KEYS.logged) === '1') {
    showChat();
  } else {
    showLogin();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
