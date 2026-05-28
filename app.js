import firebaseConfig from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

const COLLECTIONS = {
  messages: 'messages',
  shopping: 'shopping',
  events: 'events',
  memories: 'memories',
  locations: 'locations'
};

const state = {
  profile: 'Ricardo',
  replyTo: null,
  activeView: 'dashboard',
  dbMode: firebaseConfig ? 'firebase' : 'local',
  firebaseReady: false,
  unsubscribers: [],
  reminderTimers: [],
  snapshotsReady: { messages: false, shopping: false, events: false, memories: false, locations: false },
  notificationsEnabled: localStorage.getItem('so_nos_notifications') === 'true',
  messages: load('so_nos_messages', [
    { id: uid(), sender: 'Carol', text: 'Bem-vindo à nossa app 💜', createdAt: new Date().toISOString(), read: true }
  ]),
  shopping: load('so_nos_shopping', []),
  events: load('so_nos_events', []),
  memories: load('so_nos_memories', []),
  locations: load('so_nos_locations', [])
};

const els = {
  views: document.querySelectorAll('.view'),
  navBtns: document.querySelectorAll('.nav-btn'),
  installBtn: document.getElementById('installBtn'),
  activeProfile: document.getElementById('activeProfile'),
  messageList: document.getElementById('messageList'),
  chatForm: document.getElementById('chatForm'),
  messageInput: document.getElementById('messageInput'),
  imageInput: document.getElementById('imageInput'),
  replyBar: document.getElementById('replyBar'),
  replyPreview: document.getElementById('replyPreview'),
  cancelReplyBtn: document.getElementById('cancelReplyBtn'),
  shoppingForm: document.getElementById('shoppingForm'),
  shoppingList: document.getElementById('shoppingList'),
  clearBoughtBtn: document.getElementById('clearBoughtBtn'),
  eventForm: document.getElementById('eventForm'),
  eventList: document.getElementById('eventList'),
  shareLocationBtn: document.getElementById('shareLocationBtn'),
  locationMap: document.getElementById('locationMap'),
  locationMapEmpty: document.getElementById('locationMapEmpty'),
  locationStatus: document.getElementById('locationStatus'),
  locationHint: document.getElementById('locationHint'),
  locationList: document.getElementById('locationList'),
  memoryForm: document.getElementById('memoryForm'),
  memoryList: document.getElementById('memoryList'),
  enableNotificationsBtn: document.getElementById('enableNotificationsBtn'),
  firebaseStatus: document.getElementById('firebaseStatus'),
  resetDataBtn: document.getElementById('resetDataBtn'),
  dashboardLastMessage: document.getElementById('dashboardLastMessage'),
  dashboardMessageMeta: document.getElementById('dashboardMessageMeta'),
  dashboardPendingItems: document.getElementById('dashboardPendingItems'),
  dashboardLastItem: document.getElementById('dashboardLastItem'),
  dashboardNextEvent: document.getElementById('dashboardNextEvent'),
  dashboardNextEventDate: document.getElementById('dashboardNextEventDate'),
  dashboardMemories: document.getElementById('dashboardMemories'),
  dashboardLastMemory: document.getElementById('dashboardLastMemory'),
  dashboardLastLocation: document.getElementById('dashboardLastLocation'),
  dashboardLocationMeta: document.getElementById('dashboardLocationMeta')
};

let deferredPrompt = null;
let db = null;
let storage = null;

init();

async function init() {
  bindNav();
  bindChat();
  bindShopping();
  bindLocation();
  bindEvents();
  bindMemories();
  bindSettings();
  bindNotifications();
  bindPWA();

  els.activeProfile.value = state.profile;
  els.activeProfile.addEventListener('change', e => state.profile = e.target.value);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  if (isFirebaseConfigured()) {
    try {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      storage = getStorage(app);
      state.firebaseReady = true;
      state.dbMode = 'firebase';
      attachRealtimeListeners();
    } catch (error) {
      console.error('Erro ao iniciar Firebase:', error);
      state.firebaseReady = false;
      state.dbMode = 'local';
    }
  }

  renderAll();
}

