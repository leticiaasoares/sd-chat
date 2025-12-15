const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { io } = require('socket.io-client');

const AUTH_URL = 'http://localhost:4000';
const CHAT_INSTANCES = [
  'http://localhost:4001',
  'http://localhost:4002',
  'http://localhost:4003',
];

const NUM_USERS = 10;
const PASSWORD = '123';

// round-robin para distribuir usuários entre instâncias
function pickInstance(i) {
  return CHAT_INSTANCES[i % CHAT_INSTANCES.length];
}

async function register(username) {
  const res = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD })
  });
  if (![201, 409].includes(res.status)) {
    throw new Error(`Erro register ${username}: ${res.status} ${await res.text()}`);
  }
}

async function login(username) {
  const res = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Erro login ${username}: ${JSON.stringify(data)}`);
  return data.token;
}

async function main() {
  console.log('== Preparando usuários ==');
  for (let i = 1; i <= NUM_USERS; i++) {
    await register(`u${i}`);
  }

  console.log('== Login e tokens ==');
  const users = [];
  for (let i = 1; i <= NUM_USERS; i++) {
    const username = `u${i}`;
    const token = await login(username);
    const instance = pickInstance(i);
    users.push({ username, token, instance });
  }

  console.log('Distribuição nas instâncias:');
  users.forEach(u => console.log(`- ${u.username} -> ${u.instance}`));

  console.log('== Conectando sockets ==');
  const sockets = [];
  const receivedCount = new Map(); // username -> qtd recebidas
  users.forEach(u => receivedCount.set(u.username, 0));

  for (const u of users) {
    const s = io(u.instance, {
      auth: { token: u.token },
      transports: ['websocket']
    });

    s.on('private_message', (msg) => {
      // conta recebimento por destinatário
      const to = u.username;
      if (msg.to_user === to) {
        receivedCount.set(to, receivedCount.get(to) + 1);
      }
    });

    await new Promise((resolve) => s.on('connect', resolve));
    sockets.push({ user: u, socket: s });
  }

  console.log('== Enviando mensagens simultâneas (carga) ==');
  // Cada usuário envia para o próximo: u1->u2, u2->u3 ... u10->u1
  const sendPromises = sockets.map(({ user, socket }, idx) => {
    const next = sockets[(idx + 1) % sockets.length].user.username;
    return new Promise((resolve) => {
      socket.emit('private_message', {
        to: next,
        content: `msg de ${user.username} para ${next}`
      });
      resolve();
    });
  });

  await Promise.all(sendPromises);

  // Espera propagação Redis + entrega
  await new Promise((r) => setTimeout(r, 3000));

  console.log('== Resultado ==');
  let totalReceived = 0;
  for (const [u, count] of receivedCount.entries()) {
    console.log(`${u} recebeu ${count} mensagens`);
    totalReceived += count;
  }

  console.log(`Total entregue: ${totalReceived} (esperado: ${NUM_USERS})`);

  // desconectar
  sockets.forEach(({ socket }) => socket.disconnect());

  if (totalReceived >= NUM_USERS) {
    console.log('✅ Teste de carga OK: mensagens entregues com múltiplas instâncias (escalabilidade horizontal comprovada)');
    process.exit(0);
  } else {
    console.log('❌ Teste de carga falhou: nem todas as mensagens chegaram');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
