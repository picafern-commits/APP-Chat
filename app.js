import { APP_CONFIG, firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  getDocs,
  limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const el = {
  app: document.getElementById('app'),
  loginScreen: document.getElementById('loginScreen'),
  userSelect: document.getElementById('userSelect'),
  pinInput: document.getElementById('pinInput'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  messages: document.getElementById('messages'),
  composer: document.getElementById('composer'),
  messageInput: document.getElementById('messageInput'),
  imageInput: document.getElementById('imageInput'),
  themeToggle: document.getElementById('themeToggle'),
  clearLocalBtn: document.getElementById('clearLocalBtn'),
  brandTitle: document.getElementById('brandTitle'),
  myName: document.getElementById('myName'),
  otherName: document.getElementById('otherName'),
  myAvatar: document.getElementById('myAvatar'),
  otherAvatar: document.getElementById('otherAvatar'),
  user1Label: document.getElementById('user1Label'),
  user2Label: document.getElementById('user2Label'),
  statusText: document.getElementById('statusText'),
  connectionText: document.getElementById('connectionText'),
  scrollBottomBtn: document.getElementById('scrollBottomBtn')
};

let currentUserKey = null;
let currentUser = null;
let otherUserKey = null;
let db = null;
let selectedImageData = null;
const sessionKey = 'so_nos_session_user';
const themeKey = 'so_nos_theme_roxo';

function initTheme() {
  const saved = localStorage.getItem(themeKey) || 'dark';
  document.body.classList.toggle('light', saved === 'light');
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem(themeKey, isLight ? 'light' : 'dark');
}

function hasFirebaseConfig() {
  return firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'COLOCA_AQUI';
}

function bootFirebase() {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

function setUIBrand() {
  document.title = APP_CONFIG.appName;
  el.brandTitle.textContent = APP_CONFIG.appName;
}

function populateUsers() {
  const entries = Object.entries(APP_CONFIG.users);
  el.userSelect.innerHTML = entries.map(([key, value]) => `<option value="${key}">${value.name}</option>`).join('');
  if (entries[0]) el.user1Label.textContent = entries[0][1].name;
  if (entries[1]) el.user2Label.textContent = entries[1][1].name;
}

function avatarLetter(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function setUserUI() {
  const users = APP_CONFIG.users;
  const keys = Object.keys(users);
  otherUserKey = keys.find(k => k !== currentUserKey) || currentUserKey;
  const otherUser = users[otherUserKey];

  el.myName.textContent = currentUser.name;
  el.otherName.textContent = otherUser.name;
  el.myAvatar.textContent = avatarLetter(currentUser.name);
  el.otherAvatar.textContent = avatarLetter(otherUser.name);
}

function showLogin() {
  el.loginScreen.classList.remove('hidden');
  el.app.classList.add('hidden');
}

function showApp() {
  el.loginScreen.classList.add('hidden');
  el.app.classList.remove('hidden');
}

function login() {
  const selected = el.userSelect.value;
  const pin = el.pinInput.value.trim();
  const user = APP_CONFIG.users[selected];
  if (!user) {
    el.loginError.textContent = 'Utilizador inválido.';
    return;
  }
  if (pin !== user.pin) {
    el.loginError.textContent = 'PIN incorreto.';
    return;
  }
  currentUserKey = selected;
  currentUser = user;
  localStorage.setItem(sessionKey, selected);
  setUserUI();
  showApp();
  subscribeMessages();
}

function restoreSession() {
  const saved = localStorage.getItem(sessionKey);
  if (saved && APP_CONFIG.users[saved]) {
    currentUserKey = saved;
    currentUser = APP_CONFIG.users[saved];
    setUserUI();
    showApp();
    subscribeMessages();
  } else {
    showLogin();
  }
}

function formatTime(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMessages(docs) {
  el.messages.innerHTML = '';
  docs.forEach((snap) => {
    const msg = snap.data();
    const mine = msg.senderKey === currentUserKey;
    const row = document.createElement('div');
    row.className = `message-row ${mine ? 'me' : 'other'}`;

    const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
    const seenByOther = readBy.includes(otherUserKey);

    row.innerHTML = `
      <div class="message-bubble">
        ${msg.imageData ? `<img class="message-image" src="${msg.imageData}" alt="imagem enviada" />` : ''}
        ${msg.text ? `<div class="message-text">${escapeHtml(msg.text)}</div>` : ''}
        <div class="meta">
          <span>${formatTime(msg.createdAt)}</span>
          ${mine ? `<span class="${seenByOther ? 'read' : ''}">${seenByOther ? '✔✔' : '✔'}</span>` : ''}
        </div>
      </div>`;
    el.messages.appendChild(row);

    if (!mine && !readBy.includes(currentUserKey)) {
      updateDoc(doc(db, 'rooms', APP_CONFIG.roomId, 'messages', snap.id), { readBy: [...readBy, currentUserKey] }).catch(() => {});
    }
  });
  scrollToBottom();
}

function subscribeMessages() {
  const q = query(collection(db, 'rooms', APP_CONFIG.roomId, 'messages'), orderBy('createdAt', 'asc'));
  onSnapshot(q, (snapshot) => renderMessages(snapshot.docs), (error) => {
    el.connectionText.textContent = 'Erro na ligação ao Firebase';
    console.error(error);
  });
}

async function compressImage(file) {
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const maxWidth = 1200;
  const scale = Math.min(1, maxWidth / img.width);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.78);
}

async function sendMessage(event) {
  event.preventDefault();
  const text = el.messageInput.value.trim();
  if (!text && !selectedImageData) return;

  await addDoc(collection(db, 'rooms', APP_CONFIG.roomId, 'messages'), {
    senderKey: currentUserKey,
    senderName: currentUser.name,
    text,
    imageData: selectedImageData,
    createdAt: serverTimestamp(),
    readBy: [currentUserKey]
  });

  el.messageInput.value = '';
  el.imageInput.value = '';
  selectedImageData = null;
  autoGrow();
}

function autoGrow() {
  el.messageInput.style.height = 'auto';
  el.messageInput.style.height = `${Math.min(el.messageInput.scrollHeight, 130)}px`;
}

function scrollToBottom() {
  el.messages.scrollTop = el.messages.scrollHeight;
}

async function setupImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  selectedImageData = await compressImage(file);
}

function clearSession() {
  localStorage.removeItem(sessionKey);
  location.reload();
}

function guardConfig() {
  if (!hasFirebaseConfig()) {
    el.loginError.textContent = 'Falta configurar o Firebase no ficheiro firebase-config.js';
    return false;
  }
  return true;
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function wire() {
  el.loginBtn.addEventListener('click', () => {
    if (!guardConfig()) return;
    login();
  });
  el.pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!guardConfig()) return;
      login();
    }
  });
  el.themeToggle.addEventListener('click', toggleTheme);
  el.clearLocalBtn.addEventListener('click', clearSession);
  el.composer.addEventListener('submit', sendMessage);
  el.messageInput.addEventListener('input', autoGrow);
  el.imageInput.addEventListener('change', setupImage);
  el.scrollBottomBtn.addEventListener('click', scrollToBottom);
}

async function seedWelcomeMessage() {
  const q = query(collection(db, 'rooms', APP_CONFIG.roomId, 'messages'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'rooms', APP_CONFIG.roomId, 'messages'), {
      senderKey: 'system',
      senderName: 'Sistema',
      text: 'Chat pronto. Já podem falar os dois em tempo real. ❤',
      imageData: null,
      createdAt: serverTimestamp(),
      readBy: []
    });
  }
}

function init() {
  initTheme();
  setUIBrand();
  populateUsers();
  wire();
  registerSW();

  if (hasFirebaseConfig()) {
    bootFirebase();
    seedWelcomeMessage().finally(restoreSession);
  } else {
    showLogin();
  }
}

init();