function isFirebaseConfigured() {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

function bindNav() {
  els.navBtns.forEach(btn => btn.addEventListener('click', () => {
    const name = btn.dataset.view;
    state.activeView = name;
    els.navBtns.forEach(b => b.classList.toggle('active', b === btn));
    els.views.forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
  }));
}

function bindChat() {
  els.chatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const text = els.messageInput.value.trim();
    const file = els.imageInput.files[0];
    if (!text && !file) return;

    const message = {
      sender: state.profile,
      text,
      read: false,
      createdAt: new Date().toISOString(),
      replyTo: state.replyTo,
      image: null
    };

    try {
      if (file) {
        message.image = await uploadImage(file, `chat-images/${Date.now()}-${safeName(file.name)}`);
      }

      if (state.firebaseReady) {
        await addDoc(collection(db, COLLECTIONS.messages), {
          ...message,
          createdAt: serverTimestamp()
        });
      } else {
        state.messages.push({ id: uid(), ...message });
        persist('so_nos_messages', state.messages);
        renderMessages();
        renderDashboard();
        notify('Mensagem enviada', text || 'Imagem enviada.');
      }

      els.chatForm.reset();
      clearReply();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Não foi possível enviar a mensagem.');
    }
  });

  els.cancelReplyBtn.addEventListener('click', clearReply);
}

function bindShopping() {
  els.shoppingForm.addEventListener('submit', async e => {
    e.preventDefault();
    const item = {
      name: val('itemName'),
      qty: Number(val('itemQty')),
      category: val('itemCategory'),
      store: val('itemStore'),
      owner: val('itemOwner'),
      notes: val('itemNotes'),
      bought: false,
      createdAt: new Date().toISOString()
    };

    try {
      if (state.firebaseReady) {
        await addDoc(collection(db, COLLECTIONS.shopping), {
          ...item,
          createdAt: serverTimestamp()
        });
      } else {
        state.shopping.unshift({ id: uid(), ...item });
        persist('so_nos_shopping', state.shopping);
        renderShopping();
        renderDashboard();
        notify('Item adicionado', `${item.name} entrou na lista de compras.`);
      }

      els.shoppingForm.reset();
      document.getElementById('itemQty').value = 1;
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      alert('Não foi possível adicionar o item.');
    }
  });

  els.clearBoughtBtn.addEventListener('click', async () => {
    if (state.firebaseReady) {
      const boughtItems = state.shopping.filter(i => i.bought);
      await Promise.all(boughtItems.map(i => deleteDoc(doc(db, COLLECTIONS.shopping, i.id))));
    } else {
      state.shopping = state.shopping.filter(i => !i.bought);
      persist('so_nos_shopping', state.shopping);
      renderShopping();
      renderDashboard();
    }
  });
}

