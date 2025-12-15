// chat-service/server.js
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./db');

const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 4001;
const JWT_SECRET = 'segredo_super_secreto_troque_isto';

app.use(cors());
app.use(bodyParser.json());

// Servir o front-end estático
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Middleware para autenticar token em requisições HTTP
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token inválido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// API HTTP: obter histórico 1:1 com outro usuário
app.get('/messages/:withUser', authenticateToken, (req, res) => {
  const currentUser = req.user.username;
  const other = req.params.withUser;

  db.all(
    `
    SELECT * FROM messages
    WHERE (from_user = ? AND to_user = ?)
       OR (from_user = ? AND to_user = ?)
    ORDER BY timestamp ASC
    `,
    [currentUser, other, other, currentUser],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar mensagens' });
      res.json(rows);
    }
  );
});

// ---- WebSockets ----

// Autenticar o token enviado no handshake do Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Token não fornecido'));
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Token inválido'));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  const username = socket.user.username;
  console.log(`Usuário conectado: ${username} (socket ${socket.id})`);

  // Cada usuário entra numa "sala" com o próprio nome.
  // Assim, qualquer instância do servidor pode enviar mensagens para esse usuário.
  socket.join(username);

  // Recebe mensagem privada
  socket.on('private_message', (msg) => {
    const { to, content } = msg;
    if (!to || !content) return;

    // Persiste no banco
    db.run(
      `INSERT INTO messages (from_user, to_user, content) VALUES (?, ?, ?)`,
      [username, to, content],
      function (err) {
        if (err) {
          console.error('Erro ao salvar mensagem', err);
          return;
        }

        const messageObj = {
          id: this.lastID,
          from_user: username,
          to_user: to,
          content,
          timestamp: new Date().toISOString()
        };

        // Envia para todas as conexões do remetente (todas as abas / dispositivos)
        io.to(username).emit('private_message', messageObj);

        // Envia para todas as conexões do destinatário, em qualquer instância
        io.to(to).emit('private_message', messageObj);
      }
    );
  });

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${username} (socket ${socket.id})`);
    // Não precisamos mais gerenciar onlineUsers manualmente.
    // A presença poderia ser feita via Redis ou outro serviço, mas não é essencial
    // para o funcionamento do chat em tempo real entre instâncias.
  });
});

// ---- Configuração do Redis Adapter e inicialização do servidor ----
async function start() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    io.adapter(createAdapter(pubClient, subClient));

    server.listen(PORT, () => {
      console.log(`Chat service rodando na porta ${PORT} (Redis em ${redisUrl})`);
    });
  } catch (err) {
    console.error('Erro ao iniciar chat-service:', err);
    process.exit(1);
  }
}

start();

module.exports = { app, server, io };
