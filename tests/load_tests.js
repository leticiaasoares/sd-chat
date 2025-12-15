const { io } = require('socket.io-client');

const CHAT_URL = 'http://localhost:4001';
const NUM_USERS = 10;

// Supondo que você já tenha 10 usuários criados e tokens para eles.
// Para o trabalho, você pode automatizar login com fetch + usar o token.

const tokens = [
  // tokens JWT de cada usuário, ou faça login via HTTP neste script
];

const sockets = [];

tokens.forEach((token, index) => {
  const socket = io(CHAT_URL, {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log(`Usuário ${index} conectado`);
    // Cada usuário manda msg para o próximo
    const toIndex = (index + 1) % tokens.length;
    const toUser = `user${toIndex + 1}`; // por ex., se criou user1..user10
    socket.emit('private_message', {
      to: toUser,
      content: `Olá de user${index + 1}`
    });
  });

  socket.on('private_message', (msg) => {
    console.log(`Usuário ${index} recebeu mensagem:`, msg);
  });

  sockets.push(socket);
});
