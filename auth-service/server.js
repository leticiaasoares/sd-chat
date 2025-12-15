// auth-service/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = 4000;
const JWT_SECRET = 'segredo_super_secreto_troque_isto';

app.use(cors());
app.use(bodyParser.json());

// Middleware para validar token JWT
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

// POST /register  → cadastro de novo usuário
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username e password são obrigatórios' });

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
      [username, hash],
      function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Usuário já existe' });
          }
          return res.status(500).json({ error: 'Erro ao criar usuário' });
        }
        return res.status(201).json({ id: this.lastID, username });
      }
    );
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /login → autenticação, devolve token JWT
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username e password são obrigatórios' });

  db.get(
    `SELECT * FROM users WHERE username = ?`,
    [username],
    async (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro de banco' });
      if (!row) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

      const match = await bcrypt.compare(password, row.password_hash);
      if (!match) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

      const userPayload = { id: row.id, username: row.username };
      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '8h' });

      return res.json({ token, user: userPayload });
    }
  );
});

// GET /users → lista usuários (precisa de token)
app.get('/users', authenticateToken, (req, res) => {
  db.all(`SELECT id, username, created_at FROM users`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar usuários' });
    return res.json(rows);
  });
});

/*app.listen(PORT, () => {
  console.log(`Auth service rodando na porta ${PORT}`);
});*/

// no final do auth-service/server.js

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Auth service rodando na porta ${PORT}`);
  });
}

module.exports = app;