function bindLocation() {
  if (!els.shareLocationBtn) return;

  els.shareLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Este dispositivo não suporta localização no browser.');
      return;
    }

    els.shareLocationBtn.disabled = true;
    els.shareLocationBtn.textContent = 'A localizar...';

    navigator.geolocation.getCurrentPosition(
      async position => {
        const location = {
          owner: state.profile,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
          createdAt: new Date().toISOString()
        };

        try {
          if (state.firebaseReady) {
            await addDoc(collection(db, COLLECTIONS.locations), {
              ...location,
              createdAt: serverTimestamp()
            });
          } else {
            state.locations.unshift({ id: uid(), ...location });
            state.locations = newestLocationsByOwner(state.locations);
            persist('so_nos_locations', state.locations);
            renderLocations();
            renderDashboard();
          }
          notify('Localização partilhada', `${state.profile} atualizou a posição.`);
        } catch (error) {
          console.error('Erro ao partilhar localização:', error);
          alert('Não foi possível guardar a localização.');
        } finally {
          els.shareLocationBtn.disabled = false;
          els.shareLocationBtn.textContent = 'Partilhar localização';
        }
      },
      error => {
        console.error('Erro GPS:', error);
        alert('Não consegui obter a localização. Confirma a permissão de GPS no browser.');
        els.shareLocationBtn.disabled = false;
        els.shareLocationBtn.textContent = 'Partilhar localização';
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

function bindEvents() {
  els.eventForm.addEventListener('submit', async e => {
    e.preventDefault();
    const event = {
      title: val('eventTitle'),
      date: val('eventDate'),
      time: val('eventTime'),
      type: val('eventType'),
      reminder: val('eventReminder'),
      note: val('eventNote'),
      createdAt: new Date().toISOString()
    };

    try {
      if (state.firebaseReady) {
        await addDoc(collection(db, COLLECTIONS.events), {
          ...event,
          createdAt: serverTimestamp()
        });
      } else {
        state.events.push({ id: uid(), ...event });
        state.events.sort((a, b) => a.date.localeCompare(b.date));
        persist('so_nos_events', state.events);
        renderEvents();
        renderDashboard();
        scheduleEventReminders();
        notify('Evento adicionado', `${event.title} ficou na agenda.`);
      }
      els.eventForm.reset();
    } catch (error) {
      console.error('Erro ao adicionar evento:', error);
      alert('Não foi possível guardar o evento.');
    }
  });
}

function bindMemories() {
  els.memoryForm.addEventListener('submit', async e => {
    e.preventDefault();
    const file = document.getElementById('memoryImage').files[0];
    const memory = {
      title: val('memoryTitle'),
      text: val('memoryText'),
      date: val('memoryDate'),
      image: null,
      createdAt: new Date().toISOString()
    };

    try {
      if (file) {
        memory.image = await uploadImage(file, `chat-images/memories-${Date.now()}-${safeName(file.name)}`);
      }

      if (state.firebaseReady) {
        await addDoc(collection(db, COLLECTIONS.memories), {
          ...memory,
          createdAt: serverTimestamp()
        });
      } else {
        state.memories.unshift({ id: uid(), ...memory });
        persist('so_nos_memories', state.memories);
        renderMemories();
        renderDashboard();
      }
      els.memoryForm.reset();
    } catch (error) {
      console.error('Erro ao guardar memória:', error);
      alert('Não foi possível guardar a memória.');
    }
  });
}

function bindSettings() {
  els.resetDataBtn.addEventListener('click', async () => {
    if (!confirm('Tens a certeza que queres limpar os dados locais desta app?')) return;
    ['so_nos_messages', 'so_nos_shopping', 'so_nos_events', 'so_nos_memories', 'so_nos_locations'].forEach(k => localStorage.removeItem(k));
    if (!state.firebaseReady) {
      location.reload();
      return;
    }
    alert('Os dados Firebase não são apagados por este botão. Só os dados locais foram limpos.');
    renderAll();
  });
}

function bindNotifications() {
  updateNotificationButton();
  if (!els.enableNotificationsBtn) return;

  els.enableNotificationsBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      alert('Este browser não suporta notificações.');
      return;
    }

    const permission = await Notification.requestPermission();
    state.notificationsEnabled = permission === 'granted';
    localStorage.setItem('so_nos_notifications', String(state.notificationsEnabled));
    updateNotificationButton();

    if (state.notificationsEnabled) {
      notify('Notificações ativas', 'Vou avisar-te sobre mensagens, compras e agenda.');
    }
  });
}

function bindPWA() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    els.installBtn.classList.remove('hidden');
  });

  els.installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBtn.classList.add('hidden');
  });
}

