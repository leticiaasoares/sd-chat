const request = require('supertest');
const app = require('../server');
const db = require('../db');

beforeEach((done) => {
  db.run('DELETE FROM users', done);
});

afterAll((done) => {
  db.close(done);
});

describe('Auth Service - Testes Unitários', () => {
  test('Deve cadastrar um usuário', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'user1', password: '123' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.username).toBe('user1');
  });

  test('Não deve cadastrar usuário duplicado', async () => {
    await request(app)
      .post('/register')
      .send({ username: 'user1', password: '123' })
      .expect(201);

    const res = await request(app)
      .post('/register')
      .send({ username: 'user1', password: '999' });

    expect(res.statusCode).toBe(409);
  });

  test('Deve logar com credenciais corretas e retornar token JWT', async () => {
    await request(app)
      .post('/register')
      .send({ username: 'user1', password: '123' })
      .expect(201);

    const res = await request(app)
      .post('/login')
      .send({ username: 'user1', password: '123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('user1');
  });

  test('Não deve logar com senha inválida', async () => {
    await request(app)
      .post('/register')
      .send({ username: 'user1', password: '123' })
      .expect(201);

    const res = await request(app)
      .post('/login')
      .send({ username: 'user1', password: 'errada' });

    expect(res.statusCode).toBe(401);
  });

  test('GET /users exige token', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(401);
  });
});
