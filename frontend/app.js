// frontend/app.js

/*const AUTH_URL = 'http://localhost:4000';
const CHAT_URL = 'http://localhost:4001';

let token = null;
let currentUser = null;
let socket = null;
let currentChatWith = null;

// DOM elements
const loginView = document.getElementById('login-view');
const chatView = document.getElementById('chat-view');

const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');

const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');
const btnRegister = document.getElementById('btn-register');

const loginError = document.getElementById('login-error');

const currentUserSpan = document.getElementById('current-user');
const usersOnlineUl = document.getElementById('users-online');
const usersAllUl = document.getElementById('users-all');

const chatWithSpan = document.getElementById('chat-with');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const btnSend = document.getElementById('btn-send');

// ---------- Login & Registro ----------

btnRegister.addEventListener('click', async () => {
  const username = registerUsername.value.trim();
  const password = registerPassword.value.trim();

  if (!username || !password) {
    loginError.textContent = 'Preencha usuário e senha para cadastro.';
    return;
  }

  try {
    const res = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error || 'Erro ao cadastrar';
      return;
    }

    loginError.textContent = 'Usuário cadastrado! Faça login.';
  } catch (err) {
    loginError.textContent = 'Erro de conexão com servidor.';
  }
});

btnLogin.addEventListener('click', async () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    loginError.textContent = 'Preencha usuário e senha.';
    return;
  }

  try {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error || 'Erro ao fazer login';
      return;
    }

    token = data.token;
    currentUser = data.user.username;
    currentUserSpan.textContent = currentUser;

    loginView.style.display = 'none';
    chatView.style.display = 'flex';

    await carregarUsuarios();
    conectarSocket();
  } catch (err) {
    loginError.textContent = 'Erro de conexão com servidor.';
  }
});

// ---------- Carregar usuários ----------

async function carregarUsuarios() {
  try {
    const res = await fetch(`${AUTH_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const users = await res.json();

    usersAllUl.innerHTML = '';
    users
      .filter((u) => u.username !== currentUser)
      .forEach((u) => {
        const li = document.createElement('li');
        li.textContent = u.username;
        li.addEventListener('click', () => abrirConversaCom(u.username));
        usersAllUl.appendChild(li);
      });
  } catch (err) {
    console.error('Erro ao carregar usuários', err);
  }
}

// ---------- WebSocket / Socket.IO ----------

function conectarSocket() {
  socket = io(CHAT_URL, {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('Conectado ao chat-service via WebSocket');
  });



  socket.on('private_message', (msg) => {
    adicionarMensagemNaTela(msg);
  });

  socket.on('disconnect', () => {
    console.log('Desconectado do chat-service');
  });
}



// ---------- Chat ----------

async function abrirConversaCom(username) {
  currentChatWith = username;
  chatWithSpan.textContent = username;
  messagesDiv.innerHTML = '';

  // Carregar histórico
  try {
    const res = await fetch(`${CHAT_URL}/messages/${username}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const msgs = await res.json();
    msgs.forEach((m) => adicionarMensagemNaTela(m));
  } catch (err) {
    console.error('Erro ao buscar histórico de mensagens', err);
  }
}

btnSend.addEventListener('click', () => {
  enviarMensagem();
});

messageInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') enviarMensagem();
});

function enviarMensagem() {
  const content = messageInput.value.trim();
  if (!content || !currentChatWith || !socket) return;

  socket.emit('private_message', {
    to: currentChatWith,
    content
  });

  messageInput.value = '';
}

function adicionarMensagemNaTela(msg) {
  // Só mostra mensagens da conversa atual
  if (
    msg.from_user !== currentChatWith &&
    msg.to_user !== currentChatWith &&
    msg.from_user !== currentUser
  ) {
    return;
  }

  const div = document.createElement('div');
  div.classList.add('message');

  if (msg.from_user === currentUser) {
    div.classList.add('me');
    div.textContent = `Você: ${msg.content}`;
  } else {
    div.textContent = `${msg.from_user}: ${msg.content}`;
  }

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}*/


// frontend/app.js

const AUTH_URL = 'http://localhost:4000';
const CHAT_URL = window.location.origin; // importante para multi-instâncias!

let token = null;
let currentUser = null;
let socket = null;
let currentChatWith = null;

// auto-refresh da lista de usuários
let usersRefreshInterval = null;
let isFetchingUsers = false;

// DOM elements
const loginView = document.getElementById('login-view');
const chatView = document.getElementById('chat-view');

const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');

const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');
const btnRegister = document.getElementById('btn-register');

const loginError = document.getElementById('login-error');

const currentUserSpan = document.getElementById('current-user');
const usersOnlineUl = document.getElementById('users-online'); // pode ficar vazio se você não emite users_online no server
const usersAllUl = document.getElementById('users-all');

const chatWithSpan = document.getElementById('chat-with');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const btnSend = document.getElementById('btn-send');