function attachRealtimeListeners() {
  detachRealtimeListeners();

  state.unsubscribers.push(
    onSnapshot(
      query(collection(db, COLLECTIONS.messages), orderBy('createdAt')),
      snapshot => {
        const previousLastId = state.messages[state.messages.length - 1]?.id;
        state.messages = snapshot.docs.map(toAppDoc);
        persist('so_nos_messages', state.messages);
        renderMessages();
        renderDashboard();
        const last = state.messages[state.messages.length - 1];
        if (state.snapshotsReady.messages && last && last.id !== previousLastId && last.sender !== state.profile && state.activeView !== 'chat') {
          notify(`Nova mensagem de ${last.sender}`, last.text || 'Enviou uma imagem.');
        }
        state.snapshotsReady.messages = true;
      },
      error => console.error('Erro realtime messages:', error)
    )
  );

  state.unsubscribers.push(
    onSnapshot(
      query(collection(db, COLLECTIONS.shopping), orderBy('createdAt', 'desc')),
      snapshot => {
        state.shopping = snapshot.docs.map(toAppDoc);
        persist('so_nos_shopping', state.shopping);
        renderShopping();
        renderDashboard();
        if (state.snapshotsReady.shopping) notify('Lista de compras atualizada', 'Há alterações na lista partilhada.');
        state.snapshotsReady.shopping = true;
      },
      error => console.error('Erro realtime shopping:', error)
    )
  );

  state.unsubscribers.push(
    onSnapshot(
      query(collection(db, COLLECTIONS.events), orderBy('date')),
      snapshot => {
        state.events = snapshot.docs.map(toAppDoc);
        persist('so_nos_events', state.events);
        renderEvents();
        renderDashboard();
        scheduleEventReminders();
        state.snapshotsReady.events = true;
      },
      error => console.error('Erro realtime events:', error)
    )
  );

  state.unsubscribers.push(
    onSnapshot(
      query(collection(db, COLLECTIONS.memories), orderBy('createdAt', 'desc')),
      snapshot => {
        state.memories = snapshot.docs.map(toAppDoc);
        persist('so_nos_memories', state.memories);
        renderMemories();
        renderDashboard();
        state.snapshotsReady.memories = true;
      },
      error => console.error('Erro realtime memories:', error)
    )
  );

  state.unsubscribers.push(
    onSnapshot(
      query(collection(db, COLLECTIONS.locations), orderBy('createdAt', 'desc')),
      snapshot => {
        state.locations = newestLocationsByOwner(snapshot.docs.map(toAppDoc));
        persist('so_nos_locations', state.locations);
        renderLocations();
        renderDashboard();
        state.snapshotsReady.locations = true;
      },
      error => console.error('Erro realtime locations:', error)
    )
  );
}

function detachRealtimeListeners() {
  state.unsubscribers.forEach(unsub => {
    try { unsub(); } catch {}
  });
  state.unsubscribers = [];
}

function toAppDoc(snapshotDoc) {
  const data = snapshotDoc.data();
  return {
    id: snapshotDoc.id,
    ...data,
    createdAt: normalizeDate(data.createdAt),
    date: data.date || ''
  };
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return new Date(value).toISOString();
}

function renderAll() {
  els.firebaseStatus.textContent = state.firebaseReady ? 'Firebase ligado' : 'Local';
  updateNotificationButton();
  renderMessages();
  renderShopping();
  renderLocations();
  renderEvents();
  renderMemories();
  renderDashboard();
  scheduleEventReminders();
}

function renderMessages() {
  els.messageList.innerHTML = '';
  state.messages.forEach(msg => {
    const wrap = document.createElement('article');
    wrap.className = `message ${msg.sender === state.profile ? 'mine' : ''}`;
    const reply = msg.replyTo ? `<div class="reply-chip">A responder a: ${escapeHtml(msg.replyTo.sender)} — ${escapeHtml(msg.replyTo.text || 'Imagem')}</div>` : '';
    const image = msg.image ? `<img src="${msg.image}" alt="Imagem enviada" />` : '';
    wrap.innerHTML = `
      <div class="sender">${escapeHtml(msg.sender)}</div>
      ${reply}
      ${msg.text ? `<div>${escapeHtml(msg.text)}</div>` : ''}
      ${image}
      <div class="meta">
        <span>${formatDateTime(msg.createdAt)}</span>
        <span>${msg.read ? '✔✔' : '✔'}</span>
      </div>
      <div class="message-actions">
        <button class="mini-btn" data-action="reply" data-id="${msg.id}">Responder</button>
        <button class="mini-btn" data-action="toggle-read" data-id="${msg.id}">${msg.read ? 'Marcar por ler' : 'Marcar lida'}</button>
        <button class="mini-btn danger" data-action="delete" data-id="${msg.id}">Apagar</button>
      </div>
    `;
    els.messageList.appendChild(wrap);
  });
  els.messageList.querySelectorAll('.mini-btn').forEach(btn => btn.addEventListener('click', onMessageAction));
  els.messageList.scrollTop = els.messageList.scrollHeight;
}

