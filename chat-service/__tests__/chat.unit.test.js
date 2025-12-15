const request = require('supertest');
const jwt = require('jsonwebtoken');

const { app } = require('../server'); // seu server exporta { app, server, io }
const db = require('../db');

const JWT_SECRET = 'segredo_super_secreto_troque_isto';

beforeEach((done) => {
  db.run('DELETE FROM messages', done);
});

afterAll((done) => {
  db.close(done);
});

describe('Chat Service - Testes Unitários (Persistência)', () => {
  test('Deve persistir mensagens e recuperar histórico corretamente', async () => {
    // cria duas mensagens diretamente no banco para testar o endpoint
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO messages (from_user, to_user, content) VALUES (?, ?, ?)`,
        ['alice', 'bob', 'Oi Bob'],
        (err) => (err ? reject(err) : resolve())
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO messages (from_user, to_user, content) VALUES (?, ?, ?)`,
        ['bob', 'alice', 'Oi Alice'],
        (err) => (err ? reject(err) : resolve())
      );
    });

    const tokenAlice = jwt.sign({ id: 1, username: 'alice' }, JWT_SECRET);

    const res = await request(app)
      .get('/messages/bob')
      .set('Authorization', `Bearer ${tokenAlice}`)
      .expect(200);

    expect(res.body.length).toBe(2);
    expect(res.body[0].from_user).toBe('alice');
    expect(res.body[1].from_user).toBe('bob');
  });

  test('Endpoint /messages exige token', async () => {
    await request(app).get('/messages/bob').expect(401);
  });
});