// ---------- Login & Registro ----------

btnRegister.addEventListener('click', async () => {
  const username = registerUsername.value.trim();
  const password = registerPassword.value.trim();

  if (!username || !password) {
    loginError.textContent = 'Preencha usuário e senha para cadastro.';
    return;
  }

  try {
    const res = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error || 'Erro ao cadastrar';
      return;
    }

    loginError.textContent = 'Usuário cadastrado! Faça login.';
  } catch (err) {
    loginError.textContent = 'Erro de conexão com servidor.';
  }
});

btnLogin.addEventListener('click', async () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    loginError.textContent = 'Preencha usuário e senha.';
    return;
  }

  try {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error || 'Erro ao fazer login';
      return;
    }

    token = data.token;
    currentUser = data.user.username;
    currentUserSpan.textContent = currentUser;

    loginView.style.display = 'none';
    chatView.style.display = 'flex';

    await carregarUsuarios();        // primeira carga
    startUsersAutoRefresh(5000);     // atualiza a lista automaticamente
    conectarSocket();
  } catch (err) {
    loginError.textContent = 'Erro de conexão com servidor.';
  }
});

// ---------- Auto-refresh usuários ----------

function startUsersAutoRefresh(intervalMs = 5000) {
  if (usersRefreshInterval) clearInterval(usersRefreshInterval);

  usersRefreshInterval = setInterval(() => {
    if (token) carregarUsuarios();
  }, intervalMs);

  // opcional: quando a aba voltar ao foco, atualiza imediatamente
  window.addEventListener('focus', () => {
    if (token) carregarUsuarios();
  });
}

// ---------- Carregar usuários ----------

async function carregarUsuarios() {
  if (isFetchingUsers) return;
  isFetchingUsers = true;

  try {
    const res = await fetch(`${AUTH_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const users = await res.json();

    // Atualiza lista "Todos os usuários"
    usersAllUl.innerHTML = '';
    users
      .filter((u) => u.username !== currentUser)
      .forEach((u) => {
        const li = document.createElement('li');
        li.textContent = u.username;

        if (u.username === currentChatWith) {
          li.classList.add('active');
        }

        li.addEventListener('click', () => abrirConversaCom(u.username));
        usersAllUl.appendChild(li);
      });
  } catch (err) {
    console.error('Erro ao carregar usuários', err);
  } finally {
    isFetchingUsers = false;
  }
}

// ---------- WebSocket / Socket.IO ----------

function conectarSocket() {
  socket = io(CHAT_URL, {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('Conectado ao chat-service via WebSocket em', CHAT_URL);
  });

  // se você não estiver emitindo users_online no servidor, isso não vai disparar (pode manter sem problemas)
  socket.on('users_online', (users) => {
    atualizarUsuariosOnline(users);
  });

  socket.on('private_message', (msg) => {
    adicionarMensagemNaTela(msg);
  });

  socket.on('disconnect', () => {
    console.log('Desconectado do chat-service');
  });
}

function atualizarUsuariosOnline(users) {
  usersOnlineUl.innerHTML = '';
  users
    .filter((u) => u !== currentUser)
    .forEach((u) => {
      const li = document.createElement('li');
      li.textContent = u;
      li.addEventListener('click', () => abrirConversaCom(u));
      usersOnlineUl.appendChild(li);
    });
}

// ---------- Chat ----------

async function abrirConversaCom(username) {
  currentChatWith = username;
  chatWithSpan.textContent = username;
  messagesDiv.innerHTML = '';

  // Atualiza destaque na lista ao selecionar
  await carregarUsuarios();

  // Carregar histórico
  try {
    const res = await fetch(`${CHAT_URL}/messages/${username}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const msgs = await res.json();
    msgs.forEach((m) => adicionarMensagemNaTela(m));
  } catch (err) {
    console.error('Erro ao buscar histórico de mensagens', err);
  }
}

btnSend.addEventListener('click', () => {
  enviarMensagem();
});

messageInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') enviarMensagem();
});

function enviarMensagem() {
  const content = messageInput.value.trim();
  if (!content || !currentChatWith || !socket) return;

  socket.emit('private_message', {
    to: currentChatWith,
    content
  });

  messageInput.value = '';
}

function adicionarMensagemNaTela(msg) {
  // Só mostra mensagens da conversa atual
  const involvesCurrentChat =
    (msg.from_user === currentUser && msg.to_user === currentChatWith) ||
    (msg.from_user === currentChatWith && msg.to_user === currentUser);

  if (!involvesCurrentChat) return;

  const div = document.createElement('div');
  div.classList.add('message');

  if (msg.from_user === currentUser) {
    div.classList.add('me');
    div.textContent = `Você: ${msg.content}`;
  } else {
    div.textContent = `${msg.from_user}: ${msg.content}`;
  }

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
