const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { io } = require('socket.io-client');

const AUTH_URL = 'http://localhost:4000';
const CHAT1 = 'http://localhost:4001';
const CHAT2 = 'http://localhost:4002';

async function register(username, password) {
  const res = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  // 201 ok, 409 já existe
  if (![201, 409].includes(res.status)) {
    throw new Error(`Falha ao registrar ${username}: ${res.status} ${await res.text()}`);
  }
}

async function login(username, password) {
  const res = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Falha login ${username}: ${JSON.stringify(data)}`);
  return data.token;
}

test('Integração: autenticar e trocar mensagem entre instâncias diferentes via Redis', async () => {
  // 1) garantir usuários
  await register('user1', '123');
  await register('user2', '123');

  // 2) login e tokens
  const token1 = await login('user1', '123');
  const token2 = await login('user2', '123');

  // 3) conectar sockets em instâncias DIFERENTES
  const s1 = io(CHAT1, { auth: { token: token1 }, transports: ['websocket'] });
  const s2 = io(CHAT2, { auth: { token: token2 }, transports: ['websocket'] });

  await new Promise((resolve) => s1.on('connect', resolve));
  await new Promise((resolve) => s2.on('connect', resolve));

  // 4) user2 aguarda mensagem
  const received = new Promise((resolve) => {
    s2.on('private_message', (msg) => resolve(msg));
  });

  // 5) user1 envia
  s1.emit('private_message', { to: 'user2', content: 'Olá do user1 via Redis!' });

  const msg = await received;

  expect(msg.from_user).toBe('user1');
  expect(msg.to_user).toBe('user2');
  expect(msg.content).toBe('Olá do user1 via Redis!');

  // 6) validar histórico via HTTP (qualquer instância serve)
  const histRes = await fetch(`${CHAT2}/messages/user1`, {
    headers: { Authorization: `Bearer ${token2}` }
  });
  const hist = await histRes.json();
  expect(Array.isArray(hist)).toBe(true);
  expect(hist.some(m => m.content === 'Olá do user1 via Redis!')).toBe(true);

  s1.disconnect();
  s2.disconnect();
}, 20000);