async function onMessageAction(e) {
  const { action, id } = e.target.dataset;
  const msg = state.messages.find(m => m.id === id);
  if (!msg) return;

  if (action === 'reply') {
    state.replyTo = { sender: msg.sender, text: msg.text || 'Imagem' };
    els.replyPreview.textContent = `${msg.sender}: ${msg.text || 'Imagem'}`;
    els.replyBar.classList.remove('hidden');
    els.messageInput.focus();
    return;
  }

  try {
    if (state.firebaseReady) {
      if (action === 'toggle-read') {
        await updateDoc(doc(db, COLLECTIONS.messages, id), { read: !msg.read });
      }
      if (action === 'delete') {
        await deleteDoc(doc(db, COLLECTIONS.messages, id));
      }
    } else {
      if (action === 'toggle-read') msg.read = !msg.read;
      if (action === 'delete') state.messages = state.messages.filter(m => m.id !== id);
      persist('so_nos_messages', state.messages);
      renderMessages();
      renderDashboard();
    }
  } catch (error) {
    console.error('Erro ao atualizar mensagem:', error);
    alert('Não foi possível atualizar a mensagem.');
  }
}

function clearReply() {
  state.replyTo = null;
  els.replyBar.classList.add('hidden');
  els.replyPreview.textContent = '';
}

function renderShopping() {
  els.shoppingList.innerHTML = state.shopping.length ? '' : empty('Ainda não há itens na lista.');
  state.shopping.forEach(item => {
    const el = document.createElement('article');
    el.className = 'card list-card';
    el.innerHTML = `
      <div class="list-actions">
        <h3>${escapeHtml(item.name)} x${item.qty}</h3>
        <span class="badge ${item.bought ? 'success' : 'primary'}">${item.bought ? 'Comprado' : 'Pendente'}</span>
      </div>
      <div class="badges">
        <span class="badge">${escapeHtml(item.category)}</span>
        <span class="badge">${escapeHtml(item.store)}</span>
        <span class="badge">Adicionado por ${escapeHtml(item.owner)}</span>
      </div>
      ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
      <div class="list-actions">
        <button class="ghost-btn small" data-shop-action="toggle" data-id="${item.id}">${item.bought ? 'Marcar pendente' : 'Marcar comprado'}</button>
        <button class="danger-btn small" data-shop-action="delete" data-id="${item.id}">Apagar</button>
      </div>
    `;
    els.shoppingList.appendChild(el);
  });
  els.shoppingList.querySelectorAll('[data-shop-action]').forEach(btn => btn.addEventListener('click', onShoppingAction));
}

async function onShoppingAction(e) {
  const { shopAction, id } = e.target.dataset;
  const item = state.shopping.find(i => i.id === id);
  if (!item) return;

  try {
    if (state.firebaseReady) {
      if (shopAction === 'toggle') await updateDoc(doc(db, COLLECTIONS.shopping, id), { bought: !item.bought });
      if (shopAction === 'delete') await deleteDoc(doc(db, COLLECTIONS.shopping, id));
    } else {
      if (shopAction === 'toggle') item.bought = !item.bought;
      if (shopAction === 'delete') state.shopping = state.shopping.filter(i => i.id !== id);
      persist('so_nos_shopping', state.shopping);
      renderShopping();
      renderDashboard();
    }
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    alert('Não foi possível atualizar o item.');
  }
}

function renderLocations() {
  if (!els.locationList) return;

  const locations = newestLocationsByOwner(state.locations);
  state.locations = locations;
  els.locationList.innerHTML = locations.length ? '' : empty('Ainda não há localizações partilhadas.');

  const latest = locations[0];
  renderLocationMap(latest);
  els.locationStatus.textContent = latest ? `${latest.owner} partilhou a posição` : 'Localização ainda não partilhada';
  els.locationHint.textContent = latest
    ? `Atualizado ${formatDateTime(latest.createdAt)} com precisão aproximada de ${latest.accuracy || '?'} m.`
    : 'Quando partilhares, a outra pessoa consegue abrir o mapa e ver onde estás.';

  locations.forEach(location => {
    const url = mapUrl(location);
    const el = document.createElement('article');
    el.className = 'location-item';
    el.innerHTML = `
      <div>
        <h3>${escapeHtml(location.owner)}</h3>
        <p>${formatDateTime(location.createdAt)} · precisão ${escapeHtml(location.accuracy || '?')} m</p>
      </div>
      <a class="ghost-btn small" href="${url}" target="_blank" rel="noopener">Abrir mapa</a>
    `;
    els.locationList.appendChild(el);
  });
}

function renderLocationMap(location) {
  if (!els.locationMap || !els.locationMapEmpty) return;

  if (!location) {
    els.locationMap.src = defaultMapEmbedUrl();
    els.locationMap.classList.remove('hidden');
    els.locationMapEmpty.classList.remove('hidden');
    return;
  }

  els.locationMap.src = mapEmbedUrl(location);
  els.locationMap.classList.remove('hidden');
  els.locationMapEmpty.classList.add('hidden');
}

function renderEvents() {
  els.eventList.innerHTML = state.events.length ? '' : empty('Ainda não há eventos marcados.');
  state.events.forEach(event => {
    const el = document.createElement('article');
    el.className = 'card list-card';
    el.innerHTML = `
      <div class="list-actions">
        <h3>${escapeHtml(event.title)}</h3>
        <span class="badge primary">${escapeHtml(event.type)}</span>
      </div>
      <p>${formatDate(event.date)}${event.time ? ` · ${escapeHtml(event.time)}` : ''}</p>
      ${event.reminder && event.reminder !== 'none' ? `<span class="badge">Lembrete ${formatReminder(event.reminder)}</span>` : ''}
      ${event.note ? `<p>${escapeHtml(event.note)}</p>` : ''}
      <div class="list-actions">
        <span></span>
        <button class="danger-btn small" data-event-delete="${event.id}">Apagar</button>
      </div>
    `;
    els.eventList.appendChild(el);
  });
  els.eventList.querySelectorAll('[data-event-delete]').forEach(btn => btn.addEventListener('click', onEventDelete));
}

async function onEventDelete(e) {
  const id = e.target.dataset.eventDelete;
  try {
    if (state.firebaseReady) {
      await deleteDoc(doc(db, COLLECTIONS.events, id));
    } else {
      state.events = state.events.filter(ev => ev.id !== id);
      persist('so_nos_events', state.events);
      renderEvents();
      renderDashboard();
    }
  } catch (error) {
    console.error('Erro ao apagar evento:', error);
    alert('Não foi possível apagar o evento.');
  }
}

function renderMemories() {
  els.memoryList.innerHTML = state.memories.length ? '' : empty('Ainda não há memórias guardadas.');
  state.memories.forEach(memory => {
    const el = document.createElement('article');
    el.className = 'card list-card';
    el.innerHTML = `
      <div class="list-actions">
        <h3>${escapeHtml(memory.title)}</h3>
        <span class="badge primary">${formatDate(memory.date)}</span>
      </div>
      ${memory.image ? `<img class="memory-image" src="${memory.image}" alt="${escapeHtml(memory.title)}" />` : ''}
      ${memory.text ? `<p>${escapeHtml(memory.text)}</p>` : ''}
      <div class="list-actions">
        <span></span>
        <button class="danger-btn small" data-memory-delete="${memory.id}">Apagar</button>
      </div>
    `;
    els.memoryList.appendChild(el);
  });
  els.memoryList.querySelectorAll('[data-memory-delete]').forEach(btn => btn.addEventListener('click', onMemoryDelete));
}

async function onMemoryDelete(e) {
  const id = e.target.dataset.memoryDelete;
  try {
    if (state.firebaseReady) {
      await deleteDoc(doc(db, COLLECTIONS.memories, id));
    } else {
      state.memories = state.memories.filter(mem => mem.id !== id);
      persist('so_nos_memories', state.memories);
      renderMemories();
      renderDashboard();
    }
  } catch (error) {
    console.error('Erro ao apagar memória:', error);
    alert('Não foi possível apagar a memória.');
  }
}

function renderDashboard() {
  const lastMsg = state.messages[state.messages.length - 1];
  els.dashboardLastMessage.textContent = lastMsg ? (lastMsg.text || 'Imagem enviada') : 'Sem mensagens ainda';
  els.dashboardMessageMeta.textContent = lastMsg ? `${lastMsg.sender} · ${formatDateTime(lastMsg.createdAt)}` : 'Envia a primeira mensagem';

  const pending = state.shopping.filter(i => !i.bought);
  els.dashboardPendingItems.textContent = pending.length;
  els.dashboardLastItem.textContent = pending[0] ? `${pending[0].name} · ${pending[0].store}` : 'Lista vazia';

  const nextEvent = [...state.events].filter(e => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];
  els.dashboardNextEvent.textContent = nextEvent ? nextEvent.title : 'Sem próximo evento';
  els.dashboardNextEventDate.textContent = nextEvent ? `${formatDate(nextEvent.date)} · ${nextEvent.type}` : 'Adiciona um momento especial';

  els.dashboardMemories.textContent = state.memories.length;
  els.dashboardLastMemory.textContent = state.memories[0] ? `${state.memories[0].title} · ${formatDate(state.memories[0].date)}` : 'Guarda o vosso primeiro momento';

  const lastLocation = newestLocationsByOwner(state.locations)[0];
  els.dashboardLastLocation.textContent = lastLocation ? `${lastLocation.owner} partilhou localização` : 'Sem partilha ativa';
  els.dashboardLocationMeta.textContent = lastLocation ? formatDateTime(lastLocation.createdAt) : 'Partilha a tua posição quando quiseres';
}

async function uploadImage(file, path) {
  if (!state.firebaseReady || !storage) {
    return await fileToDataURL(file);
  }
  const imageRef = ref(storage, path);
  await uploadBytes(imageRef, file);
  return await getDownloadURL(imageRef);
}

function safeName(name) {
  return (name || 'imagem').replace(/[^a-zA-Z0-9._-]/g, '-');
}

function newestLocationsByOwner(locations) {
  const byOwner = new Map();
  [...locations]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(location => {
      if (!byOwner.has(location.owner)) byOwner.set(location.owner, location);
    });
  return [...byOwner.values()];
}

function mapUrl(location) {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
}

function mapEmbedUrl(location) {
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  const delta = 0.012;
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(',');
  const marker = `${lat},${lon}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
}

function defaultMapEmbedUrl() {
  return 'https://www.openstreetmap.org/export/embed.html?bbox=-9.236%2C38.676%2C-9.054%2C38.802&layer=mapnik';
}

function updateNotificationButton() {
  if (!els.enableNotificationsBtn) return;
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  state.notificationsEnabled = permission === 'granted' && state.notificationsEnabled;
  els.enableNotificationsBtn.textContent = state.notificationsEnabled ? 'Ativas' : 'Ativar';
  els.enableNotificationsBtn.disabled = permission === 'denied' || permission === 'unsupported';
}

function notify(title, body) {
  if (!state.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    navigator.serviceWorker?.ready
      .then(registration => registration.showNotification(title, { body, icon: './icon-192.png', badge: './icon-192.png' }))
      .catch(() => new Notification(title, { body, icon: './icon-192.png' }));
  } catch {
    new Notification(title, { body, icon: './icon-192.png' });
  }
}

function scheduleEventReminders() {
  state.reminderTimers.forEach(timer => clearTimeout(timer));
  state.reminderTimers = [];

  state.events.forEach(event => {
    if (!event.time || !event.reminder || event.reminder === 'none') return;
    const eventDate = new Date(`${event.date}T${event.time}`);
    const reminderAt = eventDate.getTime() - Number(event.reminder) * 60 * 1000;
    const delay = reminderAt - Date.now();
    if (delay <= 0 || delay > 2147483647) return;

    const timer = setTimeout(() => {
      notify('Lembrete da agenda', `${event.title} é ${formatReminder(event.reminder)}.`);
    }, delay);
    state.reminderTimers.push(timer);
  });
}

function formatReminder(value) {
  if (String(value) === '15') return '15 min antes';
  if (String(value) === '60') return '1 hora antes';
  if (String(value) === '1440') return '1 dia antes';
  return '';
}

function val(id) { return document.getElementById(id).value.trim(); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function persist(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function empty(text) { return `<article class="card list-card"><p>${text}</p></article>`; }
function today() { return new Date().toISOString().slice(0, 10); }
function formatDate(date) {
  if (!date) return 'Sem data';
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateTime(date) {
  return new Date(date).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function escapeHtml(str = '') {
  return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
